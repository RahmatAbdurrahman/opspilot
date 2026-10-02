// ─── Primitive domain types ───────────────────────────────────────────────────

export type CustomerStatus = "Active" | "Lead" | "Inactive" | "Churned";
export type InvoiceStatus = "Paid" | "Unpaid";
export type TaskStatus = "Open" | "Completed" | "Cancelled";
export type TaskPriority = "High" | "Medium" | "Low";
export type CustomerPriority = "High" | "Medium" | "Low";
export type PrepStatus = "Prepared" | "Not Prepared";
/** Values written to action_log.execution_status by the IBM Bob / MCP workflows. */
export type ExecutionStatus =
  | "Pending"
  | "draft_created"
  | "sent"
  | "created"
  | "failed"
  | string;
/** Values written to action_log.action_type by the IBM Bob / MCP workflows. */
export type ActionType =
  | "invoice_followup"
  | "customer_followup"
  | "gmail_draft_created"
  | "gmail_draft_sent"
  | "gmail_send_failed"
  | "calendar_event_created"
  | string;

// ─── Entity types ─────────────────────────────────────────────────────────────

export interface Customer {
  customer_id: string;
  customer_name: string;
  email: string;
  status: CustomerStatus;
  last_contact: string; // ISO date string
  opportunity_value: number;
  customer_priority: CustomerPriority;
}

export interface Invoice {
  invoice_id: string;
  customer_id: string;
  amount: number;
  due_date: string; // ISO date string
  status: InvoiceStatus;
  days_overdue: number;
}

export interface Task {
  task_id: string;
  customer_id: string;
  task: string;
  deadline: string; // ISO date string
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Meeting {
  meeting_id: string;
  customer_id: string;
  meeting: string;
  meeting_date: string; // ISO date string
  meeting_time: string;
  prep_status: PrepStatus;
}

export interface ActionLog {
  timestamp: string; // ISO datetime string
  action_type: ActionType;
  entity_id: string;
  recommendation: string;
  user_decision: string;
  execution_status: ExecutionStatus;
  draft_id: string;
  message_id: string;
  recipient: string;
  details_json: string;
}

// ─── Composite dataset ────────────────────────────────────────────────────────

export interface OpsPilotDataset {
  customers: Customer[];
  invoices: Invoice[];
  tasks: Task[];
  meetings: Meeting[];
  action_log: ActionLog[];
  scoring_config: Record<string, unknown>;
}

// ─── Derived / view types ─────────────────────────────────────────────────────

export type SeverityLevel = "critical" | "high" | "medium" | "low";
export type PriorityEntityType = "invoice" | "customer" | "task" | "meeting";

export interface PriorityItem {
  id: string;
  entityId: string;
  entityType: PriorityEntityType;
  customer: string;
  issue: string;
  monetaryExposure: number | null;
  severity: SeverityLevel;
  recommendedAction: string;
  href: string;
  /** Raw source entity for detail drawer */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawEntity: Record<string, any>;
}

export interface KpiData {
  revenueAtRisk: number;
  criticalItems: number;
  openTasks: number;
  openHighPriorityTasks: number;
  activeOpportunities: number;
}

export interface RevenueExposureItem {
  label: string;
  value: number;
}

export interface InvoiceStatusItem {
  name: string;
  value: number;
  color: string;
}

// ─── Tasks + Meetings page view types ────────────────────────────────────────

/** How a task deadline relates to today (Asia/Jakarta). */
export type TaskScheduleState =
  | "Overdue"
  | "Due today"
  | "Due tomorrow"
  | "Upcoming"
  | "No deadline";

/** How a meeting date relates to today (Asia/Jakarta). */
export type MeetingProximity =
  | "Past"
  | "Today"
  | "Tomorrow"
  | "Upcoming"
  | "Unknown";

export interface TaskRow {
  task_id:         string;
  task:            string;
  customerName:    string;
  deadlineFormatted: string;     // "Oct 2, 2026" or "—"
  scheduleState:   TaskScheduleState;
  daysOverdue:     number;       // positive = overdue, 0 = today/future, -N = N days away
  priority:        TaskPriority;
  status:          TaskStatus;
  contextNote:     string;       // deterministic narrative
}

export interface TaskPageSummary {
  rows:          TaskRow[];
  openCount:     number;
  overdueCount:  number;
}

export interface MeetingRow {
  meeting_id:      string;
  meeting:         string;
  customerName:    string;
  dateFormatted:   string;       // "Oct 2, 2026"
  timeLocal:       string;       // as stored (e.g. "09:00")
  prepStatus:      PrepStatus;
  proximity:       MeetingProximity;
  daysAway:        number | null; // null = unknown date
  contextNote:     string;       // deterministic narrative
}

export interface MeetingPageSummary {
  rows:              MeetingRow[];
  upcomingCount:     number;
  notPreparedCount:  number;
}

// ─── Customer page view types ─────────────────────────────────────────────────

export type CustomerOperationalState =
  | "Needs Follow-up"
  | "Active"
  | "Inactive Lead"
  | "Churned";

export interface CustomerRow {
  customer_id:      string;
  customer_name:    string;
  email:            string;
  status:           CustomerStatus;
  lastContactFormatted: string;   // "Sep 23, 2026"
  daysSinceContact: number;       // computed via Jakarta dates
  opportunityValue: number;
  priority:         CustomerPriority;
  operationalState: CustomerOperationalState;
  // Related stats (joined)
  totalInvoices:    number;
  unpaidInvoices:   number;
  overdueAmount:    number;
  openTasks:        number;
  unpreparedMeetings: number;
}

export interface CustomerPageData {
  rows:               CustomerRow[];
  totalCustomers:     number;
  activeCustomers:    number;
  activeLeads:        number;
  leadOpportunityValue: number;
}

// ─── Invoice page view types ──────────────────────────────────────────────────

export type InvoicePaymentState = "Paid" | "Current" | "Overdue";

export interface InvoiceRow {
  invoice_id:       string;
  customer_id:      string;
  customerName:     string;
  customerEmail:    string;
  customerPriority: CustomerPriority;
  amount:           number;
  dueDateFormatted: string;       // "Sep 25, 2026"
  status:           InvoiceStatus;
  paymentState:     InvoicePaymentState;
  daysOverdue:      number;       // computed via Jakarta dates (0 if not overdue)
}

export interface InvoicePageData {
  rows:          InvoiceRow[];
  totalInvoices: number;
  unpaidAmount:  number;
  overdueAmount: number;
  overdueCount:  number;
}

// ─── Action Center view types ─────────────────────────────────────────────────

/**
 * Which phase of the action lifecycle this item is in.
 *
 * recommended  — OpsPilot has surfaced an actionable item, nothing executed yet.
 * prepared     — A Gmail draft exists; awaiting human send approval in IBM Bob.
 * executed     — The action_log contains confirmed execution evidence.
 */
export type ActionLifecycleState = "recommended" | "prepared" | "executed";

/**
 * Broad category of the action, used by the secondary filter.
 *
 * email    — Invoice payment follow-up via Gmail draft → send
 * calendar — Task / meeting reminder via Google Calendar event
 * followup — Lead customer follow-up
 */
export type ActionCategory = "email" | "calendar" | "followup";

/** The four OpsPilot workflows surfaced in the Action Center. */
export type ActionCenterActionType =
  | "invoice_payment_followup"
  | "customer_followup"
  | "task_calendar_reminder"
  | "meeting_prep_reminder";

/** External channel the consequential action runs through in IBM Bob. */
export type ActionExecutionType = "Email" | "Calendar";

/** Proof of execution, built only from a confirmed action_log entry. */
export interface ActionExecutionReceipt {
  /** Raw action_log.execution_status, e.g. "sent" / "created" */
  status:           string;
  executedAt:       string;
  /** "Oct 1, 2026 · 19:21" (Asia/Jakarta) */
  executedAtFormatted: string;
  /** True only when action_log.user_decision records a human approval */
  approvalConfirmed: boolean;
  /** Human-readable approval evidence, e.g. "Confirmed — explicit SEND command" */
  approvalLabel:    string;
  /** Shortened Gmail message ID or Calendar event ID */
  referenceId:      string | null;
  recipient:        string | null;
}

/** The latest unsent Gmail draft, built only from a gmail_draft_created entry. */
export interface ActionDraftInfo {
  createdAt:          string;
  createdAtFormatted: string;
  subject:            string | null;
  recipient:          string | null;
}

export interface ActionCenterItem {
  /** Stable key for React — entityId + actionType */
  id:              string;
  entityId:        string;
  entityType:      PriorityEntityType;
  customerId:      string;
  customerName:    string;
  actionType:      ActionCenterActionType;
  /** Short label, e.g. "Payment follow-up" */
  actionLabel:     string;
  actionCategory:  ActionCategory;
  /** One-sentence recommendation, e.g. "Send a payment follow-up for INV-014." */
  recommendation:  string;
  /** Short operational context, e.g. "7 days overdue · Rp8 jt" */
  context:         string;
  lifecycleState:  ActionLifecycleState;
  executionType:   ActionExecutionType;
  /** Human-readable execution status, e.g. "Email sent" */
  executionStatus: string;

  // ── IBM Bob commands ───────────────────────────────────────────────────────
  /** Paste into IBM Bob for context / analysis */
  suggestedCommand: string;
  /** Paste into IBM Bob to request consequential execution (requires approval) */
  executionCommand: string | null;

  // ── Timestamp ──────────────────────────────────────────────────────────────
  /** Epoch ms of the most recent action_log entry for this entity (for sorting) */
  lastActivityAt:        number | null;
  /** "Oct 1, 2026 · 19:22" (Asia/Jakarta), or "—" */
  lastActivityFormatted: string;

  receipt: ActionExecutionReceipt | null;   // only when executed
  draft:   ActionDraftInfo | null;          // only when prepared
}

export interface ActionCenterSummary {
  items: ActionCenterItem[];
  recommendedCount: number;
  preparedCount:    number;
  executedCount:    number;
  /**
   * Items that have a concrete execution command ready to run in IBM Bob
   * (prepared SEND or recommended CREATE). Cross-cuts lifecycle states —
   * never includes executed items.
   */
  approvalRequiredCount: number;
}

// ─── Activity / audit log view types ─────────────────────────────────────────

export type ActivityCategory = "Draft" | "Email" | "Calendar" | "System";

/**
 * Fail-closed classification of an action_log entry's outcome.
 *
 * success — known action_type with its exact known success status
 * pending — explicit "pending" status
 * issue   — known failure action_type or explicit failure status
 * unknown — anything else; never treated as success or failure
 */
export type ActivityOutcome = "success" | "pending" | "issue" | "unknown";

/** Whitelisted, display-safe fields extracted from details_json. Never the raw blob. */
export interface ActivityDetails {
  subject:         string | null;
  eventTitle:      string | null;
  eventId:         string | null;
  scheduleMode:    string | null;
  eventDate:       string | null;
  requiredCommand: string | null;
  errorNote:       string | null;
}

export interface ActivityRow {
  /** Stable key — timestamp + type + entity + source index */
  id:                   string;
  timestamp:            string;
  timestampMs:          number | null;
  /** UTC ISO instant of the parsed timestamp, or null when unparseable */
  timestampIso:         string | null;
  /** "Oct 1, 2026 · 19:21" (Asia/Jakarta) or "Unknown time" */
  localizedTimestamp:   string;
  /** Calendar days before today in Asia/Jakarta (0 = today); null when unparseable */
  daysAgo:              number | null;
  actionType:           string;
  entityId:             string;
  /** entityId, or "Unknown entity" when the log entry has none */
  entityLabel:          string;
  actionCategory:       ActivityCategory;
  humanReadableAction:  string;
  userDecision:         string;
  decisionLabel:        string;
  /** True only when user_decision records a human approval */
  approvalConfirmed:    boolean;
  executionStatus:      string;
  statusLabel:          string;
  outcome:              ActivityOutcome;
  recipient:            string | null;
  messageId:            string | null;
  draftId:              string | null;
  recommendation:       string | null;
  parsedDetails:        ActivityDetails;
  /** One-line summary for the table's Details column */
  summary:              string | null;
  integrityWarning:     string | null;
}

export interface ActivityPageData {
  rows:             ActivityRow[];
  totalCount:       number;
  draftsCreated:    number;
  externalExecuted: number;
  issueCount:       number;
}
