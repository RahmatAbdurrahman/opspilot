"use client";

import { DetailDrawer } from "@/components/shared/detail-drawer";
import { BobHandoff } from "@/components/shared/bob-handoff";
import { type PriorityItem } from "@/lib/opspilot/types";
import { formatIDR, formatIDRCompact } from "@/lib/opspilot/format";
import { formatDate } from "@/lib/utils";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="text-sm text-[hsl(var(--foreground))]">{value}</span>
    </div>
  );
}

// ─── Entity-specific detail sections ─────────────────────────────────────────

function CustomerDetail({ item }: { item: PriorityItem }) {
  const e = item.rawEntity;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Customer ID"      value={<code className="font-mono text-xs">{e.customer_id as string}</code>} />
      <Field label="Name"             value={e.customer_name as string} />
      <Field label="Email"            value={<a href={`mailto:${e.email as string}`} className="text-cyan-400 hover:underline">{e.email as string}</a>} />
      <Field label="Status"           value={e.status as string} />
      <Field label="Last Contact"     value={e.last_contact ? formatDate(e.last_contact as string) : "—"} />
      <Field label="Priority"         value={e.customer_priority as string} />
      <Field
        label="Opportunity Value"
        value={
          <span title={formatIDR(e.opportunity_value as number)}>
            {formatIDRCompact(e.opportunity_value as number)}
          </span>
        }
      />
      <Field label="Issue"            value={item.issue} />
    </div>
  );
}

function InvoiceDetail({ item }: { item: PriorityItem }) {
  const e = item.rawEntity;
  // Use the live-computed days_overdue embedded in the issue text via metrics.ts.
  // The raw entity field days_overdue is from the dataset and may be stale —
  // instead derive the display from the monetaryExposure and issue string.
  const isOverdue = item.severity !== "low" && item.monetaryExposure !== null;
  // Extract computed days from issue text: "Invoice overdue by N days"
  const match = item.issue.match(/overdue by (\d+)/);
  const computedDays = match ? Number(match[1]) : 0;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Invoice ID"  value={<code className="font-mono text-xs">{e.invoice_id as string}</code>} />
      <Field label="Customer ID" value={<code className="font-mono text-xs">{e.customer_id as string}</code>} />
      <Field
        label="Amount"
        value={
          <span title={formatIDR(e.amount as number)}>
            {formatIDRCompact(e.amount as number)}
          </span>
        }
      />
      <Field label="Due Date"        value={formatDate(e.due_date as string)} />
      <Field label="Payment Status"  value={e.status as string} />
      <Field
        label="Overdue"
        value={
          isOverdue && computedDays > 0 ? (
            <span className="text-red-400">
              {computedDays} day{computedDays !== 1 ? "s" : ""} overdue
            </span>
          ) : (
            <span className="text-emerald-400">Not overdue</span>
          )
        }
      />
    </div>
  );
}

function TaskDetail({ item }: { item: PriorityItem }) {
  const e = item.rawEntity;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Task ID"   value={<code className="font-mono text-xs">{e.task_id as string}</code>} />
      <Field label="Customer"  value={item.customer} />
      <Field label="Task"      value={e.task as string} />
      <Field label="Deadline"  value={formatDate(e.deadline as string)} />
      <Field label="Status"    value={e.status as string} />
      <Field label="Priority"  value={e.priority as string} />
    </div>
  );
}

function MeetingDetail({ item }: { item: PriorityItem }) {
  const e = item.rawEntity;
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Meeting ID"    value={<code className="font-mono text-xs">{e.meeting_id as string}</code>} />
      <Field label="Customer"      value={item.customer} />
      <Field label="Title"         value={e.meeting as string} />
      <Field label="Date"          value={formatDate(e.meeting_date as string)} />
      <Field label="Time"          value={e.meeting_time as string} />
      <Field label="Preparation"   value={
        e.prep_status === "Not Prepared" ? (
          <span className="text-amber-400">Not Prepared</span>
        ) : (
          <span className="text-emerald-400">Prepared</span>
        )
      } />
    </div>
  );
}

// ─── IBM Bob handoff commands ─────────────────────────────────────────────────

interface HandoffCommands {
  suggested: string;
  execution?: string;
  executionLabel?: string;
}

function getHandoffCommands(item: PriorityItem): HandoffCommands {
  switch (item.entityType) {
    case "invoice":
      return {
        suggested:      `Handle ${item.entityId}`,
        execution:      `SEND ${item.entityId}`,
        executionLabel: "Send prepared Gmail draft",
      };
    case "customer":
      return {
        suggested: `Handle ${item.entityId}`,
      };
    case "task":
      return {
        suggested:      item.entityId,
        execution:      `CREATE ${item.entityId}`,
        executionLabel: "Create calendar event",
      };
    case "meeting":
      return {
        suggested:      item.entityId,
        execution:      `CREATE ${item.entityId}`,
        executionLabel: "Create calendar event",
      };
  }
}

// ─── Severity badge ───────────────────────────────────────────────────────────

const SEV_CLASS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  high:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  medium:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  low:      "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface EntityDetailDrawerProps {
  item: PriorityItem | null;
  onClose: () => void;
}

export function EntityDetailDrawer({ item, onClose }: EntityDetailDrawerProps) {
  const handoff = item ? getHandoffCommands(item) : null;

  return (
    <DetailDrawer
      open={item !== null}
      onClose={onClose}
      title={item?.entityId ?? ""}
      subtitle={item?.customer}
      badge={
        item ? (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEV_CLASS[item.severity]}`}
          >
            {item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
          </span>
        ) : undefined
      }
    >
      {item && handoff && (
        <div className="px-5 py-5 space-y-6">
          {/* Issue */}
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">Issue</p>
                <p className="text-sm text-[hsl(var(--foreground))]">{item.issue}</p>
                {item.monetaryExposure !== null && (
                  <p
                    className="mt-1 text-base font-bold text-cyan-400"
                    title={formatIDR(item.monetaryExposure)}
                  >
                    {formatIDRCompact(item.monetaryExposure)}
                  </p>
                )}
              </div>

              {/* Entity-specific fields */}
              <div className="space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  {item.entityType.charAt(0).toUpperCase() + item.entityType.slice(1)} Details
                </p>
                {item.entityType === "customer" && <CustomerDetail item={item} />}
                {item.entityType === "invoice"  && <InvoiceDetail  item={item} />}
                {item.entityType === "task"     && <TaskDetail     item={item} />}
                {item.entityType === "meeting"  && <MeetingDetail  item={item} />}
              </div>

              {/* Recommended action */}
              <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Recommended Action
                </p>
                <p className="text-sm text-[hsl(var(--foreground))]">{item.recommendedAction}</p>
              </div>

          <BobHandoff
            suggestedCommand={handoff.suggested}
            executionCommand={handoff.execution ?? undefined}
            executionLabel={handoff.executionLabel}
          />
        </div>
      )}
    </DetailDrawer>
  );
}
