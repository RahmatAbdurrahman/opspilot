/**
 * Pure, deterministic metric derivation functions.
 *
 * All business logic for the dashboard lives here — not in JSX.
 * No side effects. No I/O. Unit-testable.
 *
 * DATE RULE:
 *   All date calculations use Asia/Jakarta calendar dates via dates.ts.
 *   The dataset field `invoice.days_overdue` is IGNORED — we recompute
 *   live from `invoice.due_date` so the value reflects the actual current date.
 */

import type {
  OpsPilotDataset,
  Customer,
  Invoice,
  Task,
  KpiData,
  PriorityItem,
  SeverityLevel,
  RevenueExposureItem,
  InvoiceStatusItem,
  CustomerPageData,
  CustomerRow,
  CustomerOperationalState,
  InvoicePageData,
  InvoiceRow,
  InvoicePaymentState,
  TaskRow,
  TaskPageSummary,
  TaskScheduleState,
  MeetingRow,
  MeetingPageSummary,
  MeetingProximity,
  ActionLog,
  ActivityRow,
  ActionCenterItem,
  ActionCenterSummary,
  ActionLifecycleState,
  ActionExecutionReceipt,
  ActionDraftInfo,
} from "./types";

import {
  todayJakarta,
  computeDaysOverdue,
  computeDaysSinceContact,
  daysUntil,
  parseLocalDate,
  timestampMs,
  formatDateTimeJakarta,
  type LocalDate,
} from "./dates";

import { formatIDRCompact, shortenId } from "./format";
import { SUCCESS_STATUS, describeDecision, detailString, normalizeActivityLog, parseDetails } from "./activity";

// ─── Normalised invoice helpers ───────────────────────────────────────────────
//
// We always compute overdue days from due_date — never trust days_overdue.

function invoiceDaysOverdue(invoice: Invoice, today: LocalDate): number {
  if (invoice.status !== "Unpaid") return 0;
  // computeDaysOverdue returns null if due_date is missing — treat as 0 (not overdue)
  return computeDaysOverdue(invoice.due_date, today) ?? 0;
}

function isInvoiceOverdue(invoice: Invoice, today: LocalDate): boolean {
  return invoice.status === "Unpaid" && invoiceDaysOverdue(invoice, today) > 0;
}

function isInvoiceUnpaidCurrent(invoice: Invoice, today: LocalDate): boolean {
  return invoice.status === "Unpaid" && invoiceDaysOverdue(invoice, today) === 0;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function customerById(customers: Customer[], id: string): string {
  return customers.find((c) => c.customer_id === id)?.customer_name ?? id;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function deriveKpis(dataset: OpsPilotDataset): KpiData {
  const { customers, invoices, tasks, meetings } = dataset;
  const today = todayJakarta();

  // 1. Revenue at Risk — sum of unpaid overdue invoices (live-computed)
  const revenueAtRisk = invoices
    .filter((inv) => isInvoiceOverdue(inv, today))
    .reduce((sum, inv) => sum + inv.amount, 0);

  // 2. Attention Items — currently ACTIONABLE items only:
  //    overdue invoices + actionable open tasks + upcoming unprepared meetings.
  //    A task is actionable via isTaskReminderActionable (the same rule the
  //    Action Center uses); past meetings are never attention items.
  const overdueCount = invoices.filter((inv) => isInvoiceOverdue(inv, today)).length;
  const actionableTasks = tasks.filter((t) =>
    isTaskReminderActionable(t, daysUntil(t.deadline, today)),
  ).length;
  const unpreparedMeetings = meetings.filter(
    (m) =>
      m.prep_status === "Not Prepared" &&
      (daysUntil(m.meeting_date, today) ?? -1) >= 0,
  ).length;
  const criticalItems = overdueCount + actionableTasks + unpreparedMeetings;

  // 3. Open Tasks
  const openTasks = tasks.filter((t) => t.status === "Open").length;
  const openHighPriorityTasks = tasks.filter(
    (t) => t.status === "Open" && t.priority === "High",
  ).length;

  // 4. Active Opportunities — sum opportunity_value for Lead customers
  const activeOpportunities = customers
    .filter((c) => c.status === "Lead")
    .reduce((sum, c) => sum + c.opportunity_value, 0);

  return {
    revenueAtRisk,
    criticalItems,
    openTasks,
    openHighPriorityTasks,
    activeOpportunities,
  };
}

// ─── Severity rules ───────────────────────────────────────────────────────────
//
// INVOICE (days overdue, live-computed):
//   >= 5  → critical  (payment is materially late — direct revenue risk)
//   2–4   → high
//   1     → medium
//   0     → low  (not included in priority list unless explicitly included)
//
// CUSTOMER LEAD (days since last contact):
//   >= 30 days + High priority → high
//   >= 14 days + any priority  → high
//   7–13 days                  → medium
//
// TASK (open, high priority):
//   overdue (deadline past) + High → high
//   due today + High               → high
//   overdue + Medium               → medium
//   future + High                  → medium  (won't outrank overdue invoices)
//
// MEETING (not prepared, upcoming):
//   within 2 days  → high
//   within 7 days  → medium

function invoiceSeverity(daysOverdue: number): SeverityLevel {
  if (daysOverdue >= 5) return "critical";
  if (daysOverdue >= 2) return "high";
  if (daysOverdue >= 1) return "medium";
  return "low";
}

function customerLeadSeverity(daysSinceContact: number, priority: string): SeverityLevel {
  if (daysSinceContact >= 30 && priority === "High") return "high";
  if (daysSinceContact >= 14) return "high";
  return "medium";
}

function taskSeverityLive(task: Task, today: LocalDate): SeverityLevel {
  // null means missing deadline — treat as no urgency
  const daysUntilDeadline = daysUntil(task.deadline, today) ?? Infinity;
  const overdue = daysUntilDeadline < 0;
  const dueToday = daysUntilDeadline === 0;

  if (task.priority === "High" && (overdue || dueToday)) return "high";
  if (task.priority === "High") return "medium"; // future high-priority
  if (task.priority === "Medium" && overdue) return "medium";
  return "low";
}

function meetingSeverity(daysAway: number): SeverityLevel {
  if (daysAway <= 2) return "high";
  return "medium";
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

// ─── Priority derivation ──────────────────────────────────────────────────────

/**
 * Derive the full deterministic operational priority list.
 * Sorted by severity (critical → low). No limit applied — callers slice.
 *
 * All date comparisons use a single Asia/Jakarta snapshot for consistency.
 */
export function deriveAllPriorities(dataset: OpsPilotDataset): PriorityItem[] {
  const { customers, invoices, tasks, meetings } = dataset;
  const today = todayJakarta(); // single snapshot for entire derivation
  const items: PriorityItem[] = [];

  // --- Overdue unpaid invoices (live-computed days overdue) ---
  for (const inv of invoices) {
    if (!isInvoiceOverdue(inv, today)) continue;
    const days = invoiceDaysOverdue(inv, today);
    const severity = invoiceSeverity(days);
    items.push({
      id:                `inv-${inv.invoice_id}`,
      entityId:          inv.invoice_id,
      entityType:        "invoice",
      customer:          customerById(customers, inv.customer_id),
      issue:             `Invoice overdue by ${days} day${days === 1 ? "" : "s"}`,
      monetaryExposure:  inv.amount,
      severity,
      recommendedAction: "Review and send payment follow-up in IBM Bob",
      href:              "/invoices",
      rawEntity:         inv as unknown as Record<string, unknown>,
    });
  }

  // --- Inactive Lead customers with opportunity value ---
  for (const c of customers) {
    if (c.status !== "Lead" || c.opportunity_value <= 0) continue;
    const daysSince = computeDaysSinceContact(c.last_contact, today);
    if (daysSince < 7) continue;
    const severity = customerLeadSeverity(daysSince, c.customer_priority);
    items.push({
      id:                `cust-${c.customer_id}`,
      entityId:          c.customer_id,
      entityType:        "customer",
      customer:          c.customer_name,
      issue:             `No contact in ${daysSince === 9999 ? "unknown number of" : daysSince} days — active lead`,
      monetaryExposure:  c.opportunity_value,
      severity,
      recommendedAction: "Re-engage customer in IBM Bob",
      href:              "/customers",
      rawEntity:         c as unknown as Record<string, unknown>,
    });
  }

  // --- Open tasks (High and overdue Medium) ---
  for (const t of tasks) {
    if (t.status !== "Open") continue;
    if (t.priority !== "High" && t.priority !== "Medium") continue;
    const severity = taskSeverityLive(t, today);
    // Skip future Medium tasks — they have no operational urgency vs invoices
    if (severity === "low") continue;
    // daysUntil returns null when deadline is missing — show generic label
    const daysLeft = daysUntil(t.deadline, today);
    const issueLabel =
      daysLeft === null
        ? `${t.task} (deadline unknown)`
        : daysLeft < 0
        ? `${t.task} (overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"})`
        : daysLeft === 0
        ? `${t.task} (due today)`
        : `${t.task} (due in ${daysLeft} day${daysLeft === 1 ? "" : "s"})`;
    items.push({
      id:                `task-${t.task_id}`,
      entityId:          t.task_id,
      entityType:        "task",
      customer:          customerById(customers, t.customer_id),
      issue:             issueLabel,
      monetaryExposure:  null,
      severity,
      recommendedAction: "Complete or escalate via IBM Bob",
      href:              "/tasks",
      rawEntity:         t as unknown as Record<string, unknown>,
    });
  }

  // --- Upcoming unprepared meetings ---
  for (const m of meetings) {
    if (m.prep_status !== "Not Prepared") continue;
    const daysAway = daysUntil(m.meeting_date, today);
    // Skip if date is missing or in the past
    if (daysAway === null || daysAway < 0) continue;
    const severity = meetingSeverity(daysAway);
    const timeLabel =
      daysAway === 0
        ? "today"
        : daysAway === 1
        ? "tomorrow"
        : `in ${daysAway} days`;
    items.push({
      id:                `mtg-${m.meeting_id}`,
      entityId:          m.meeting_id,
      entityType:        "meeting",
      customer:          customerById(customers, m.customer_id),
      issue:             `Meeting "${m.meeting}" ${timeLabel} — not prepared`,
      monetaryExposure:  null,
      severity,
      recommendedAction: "Prepare meeting brief via IBM Bob",
      href:              "/tasks",
      rawEntity:         m as unknown as Record<string, unknown>,
    });
  }

  return items.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

/** Convenience: top N priorities (for Overview page) */
export function deriveTopPriorities(
  dataset: OpsPilotDataset,
  limit = 5,
): PriorityItem[] {
  return deriveAllPriorities(dataset).slice(0, limit);
}

// ─── Chart data ───────────────────────────────────────────────────────────────

export function deriveRevenueExposure(
  dataset: OpsPilotDataset,
): RevenueExposureItem[] {
  const { customers, invoices } = dataset;
  const today = todayJakarta();

  const overdueValue = invoices
    .filter((inv) => isInvoiceOverdue(inv, today))
    .reduce((s, i) => s + i.amount, 0);

  const currentUnpaidValue = invoices
    .filter((inv) => isInvoiceUnpaidCurrent(inv, today))
    .reduce((s, i) => s + i.amount, 0);

  const leadOpportunityValue = customers
    .filter((c) => c.status === "Lead")
    .reduce((s, c) => s + c.opportunity_value, 0);

  return [
    { label: "Overdue Unpaid", value: overdueValue },
    { label: "Unpaid Current", value: currentUnpaidValue },
    { label: "Lead Pipeline",  value: leadOpportunityValue },
  ];
}

export function deriveInvoiceStatus(
  dataset: OpsPilotDataset,
): InvoiceStatusItem[] {
  const { invoices } = dataset;
  const today = todayJakarta();

  const paid    = invoices.filter((i) => i.status === "Paid").length;
  const overdue = invoices.filter((i) => isInvoiceOverdue(i, today)).length;
  const current = invoices.filter((i) => isInvoiceUnpaidCurrent(i, today)).length;

  return [
    { name: "Paid",            value: paid,    color: "#10b981" },
    { name: "Overdue Unpaid",  value: overdue, color: "#ef4444" },
    { name: "Unpaid Current",  value: current, color: "#f59e0b" },
  ];
}

// ─── Recent activity ──────────────────────────────────────────────────────────

/** Newest-first activity rows, using the same normalisation as /activity. */
export function deriveRecentActivity(
  dataset: OpsPilotDataset,
  limit = 5,
): ActivityRow[] {
  return normalizeActivityLog(dataset.action_log).slice(0, limit);
}

// ─── Customer page data ───────────────────────────────────────────────────────

function formatLocalDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const d = parseLocalDate(isoString);
  if (!d) return "—";
  const date = new Date(d.year, d.month - 1, d.day);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  }).format(date);
}

function customerOperationalState(
  status: string,
  daysSinceContact: number,
): CustomerOperationalState {
  if (status === "Churned")  return "Churned";
  if (status === "Lead" && daysSinceContact >= 7) return "Needs Follow-up";
  if (status === "Lead")     return "Inactive Lead";
  if (status === "Active")   return "Active";
  return "Active";
}

export function deriveCustomerPageData(dataset: OpsPilotDataset): CustomerPageData {
  const { customers, invoices, tasks, meetings } = dataset;
  const today = todayJakarta();

  const rows: CustomerRow[] = customers.map((c) => {
    const daysSince = computeDaysSinceContact(c.last_contact, today);

    // Joined invoice stats
    const custInvoices = invoices.filter((i) => i.customer_id === c.customer_id);
    const unpaidInvoices = custInvoices.filter((i) => i.status === "Unpaid");
    const overdueAmount = custInvoices
      .filter((i) => isInvoiceOverdue(i, today))
      .reduce((s, i) => s + i.amount, 0);

    // Joined task stats
    const openTasks = tasks.filter(
      (t) => t.customer_id === c.customer_id && t.status === "Open",
    ).length;

    // Joined meeting stats
    const unpreparedMeetings = meetings.filter(
      (m) =>
        m.customer_id === c.customer_id &&
        m.prep_status === "Not Prepared" &&
        (daysUntil(m.meeting_date, today) ?? -1) >= 0,
    ).length;

    return {
      customer_id:          c.customer_id,
      customer_name:        c.customer_name,
      email:                c.email,
      status:               c.status,
      lastContactFormatted: formatLocalDate(c.last_contact),
      daysSinceContact:     daysSince === 9999 ? -1 : daysSince,
      opportunityValue:     c.opportunity_value,
      priority:             c.customer_priority,
      operationalState:     customerOperationalState(c.status, daysSince),
      totalInvoices:        custInvoices.length,
      unpaidInvoices:       unpaidInvoices.length,
      overdueAmount,
      openTasks,
      unpreparedMeetings,
    };
  });

  return {
    rows,
    totalCustomers:      customers.length,
    activeCustomers:     customers.filter((c) => c.status === "Active").length,
    activeLeads:         customers.filter((c) => c.status === "Lead").length,
    leadOpportunityValue: customers
      .filter((c) => c.status === "Lead")
      .reduce((s, c) => s + c.opportunity_value, 0),
  };
}

// ─── Invoice page data ────────────────────────────────────────────────────────

export function deriveInvoicePageData(dataset: OpsPilotDataset): InvoicePageData {
  const { customers, invoices } = dataset;
  const today = todayJakarta();

  const customerMap = new Map(customers.map((c) => [c.customer_id, c]));

  const rows: InvoiceRow[] = invoices.map((inv) => {
    const cust = customerMap.get(inv.customer_id);
    const daysOverdue = invoiceDaysOverdue(inv, today);

    let paymentState: InvoicePaymentState;
    if (inv.status === "Paid")       paymentState = "Paid";
    else if (daysOverdue > 0)        paymentState = "Overdue";
    else                             paymentState = "Current";

    return {
      invoice_id:       inv.invoice_id,
      customer_id:      inv.customer_id,
      customerName:     cust?.customer_name ?? "Unknown customer",
      customerEmail:    cust?.email ?? "",
      customerPriority: cust?.customer_priority ?? "Low",
      amount:           inv.amount,
      dueDateFormatted: formatLocalDate(inv.due_date),
      status:           inv.status,
      paymentState,
      daysOverdue,
    };
  });

  const unpaidRows = rows.filter((r) => r.status === "Unpaid");
  const overdueRows = rows.filter((r) => r.paymentState === "Overdue");

  return {
    rows,
    totalInvoices: invoices.length,
    unpaidAmount:  unpaidRows.reduce((s, r) => s + r.amount, 0),
    overdueAmount: overdueRows.reduce((s, r) => s + r.amount, 0),
    overdueCount:  overdueRows.length,
  };
}

// ─── Tasks page data ──────────────────────────────────────────────────────────

function taskScheduleState(daysLeft: number | null): TaskScheduleState {
  if (daysLeft === null)  return "No deadline";
  if (daysLeft < 0)       return "Overdue";
  if (daysLeft === 0)     return "Due today";
  if (daysLeft === 1)     return "Due tomorrow";
  return "Upcoming";
}

function taskContextNote(row: {
  priority: string;
  scheduleState: TaskScheduleState;
  daysOverdue: number;
}): string {
  const p = row.priority.toLowerCase();
  switch (row.scheduleState) {
    case "Overdue":
      return `This ${p}-priority task is overdue by ${row.daysOverdue} day${row.daysOverdue !== 1 ? "s" : ""}.`;
    case "Due today":
      return `This ${p}-priority task is due today.`;
    case "Due tomorrow":
      return `This ${p}-priority task is due tomorrow.`;
    case "Upcoming":
      return `This ${p}-priority task is due in ${Math.abs(row.daysOverdue)} day${Math.abs(row.daysOverdue) !== 1 ? "s" : ""}.`;
    case "No deadline":
      return `This ${p}-priority task has no recorded deadline.`;
  }
}

export function deriveTasksPageData(dataset: OpsPilotDataset): TaskPageSummary {
  const { tasks } = dataset;
  const today = todayJakarta();
  const customerMap = new Map(
    dataset.customers.map((c) => [c.customer_id, c.customer_name]),
  );

  const rows: TaskRow[] = tasks.map((t) => {
    const du = daysUntil(t.deadline, today);        // null | negative | 0 | positive
    const scheduleState = taskScheduleState(du);
    // daysOverdue > 0 means overdue; negative means days remaining
    const daysOverdue = du === null ? 0 : du <= 0 ? Math.abs(du) : -du;

    const partial = {
      priority:      t.priority,
      scheduleState,
      daysOverdue,
    };

    return {
      task_id:           t.task_id,
      task:              t.task,
      customerName:      customerMap.get(t.customer_id) ?? "Unknown customer",
      deadlineFormatted: formatLocalDate(t.deadline),
      scheduleState,
      daysOverdue,
      priority:          t.priority,
      status:            t.status,
      contextNote:       taskContextNote(partial),
    };
  });

  const openRows    = rows.filter((r) => r.status === "Open");
  const overdueOpen = openRows.filter((r) => r.scheduleState === "Overdue");

  return {
    rows,
    openCount:    openRows.length,
    overdueCount: overdueOpen.length,
  };
}

// ─── Meetings page data ───────────────────────────────────────────────────────

function meetingProximity(daysAway: number | null): MeetingProximity {
  if (daysAway === null) return "Unknown";
  if (daysAway < 0)      return "Past";
  if (daysAway === 0)    return "Today";
  if (daysAway === 1)    return "Tomorrow";
  return "Upcoming";
}

function meetingContextNote(row: {
  prepStatus: string;
  proximity: MeetingProximity;
  daysAway: number | null;
}): string {
  if (row.proximity === "Past") {
    return "Historical meeting — no new calendar preparation action required.";
  }
  if (row.prepStatus === "Prepared") {
    return "Meeting preparation is complete. No preparation action required.";
  }
  if (row.proximity === "Today")    return "This meeting is today and has not been prepared.";
  if (row.proximity === "Tomorrow") return "This meeting is tomorrow and has not been prepared.";
  if (row.daysAway !== null && row.daysAway > 0) {
    return `This meeting is in ${row.daysAway} day${row.daysAway !== 1 ? "s" : ""} and has not been prepared.`;
  }
  return "Preparation status unknown.";
}

export function deriveMeetingsPageData(dataset: OpsPilotDataset): MeetingPageSummary {
  const { meetings } = dataset;
  const today = todayJakarta();
  const customerMap = new Map(
    dataset.customers.map((c) => [c.customer_id, c.customer_name]),
  );

  const rows: MeetingRow[] = meetings.map((m) => {
    const da      = daysUntil(m.meeting_date, today);
    const prox    = meetingProximity(da);

    const partial = { prepStatus: m.prep_status, proximity: prox, daysAway: da };

    return {
      meeting_id:    m.meeting_id,
      meeting:       m.meeting,
      customerName:  customerMap.get(m.customer_id) ?? "Unknown customer",
      dateFormatted: formatLocalDate(m.meeting_date),
      timeLocal:     m.meeting_time ?? "—",
      prepStatus:    m.prep_status,
      proximity:     prox,
      daysAway:      da,
      contextNote:   meetingContextNote(partial),
    };
  });

  const upcomingRows      = rows.filter((r) => r.daysAway !== null && r.daysAway >= 0);
  const notPreparedRows   = upcomingRows.filter((r) => r.prepStatus === "Not Prepared");

  return {
    rows,
    upcomingCount:    upcomingRows.length,
    notPreparedCount: notPreparedRows.length,
  };
}

// ─── Action Center ────────────────────────────────────────────────────────────
//
// action_log is the ONLY execution evidence. An item is "executed" solely when
// a successful gmail_draft_sent / calendar_event_created entry exists for its
// entity_id. Entries are always ordered by parsed timestamp — never by array
// position — because the sheet mixes "YYYY-MM-DD HH:mm" and ISO instants.

function sortByTimestamp(entries: ActionLog[]): ActionLog[] {
  return [...entries].sort(
    (a, b) => (timestampMs(a.timestamp) ?? 0) - (timestampMs(b.timestamp) ?? 0),
  );
}

/** Latest successful entry of the given action_type in a timestamp-sorted list. */
function latestSuccess(sorted: ActionLog[], actionType: string): ActionLog | null {
  for (let i = sorted.length - 1; i >= 0; i--) {
    const e = sorted[i];
    if (
      e.action_type === actionType &&
      (e.execution_status ?? "").trim().toLowerCase() === SUCCESS_STATUS[actionType]
    ) {
      return e;
    }
  }
  return null;
}

function buildReceipt(entry: ActionLog, referenceId: string | null): ActionExecutionReceipt {
  const decision = describeDecision(entry.user_decision);
  return {
    status:              entry.execution_status,
    executedAt:          entry.timestamp,
    executedAtFormatted: formatDateTimeJakarta(entry.timestamp),
    approvalConfirmed:   decision.approvalConfirmed,
    approvalLabel:       decision.receiptLabel,
    referenceId:         shortenId(referenceId),
    recipient:           entry.recipient || null,
  };
}

type EmailLifecycle =
  | { state: "executed"; receipt: ActionExecutionReceipt }
  | { state: "prepared"; draft: ActionDraftInfo }
  | { state: "none" };

/**
 * Gmail lifecycle for one entity:
 *   latest draft newer than latest send → prepared (a new draft awaits SEND)
 *   any successful send                 → executed
 *   no Gmail evidence                   → none
 * gmail_send_failed is never treated as execution.
 */
function emailLifecycle(sorted: ActionLog[]): EmailLifecycle {
  const sent  = latestSuccess(sorted, "gmail_draft_sent");
  const draft = latestSuccess(sorted, "gmail_draft_created");

  if (draft && (!sent || (timestampMs(draft.timestamp) ?? 0) > (timestampMs(sent.timestamp) ?? 0))) {
    return {
      state: "prepared",
      draft: {
        createdAt:          draft.timestamp,
        createdAtFormatted: formatDateTimeJakarta(draft.timestamp),
        subject:            detailString(parseDetails(draft.details_json), "subject"),
        recipient:          draft.recipient || null,
      },
    };
  }
  if (sent) return { state: "executed", receipt: buildReceipt(sent, sent.message_id) };
  return { state: "none" };
}

/** Receipt for the latest successful calendar_event_created, or null. */
function calendarReceipt(sorted: ActionLog[]): ActionExecutionReceipt | null {
  const event = latestSuccess(sorted, "calendar_event_created");
  if (!event) return null;
  // Event ID lives in details_json.event_id or, for some workflows, message_id.
  const eventId = detailString(parseDetails(event.details_json), "event_id") ?? event.message_id;
  return buildReceipt(event, eventId);
}

function lastActivity(sorted: ActionLog[]) {
  const last = sorted[sorted.length - 1];
  return {
    lastActivityAt:        last ? timestampMs(last.timestamp) : null,
    lastActivityFormatted: formatDateTimeJakarta(last?.timestamp),
  };
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/**
 * A task warrants a calendar reminder only when it is Open AND overdue,
 * due today, or High priority and due within 1 day. Future Low/Medium
 * routine tasks (and tasks without a deadline) would only add noise.
 */
function isTaskReminderActionable(task: Task, daysLeft: number | null): boolean {
  if (task.status !== "Open" || daysLeft === null) return false;
  return daysLeft <= 0 || (task.priority === "High" && daysLeft <= 1);
}

function emailExecutionStatus(state: EmailLifecycle["state"]): string {
  if (state === "executed") return "Email sent";
  if (state === "prepared") return "Gmail draft awaiting SEND approval";
  return "No Gmail draft yet";
}

/**
 * Derive the Action Center view model.
 *
 * One item per entity + workflow, so an entity is never counted in two
 * lifecycle states.
 *
 * Invoice  (Payment follow-up, Email)
 *   executed    → latest successful gmail_draft_sent is newer than any draft
 *   prepared    → latest gmail_draft_created is newer than any send (invoice still unpaid)
 *   recommended → invoice overdue, no Gmail evidence
 *
 * Customer (Lead follow-up, Email)
 *   Same Gmail rules. Recommended when a Lead needs follow-up (7+ days since contact).
 *   SEND is offered only when a draft for that customer exists in action_log.
 *
 * Task     (Calendar reminder)
 *   executed    → calendar_event_created exists
 *   recommended → Open AND (overdue OR due today OR High priority due tomorrow),
 *                 no event → CREATE <TASK_ID>
 *
 * Meeting  (Meeting prep reminder)
 *   executed    → calendar_event_created exists
 *   recommended → upcoming (today or later) and Not Prepared → CREATE <MEETING_ID>
 *   Historical meetings never receive a new recommendation.
 *
 * Executed items stay visible even after the entity stops being actionable
 * (paid invoice, past meeting) because the action_log proves they happened.
 */
export function deriveActionCenterData(dataset: OpsPilotDataset): ActionCenterSummary {
  const { customers, invoices, tasks, meetings, action_log } = dataset;
  const today = todayJakarta();
  const customerMap = new Map(customers.map((c) => [c.customer_id, c]));
  const customerName = (id: string) => customerMap.get(id)?.customer_name ?? "Unknown customer";

  // Index action_log by entity_id. Entries with a blank entity_id cannot be matched.
  const logByEntity = new Map<string, ActionLog[]>();
  for (const entry of action_log) {
    const key = (entry.entity_id ?? "").trim();
    if (!key) continue;
    const arr = logByEntity.get(key) ?? [];
    arr.push(entry);
    logByEntity.set(key, arr);
  }
  const logsFor = (entityId: string) => sortByTimestamp(logByEntity.get(entityId) ?? []);

  const items: ActionCenterItem[] = [];

  // ── 1. Invoice payment follow-up ───────────────────────────────────────────
  for (const inv of invoices) {
    const sorted = logsFor(inv.invoice_id);
    const email  = emailLifecycle(sorted);
    const days   = invoiceDaysOverdue(inv, today);

    if (email.state === "none" && !isInvoiceOverdue(inv, today)) continue;
    if (email.state === "prepared" && inv.status !== "Unpaid") continue;

    const state: ActionLifecycleState = email.state === "none" ? "recommended" : email.state;
    const paymentNote =
      inv.status === "Paid" ? "Paid" : days > 0 ? `${plural(days, "day")} overdue` : "Unpaid";

    items.push({
      id:              `${inv.invoice_id}:invoice_payment_followup`,
      entityId:        inv.invoice_id,
      entityType:      "invoice",
      customerId:      inv.customer_id,
      customerName:    customerName(inv.customer_id),
      actionType:      "invoice_payment_followup",
      actionLabel:     "Payment follow-up",
      actionCategory:  "email",
      recommendation:  `Send a payment follow-up email for ${inv.invoice_id}.`,
      context:         `${paymentNote} · ${formatIDRCompact(inv.amount)}`,
      lifecycleState:  state,
      executionType:   "Email",
      executionStatus: emailExecutionStatus(email.state),
      suggestedCommand: `Handle ${inv.invoice_id}`,
      executionCommand: state === "prepared" ? `SEND ${inv.invoice_id}` : null,
      ...lastActivity(sorted),
      receipt: email.state === "executed" ? email.receipt : null,
      draft:   email.state === "prepared" ? email.draft : null,
    });
  }

  // ── 2. Lead customer follow-up ─────────────────────────────────────────────
  for (const c of customers) {
    const sorted    = logsFor(c.customer_id);
    const email     = emailLifecycle(sorted);
    const daysSince = computeDaysSinceContact(c.last_contact, today);
    const needsFollowUp = customerOperationalState(c.status, daysSince) === "Needs Follow-up";

    if (email.state === "none" && !needsFollowUp) continue;

    const state: ActionLifecycleState = email.state === "none" ? "recommended" : email.state;
    const contactNote =
      daysSince === 9999 ? "No recorded contact" : `${plural(daysSince, "day")} since last contact`;
    const context =
      c.opportunity_value > 0
        ? `${contactNote} · ${formatIDRCompact(c.opportunity_value)} opportunity`
        : contactNote;

    items.push({
      id:              `${c.customer_id}:customer_followup`,
      entityId:        c.customer_id,
      entityType:      "customer",
      customerId:      c.customer_id,
      customerName:    c.customer_name,
      actionType:      "customer_followup",
      actionLabel:     "Lead follow-up",
      actionCategory:  "followup",
      recommendation:  `Re-engage ${c.customer_name} about the open opportunity.`,
      context,
      lifecycleState:  state,
      executionType:   "Email",
      executionStatus: emailExecutionStatus(email.state),
      suggestedCommand: `Handle ${c.customer_id}`,
      // Only offer SEND when a draft for this customer actually exists.
      executionCommand: state === "prepared" ? `SEND ${c.customer_id}` : null,
      ...lastActivity(sorted),
      receipt: email.state === "executed" ? email.receipt : null,
      draft:   email.state === "prepared" ? email.draft : null,
    });
  }

  // ── 3. Task calendar reminder ──────────────────────────────────────────────
  for (const t of tasks) {
    const sorted  = logsFor(t.task_id);
    const receipt = calendarReceipt(sorted);

    const du = daysUntil(t.deadline, today);
    if (!receipt && !isTaskReminderActionable(t, du)) continue;

    const scheduleNote =
      t.status !== "Open" ? t.status
      : du === null        ? "No deadline"
      : du < 0             ? `${plural(Math.abs(du), "day")} overdue`
      : du === 0           ? "Due today"
      : du === 1           ? "Due tomorrow"
      :                      `Due in ${plural(du, "day")}`;

    items.push({
      id:              `${t.task_id}:task_calendar_reminder`,
      entityId:        t.task_id,
      entityType:      "task",
      customerId:      t.customer_id,
      customerName:    customerName(t.customer_id),
      actionType:      "task_calendar_reminder",
      actionLabel:     "Calendar reminder",
      actionCategory:  "calendar",
      recommendation:  `Create a calendar reminder for "${t.task}".`,
      context:         `${t.task} · ${scheduleNote}`,
      lifecycleState:  receipt ? "executed" : "recommended",
      executionType:   "Calendar",
      executionStatus: receipt ? "Calendar reminder created" : "Calendar reminder not created",
      suggestedCommand: t.task_id,
      executionCommand: receipt ? null : `CREATE ${t.task_id}`,
      ...lastActivity(sorted),
      receipt,
      draft: null,
    });
  }

  // ── 4. Meeting preparation reminder ────────────────────────────────────────
  for (const m of meetings) {
    const sorted  = logsFor(m.meeting_id);
    const receipt = calendarReceipt(sorted);
    const da      = daysUntil(m.meeting_date, today);
    const upcomingNotPrepared = m.prep_status === "Not Prepared" && da !== null && da >= 0;

    // Historical meetings never get a new recommendation; executed evidence still shows.
    if (!receipt && !upcomingNotPrepared) continue;

    const proximityNote =
      da === null ? "Date unknown"
      : da < 0    ? "Past meeting"
      : da === 0  ? "Today"
      : da === 1  ? "Tomorrow"
      :             `In ${plural(da, "day")}`;

    items.push({
      id:              `${m.meeting_id}:meeting_prep_reminder`,
      entityId:        m.meeting_id,
      entityType:      "meeting",
      customerId:      m.customer_id,
      customerName:    customerName(m.customer_id),
      actionType:      "meeting_prep_reminder",
      actionLabel:     "Meeting prep reminder",
      actionCategory:  "calendar",
      recommendation:  `Block preparation time before "${m.meeting}".`,
      context:         `${m.meeting} · ${proximityNote}`,
      lifecycleState:  receipt ? "executed" : "recommended",
      executionType:   "Calendar",
      executionStatus: receipt ? "Calendar reminder created" : "Calendar reminder not created",
      suggestedCommand: m.meeting_id,
      executionCommand: receipt ? null : `CREATE ${m.meeting_id}`,
      ...lastActivity(sorted),
      receipt,
      draft: null,
    });
  }

  // ── Sort: recommended → prepared → executed, then most recent activity first ─
  const ORDER: Record<ActionLifecycleState, number> = { recommended: 0, prepared: 1, executed: 2 };
  items.sort((a, b) => {
    const byState = ORDER[a.lifecycleState] - ORDER[b.lifecycleState];
    if (byState !== 0) return byState;
    return (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0);
  });

  const count = (s: ActionLifecycleState) => items.filter((i) => i.lifecycleState === s).length;

  return {
    items,
    recommendedCount:      count("recommended"),
    preparedCount:         count("prepared"),
    executedCount:         count("executed"),
    approvalRequiredCount: items.filter((i) => i.executionCommand !== null).length,
  };
}
