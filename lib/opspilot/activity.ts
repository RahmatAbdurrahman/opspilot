/**
 * Pure, deterministic normalisation of action_log entries.
 *
 * action_log is the authoritative audit source. Nothing here invents,
 * reconstructs or removes records. Outcome classification is fail-closed:
 * "success" requires a known action_type AND its exact known success status.
 *
 * Shared by /activity and the Overview Recent Activity card, and by the
 * Action Center for success statuses, approval mapping and details parsing.
 */

import type {
  ActionLog,
  ActivityCategory,
  ActivityDetails,
  ActivityOutcome,
  ActivityPageData,
  ActivityRow,
  OpsPilotDataset,
} from "./types";
import { daysElapsed, formatDateTimeJakarta, parseTimestamp, todayJakarta, type LocalDate } from "./dates";

// ─── Known action types ───────────────────────────────────────────────────────

/** Successful execution_status per action_type (case-insensitive). */
export const SUCCESS_STATUS: Record<string, string> = {
  gmail_draft_created:    "draft_created",
  gmail_draft_sent:       "sent",
  calendar_event_created: "created",
};

/** action_types that explicitly record a failed execution. */
const FAILURE_ACTION_TYPES = new Set(["gmail_send_failed"]);
/** Explicit failure execution_status values. */
const FAILURE_STATUSES = new Set(["failed", "failure", "error", "blocked"]);

const SUCCESS_LABEL: Record<string, string> = {
  gmail_draft_created:    "Created",
  gmail_draft_sent:       "Sent",
  calendar_event_created: "Created",
};

const ACTION_META: Record<string, { category: ActivityCategory; label: string }> = {
  gmail_draft_created:    { category: "Draft",    label: "Gmail draft created" },
  gmail_draft_sent:       { category: "Email",    label: "Email sent" },
  gmail_send_failed:      { category: "Email",    label: "Email send failed" },
  calendar_event_created: { category: "Calendar", label: "Calendar event created" },
  invoice_followup:       { category: "System",   label: "Invoice follow-up recommended" },
  customer_followup:      { category: "System",   label: "Customer follow-up recommended" },
};

// ─── Human approval ───────────────────────────────────────────────────────────

/**
 * user_decision values that record a human approval in IBM Bob.
 * Single source of truth for the Activity page and Action Center receipts.
 */
const HUMAN_APPROVALS: Record<string, { label: string; receiptLabel: string }> = {
  approved:                     { label: "Approved",              receiptLabel: "Confirmed" },
  explicit_send_command:        { label: "Explicit SEND command", receiptLabel: "Confirmed — explicit SEND command" },
  human_approved_mcp_execution: { label: "Confirmed via IBM Bob", receiptLabel: "Confirmed — approved in IBM Bob" },
};

export function describeDecision(userDecision: string | null | undefined): {
  label:             string;
  receiptLabel:      string;
  approvalConfirmed: boolean;
} {
  const key = (userDecision ?? "").trim().toLowerCase();
  const approval = HUMAN_APPROVALS[key];
  if (approval) {
    return { label: approval.label, receiptLabel: approval.receiptLabel, approvalConfirmed: true };
  }
  const label = !key ? "Not recorded" : key === "pending" ? "Pending" : humanize(key);
  return { label, receiptLabel: "Not recorded in the Action Log", approvalConfirmed: false };
}

// ─── Small helpers ────────────────────────────────────────────────────────────

/** "some_value" → "Some value". Neutral fallback for unrecognised values only. */
function humanize(raw: string): string {
  const s = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function trimmed(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** Safely parse details_json. Returns an empty object on any failure. */
export function parseDetails(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function detailString(details: Record<string, unknown>, key: string): string | null {
  const v = details[key];
  return typeof v === "string" && v.trim() ? v : null;
}

/** Short error note from details.composio_response.data.message, when present. */
function errorNote(details: Record<string, unknown>): string | null {
  const resp = details["composio_response"];
  if (typeof resp !== "object" || resp === null) return null;
  const data = (resp as Record<string, unknown>)["data"];
  if (typeof data !== "object" || data === null) return null;
  const msg = (data as Record<string, unknown>)["message"];
  return typeof msg === "string" && msg.trim() ? truncate(msg.trim(), 160) : null;
}

// ─── Classification ───────────────────────────────────────────────────────────

export function classifyOutcome(actionType: string, executionStatus: string): ActivityOutcome {
  const status = executionStatus.trim().toLowerCase();
  if (FAILURE_ACTION_TYPES.has(actionType)) return "issue";
  if (SUCCESS_STATUS[actionType] === status) return "success";
  if (FAILURE_STATUSES.has(status)) return "issue";
  if (status === "pending") return "pending";
  return "unknown";
}

function statusLabel(actionType: string, outcome: ActivityOutcome, rawStatus: string): string {
  const raw = rawStatus.trim();
  switch (outcome) {
    case "success": return SUCCESS_LABEL[actionType] ?? "Success";
    case "pending": return "Pending";
    case "issue":   return !raw || raw.toLowerCase() === "failed" ? "Failed" : humanize(raw);
    default:        return raw ? humanize(raw) : "Not recorded";
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

const INCOMPLETE_ENTITY_WARNING = "Legacy activity record has incomplete entity metadata.";

function normalizeEntry(entry: ActionLog, index: number, today: LocalDate): ActivityRow {
  const actionType      = trimmed(entry.action_type);
  const entityId        = trimmed(entry.entity_id);
  const executionStatus = trimmed(entry.execution_status);
  const parsed          = parseTimestamp(entry.timestamp);
  const meta            = ACTION_META[actionType];
  const outcome         = classifyOutcome(actionType, executionStatus);
  const decision        = describeDecision(entry.user_decision);
  const details         = parseDetails(entry.details_json);
  const recipient       = trimmed(entry.recipient) || null;
  const messageId       = trimmed(entry.message_id) || null;
  const category: ActivityCategory = meta?.category ?? "System";

  const parsedDetails: ActivityDetails = {
    subject:         detailString(details, "subject"),
    eventTitle:      detailString(details, "calendar_title") ?? detailString(details, "title"),
    // Calendar event IDs live in details.event_id or, for some workflows, message_id.
    eventId:         category === "Calendar" ? detailString(details, "event_id") ?? messageId : null,
    scheduleMode:    detailString(details, "schedule_mode"),
    eventDate:       detailString(details, "date"),
    requiredCommand: detailString(details, "required_command"),
    errorNote:       errorNote(details),
  };

  const warnings: string[] = [];
  if (!entityId) warnings.push(INCOMPLETE_ENTITY_WARNING);
  if (!parsed) warnings.push("Timestamp could not be read, so ordering for this record is not reliable.");
  if (SUCCESS_STATUS[actionType] && outcome === "unknown") {
    warnings.push("Execution status is not recognized; it is not counted as executed.");
  }

  const recommendation = trimmed(entry.recommendation) || null;

  return {
    id:                  `${entry.timestamp}|${actionType}|${entityId}|${index}`,
    timestamp:           entry.timestamp,
    timestampMs:         parsed ? parsed.getTime() : null,
    timestampIso:        parsed ? parsed.toISOString() : null,
    localizedTimestamp:  parsed ? formatDateTimeJakarta(entry.timestamp) : "Unknown time",
    daysAgo:             parsed ? daysElapsed(parsed.toISOString(), today) : null,
    actionType,
    entityId,
    entityLabel:         entityId || "Unknown entity",
    actionCategory:      category,
    humanReadableAction: meta?.label ?? (humanize(actionType) || "Unrecognized activity"),
    userDecision:        trimmed(entry.user_decision),
    decisionLabel:       decision.label,
    approvalConfirmed:   decision.approvalConfirmed,
    executionStatus,
    statusLabel:         statusLabel(actionType, outcome, executionStatus),
    outcome,
    recipient,
    messageId,
    draftId:             trimmed(entry.draft_id) || null,
    recommendation,
    parsedDetails,
    summary:
      parsedDetails.errorNote ?? parsedDetails.subject ?? parsedDetails.eventTitle ?? recipient ?? recommendation,
    integrityWarning:    warnings.length ? warnings.join(" ") : null,
  };
}

/**
 * Normalise every action_log entry, newest first by parsed timestamp.
 * Source array order is never trusted; unparseable timestamps sort last.
 * Ties keep the later source row first.
 */
export function normalizeActivityLog(
  log: ActionLog[],
  today: LocalDate = todayJakarta(),
): ActivityRow[] {
  return log
    .map((entry, i) => ({ row: normalizeEntry(entry, i, today), i }))
    .sort((a, b) => {
      const am = a.row.timestampMs;
      const bm = b.row.timestampMs;
      if (am === null && bm === null) return b.i - a.i;
      if (am === null) return 1;
      if (bm === null) return -1;
      return bm - am || b.i - a.i;
    })
    .map((x) => x.row);
}

export function deriveActivityPageData(dataset: OpsPilotDataset): ActivityPageData {
  const rows = normalizeActivityLog(dataset.action_log);
  return {
    rows,
    totalCount:       rows.length,
    draftsCreated:    rows.filter((r) => r.actionType === "gmail_draft_created").length,
    externalExecuted: rows.filter(
      (r) =>
        (r.actionType === "gmail_draft_sent" || r.actionType === "calendar_event_created") &&
        r.outcome === "success",
    ).length,
    issueCount:       rows.filter((r) => r.outcome === "issue").length,
  };
}
