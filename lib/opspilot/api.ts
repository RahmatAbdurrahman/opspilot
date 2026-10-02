/**
 * Server-only data access module.
 *
 * Fetches the OpsPilot dataset from the Google Apps Script endpoint
 * configured via OPSPILOT_DATA_URL in .env.local.
 *
 * NEVER import this file in client components.
 * All fetching must happen in Server Components or Server Actions.
 *
 * Reliability model (all server-side, GET only):
 *
 *   Request-time rendering   `connection()` keeps every data page out of
 *                            prerendering, so `next build` never needs the
 *                            endpoint.
 *   Deduplication            `cache()` shares one fetch per render pass.
 *   Short cache              Next.js Data Cache, `revalidate` below, tagged so
 *                            the Refresh control can expire it immediately.
 *                            Only HTTP 200 responses are stored (Next.js rule).
 *   Bounded retry            Max 2 attempts. Timeout / connection error / 5xx /
 *                            408 / 429 are retried; schema, JSON and other 4xx
 *                            errors are not.
 *   Fail closed              If both attempts fail, callers get an
 *                            OpsPilotFetchError — never fake or empty data.
 *
 * Known limitation: a malformed HTTP 200 response (e.g. an HTML error page from
 * Apps Script) is stored by the Data Cache like any 200, so it may stay cached
 * for up to the revalidation window above. The Retry / Refresh control expires
 * the cache tag immediately and recovers the page.
 *
 * Technical detail goes to the server log only. Log lines never include the
 * endpoint URL, response bodies or credentials.
 */

import { cache } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import type { Meeting, OpsPilotDataset } from "./types";

// ─── Tunables ─────────────────────────────────────────────────────────────────

/** Seconds a fetched dataset is reused before the next request revalidates it. */
export const OPSPILOT_REVALIDATE_SECONDS = 20;
/** Cache tag for the Data Cache entry; used by the Refresh control. */
export const OPSPILOT_CACHE_TAG = "opspilot-data";

/** Upper bound for one attempt (Apps Script normally answers in ~4 s; measured 4–10 s; worst case 2 attempts ≈ 24 s). */
const REQUEST_TIMEOUT_MS = 12_000;
/** Total attempts: 1 initial + 1 retry (keeps the worst-case wait demo-friendly). */
const MAX_ATTEMPTS = 2;
/** Pause before attempt 2. */
const RETRY_DELAYS_MS = [300];

// ─── Error type ───────────────────────────────────────────────────────────────

export class OpsPilotFetchError extends Error {
  /** True only for transient failures that are safe to retry. */
  public readonly retryable: boolean;
  public readonly cause?: unknown;

  constructor(message: string, options: { cause?: unknown; retryable?: boolean } = {}) {
    super(message);
    this.name = "OpsPilotFetchError";
    this.cause = options.cause;
    this.retryable = options.retryable ?? false;
  }
}

/**
 * Convert a caught error into a log-safe message for the friendly error card.
 * Re-throws Next.js framework control-flow errors (dynamic rendering, redirects,
 * notFound) so a catch block can never swallow them.
 */
export function fetchErrorMessage(err: unknown): string {
  unstable_rethrow(err);
  return err instanceof OpsPilotFetchError
    ? err.message
    : "An unexpected error occurred while loading operational data.";
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * The Apps Script sheet stores meetings as { title, datetime: "YYYY-MM-DD HH:mm" }.
 * Normalise to the Meeting shape the dashboard uses ({ meeting, meeting_date, meeting_time }),
 * while still accepting rows that already use the normalised field names.
 */
function normalizeMeeting(raw: unknown): Meeting {
  const m = isObject(raw) ? raw : {};
  const datetime = str(m["datetime"]).trim();
  const [datePart = "", timePart = ""] = datetime.split(" ");

  return {
    meeting_id:   str(m["meeting_id"]),
    customer_id:  str(m["customer_id"]),
    meeting:      str(m["meeting"]) || str(m["title"]) || str(m["meeting_id"]),
    meeting_date: str(m["meeting_date"]) || datePart,
    meeting_time: str(m["meeting_time"]) || timePart,
    prep_status:  m["prep_status"] as Meeting["prep_status"],
  };
}

function validateDataset(raw: unknown): OpsPilotDataset {
  if (!isObject(raw)) {
    throw new OpsPilotFetchError("OpsPilot response was not a JSON object.");
  }

  const required: Array<keyof OpsPilotDataset> = [
    "customers",
    "invoices",
    "tasks",
    "meetings",
    "action_log",
  ];

  for (const key of required) {
    if (!Array.isArray(raw[key])) {
      throw new OpsPilotFetchError(
        `OpsPilot response missing required array field: "${key}".`,
      );
    }
  }

  return {
    customers:      raw["customers"]   as OpsPilotDataset["customers"],
    invoices:       raw["invoices"]    as OpsPilotDataset["invoices"],
    tasks:          raw["tasks"]       as OpsPilotDataset["tasks"],
    meetings:       (raw["meetings"] as unknown[]).map(normalizeMeeting),
    action_log:     raw["action_log"]  as OpsPilotDataset["action_log"],
    scoring_config: isObject(raw["scoring_config"])
      ? (raw["scoring_config"] as Record<string, unknown>)
      : {},
  };
}

// ─── Single attempt ───────────────────────────────────────────────────────────

function isTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

/** 5xx plus the two transient 4xx codes (request timeout, rate limit). */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * One GET attempt. Throws OpsPilotFetchError with `retryable` set according to
 * whether a second attempt could plausibly succeed.
 */
async function requestDataset(url: string): Promise<OpsPilotDataset> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next:    { revalidate: OPSPILOT_REVALIDATE_SECONDS, tags: [OPSPILOT_CACHE_TAG] },
    });
  } catch (err) {
    throw new OpsPilotFetchError(
      isTimeout(err)
        ? "OpsPilot data endpoint timed out."
        : "Network error reaching the OpsPilot data endpoint.",
      { cause: err, retryable: true },
    );
  }

  if (!response.ok) {
    throw new OpsPilotFetchError(
      `OpsPilot endpoint returned HTTP ${response.status}.`,
      { retryable: isRetryableStatus(response.status) },
    );
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    // A timeout while reading the body is transient; unparseable JSON is not.
    throw new OpsPilotFetchError(
      isTimeout(err)
        ? "OpsPilot data endpoint timed out."
        : "OpsPilot endpoint returned invalid JSON.",
      { cause: err, retryable: isTimeout(err) },
    );
  }

  return validateDataset(raw);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public fetch function ────────────────────────────────────────────────────

/**
 * Fetch the live OpsPilot dataset (deduplicated per render, cached for a short
 * window, retried on transient failures).
 *
 * Throws `OpsPilotFetchError` on any failure — never returns stale/fake data
 * beyond the short cache window.
 */
export const fetchOpsPilotData = cache(async (): Promise<OpsPilotDataset> => {
  // Request-time rendering only. Must stay OUTSIDE any try/catch: during a
  // prerender attempt it throws a framework signal that has to propagate.
  await connection();

  const url = process.env.OPSPILOT_DATA_URL;
  if (!url || url.includes("YOUR_DEPLOYMENT_ID")) {
    throw new OpsPilotFetchError("OPSPILOT_DATA_URL is not configured.");
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await requestDataset(url);
    } catch (err) {
      if (!(err instanceof OpsPilotFetchError)) throw err;

      const willRetry = err.retryable && attempt < MAX_ATTEMPTS;
      console.warn(
        `[OpsPilot] data fetch attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}` +
          (willRetry ? ` Retrying in ${RETRY_DELAYS_MS[attempt - 1]}ms.` : " Not retrying."),
      );
      if (!willRetry) throw err;

      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
  }
});
