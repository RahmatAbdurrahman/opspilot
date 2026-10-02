/**
 * Business-date helpers for the Asia/Jakarta timezone.
 *
 * All dashboard calculations involving overdue days, inactivity,
 * or upcoming events must use these helpers — never raw Date.now(),
 * never UTC date extraction.
 *
 * Pure functions. No side effects. No I/O. Unit-testable.
 */

const JAKARTA_TZ = "Asia/Jakarta";

// ─── Local date parts ─────────────────────────────────────────────────────────

export interface LocalDate {
  year:  number;
  month: number; // 1-based
  day:   number;
}

/**
 * Return the current calendar date in Asia/Jakarta as { year, month, day }.
 * Uses Intl.DateTimeFormat to extract the correct local date regardless
 * of the server/client system timezone.
 */
export function todayJakarta(): LocalDate {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).formatToParts(now);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * Convert a LocalDate to a plain numeric day-index for arithmetic.
 * Uses the proleptic Gregorian calendar.
 */
function toDayIndex({ year, month, day }: LocalDate): number {
  // Shift months so March = 1 to simplify leap-year handling
  const m = ((month - 3 + 12) % 12);
  const y = year - Math.floor((3 - month) / 12);
  return (
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) +
    Math.floor((153 * m + 2) / 5) +
    day
  );
}

/**
 * Normalize any date-like string to a business calendar date in Asia/Jakarta.
 *
 * TWO INPUT FORMS are supported:
 *
 *   Plain date:   "2026-10-02"
 *     → treated directly as the Jakarta business date (no timezone conversion).
 *       Google Sheets may store dates in this form when there is no time component.
 *
 *   ISO instant:  "2026-10-01T17:00:00.000Z"  (contains "T" or "Z" or "+")
 *     → parsed as a UTC instant, then converted to Asia/Jakarta via
 *       Intl.DateTimeFormat so the correct local calendar date is extracted.
 *       "2026-10-01T17:00:00.000Z" → Jakarta UTC+7 → "2026-10-02 00:00" → 2026-10-02.
 *
 * Returns null if the input is missing, empty, or unparseable.
 */
export function parseLocalDate(isoString: string | null | undefined): LocalDate | null {
  if (!isoString || typeof isoString !== "string") return null;

  const trimmed = isoString.trim();
  if (!trimmed) return null;

  // Detect whether this is a plain date ("YYYY-MM-DD") or a timezone-aware instant.
  // A plain date contains no "T", "Z", or UTC-offset "+" after the date part.
  const isInstant = trimmed.includes("T") || trimmed.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(trimmed);

  if (isInstant) {
    // Parse as an instant and extract the Asia/Jakarta calendar date.
    // We must NOT use UTC getters here.
    let instant: Date;
    try {
      instant = new Date(trimmed);
      if (isNaN(instant.getTime())) return null;
    } catch {
      return null;
    }
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: JAKARTA_TZ,
      year:     "numeric",
      month:    "2-digit",
      day:      "2-digit",
    }).formatToParts(instant);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");
    const year = get("year"), month = get("month"), day = get("day");
    if (!year || !month || !day) return null;
    return { year, month, day };
  }

  // Plain date — treat directly as the Jakarta business calendar date.
  const s = trimmed.slice(0, 10); // "YYYY-MM-DD"
  if (s.length < 10 || !s.includes("-")) return null;
  const [year, month, day] = s.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/**
 * Compute how many calendar days a date is in the past relative to today
 * (Asia/Jakarta).
 *
 * Returns a positive number if the date is in the past,
 * 0 if it is today, and a negative number if it is in the future.
 * Returns null if the date string is missing or unparseable.
 *
 * daysElapsed("2026-09-25") on 2026-10-02 → 7
 * daysElapsed("2026-09-27") on 2026-10-02 → 5
 * daysElapsed("2026-10-02") on 2026-10-02 → 0
 * daysElapsed("2026-10-05") on 2026-10-02 → -3
 */
export function daysElapsed(
  isoDateString: string | null | undefined,
  today = todayJakarta(),
): number | null {
  const target = parseLocalDate(isoDateString);
  if (!target) return null;
  return toDayIndex(today) - toDayIndex(target);
}

/**
 * Calendar days overdue for an unpaid invoice.
 * Returns 0 if due today or in the future, null if date is missing.
 */
export function computeDaysOverdue(
  dueDateIso: string | null | undefined,
  today = todayJakarta(),
): number | null {
  const elapsed = daysElapsed(dueDateIso, today);
  if (elapsed === null) return null;
  return Math.max(0, elapsed);
}

/**
 * Calendar days since a contact date.
 * Returns 9999 if the date string is missing/empty.
 */
export function computeDaysSinceContact(
  lastContactIso: string | undefined | null,
  today = todayJakarta(),
): number {
  if (!lastContactIso) return 9999;
  const elapsed = daysElapsed(lastContactIso, today);
  if (elapsed === null) return 9999;
  return Math.max(0, elapsed);
}

/**
 * Calendar days until a future date.
 * Returns 0 if the date is today, negative if already past.
 * Returns null if the date string is missing or unparseable.
 */
export function daysUntil(
  isoDateString: string | null | undefined,
  today = todayJakarta(),
): number | null {
  const elapsed = daysElapsed(isoDateString, today);
  if (elapsed === null) return null;
  return -elapsed;
}

/**
 * Returns true if the given ISO date is today (Asia/Jakarta) or in the future.
 * Returns false if the date is missing or unparseable (treat as past/irrelevant).
 */
export function isTodayOrFuture(
  isoDateString: string | null | undefined,
  today = todayJakarta(),
): boolean {
  const elapsed = daysElapsed(isoDateString, today);
  if (elapsed === null) return false;
  return elapsed <= 0;
}

// ─── Timestamps (action_log) ──────────────────────────────────────────────────

/**
 * Parse an action_log timestamp into a Date instant.
 *
 * TWO INPUT FORMS are supported:
 *   Sheet form:  "2026-09-28 09:00"          → wall-clock time in Asia/Jakarta (UTC+7)
 *   ISO instant: "2026-10-01T12:21:57.000Z"  → parsed as-is
 *
 * Returns null if the input is missing or unparseable.
 */
export function parseTimestamp(ts: string | null | undefined): Date | null {
  if (!ts || typeof ts !== "string") return null;
  const trimmed = ts.trim();
  if (!trimmed) return null;

  const sheetForm = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed);
  const d = new Date(sheetForm ? `${trimmed.replace(" ", "T")}+07:00` : trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** Epoch milliseconds for sorting; null if the timestamp is unparseable. */
export function timestampMs(ts: string | null | undefined): number | null {
  return parseTimestamp(ts)?.getTime() ?? null;
}

/**
 * Format an action_log timestamp for display in Asia/Jakarta.
 * "2026-10-01T12:21:57.000Z" → "Oct 1, 2026 · 19:21"
 * Returns "—" if the timestamp is missing or unparseable.
 */
export function formatDateTimeJakarta(ts: string | null | undefined): string {
  const d = parseTimestamp(ts);
  if (!d) return "—";
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TZ,
    month:    "short",
    day:      "numeric",
    year:     "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone:  JAKARTA_TZ,
    hour:      "2-digit",
    minute:    "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${datePart} · ${timePart}`;
}
