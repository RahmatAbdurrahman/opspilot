"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DrawerField } from "@/components/shared/drawer-field";
import { CopyButton } from "@/components/shared/copy-button";
import { CategoryLabel, OutcomeBadge } from "@/components/activity/activity-meta";
import type { ActivityCategory, ActivityOutcome, ActivityPageData, ActivityRow } from "@/lib/opspilot/types";
import { shortenId } from "@/lib/opspilot/format";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Filters ──────────────────────────────────────────────────────────────────

type CategoryFilter = ActivityCategory | "all";
type StatusFilter   = Exclude<ActivityOutcome, "unknown"> | "all";
type DateFilter     = "all" | "today" | "7d";

const CATEGORY_OPTIONS: { id: CategoryFilter; label: string }[] = [
  { id: "all",      label: "All" },
  { id: "Draft",    label: "Draft" },
  { id: "Email",    label: "Email" },
  { id: "Calendar", label: "Calendar" },
  { id: "System",   label: "System" },
];

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all",     label: "All" },
  { id: "success", label: "Successful" },
  { id: "pending", label: "Pending" },
  { id: "issue",   label: "Failed / Issue" },
];

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: "all",   label: "All time" },
  { id: "today", label: "Today" },
  { id: "7d",    label: "Last 7 days" },
];

function matchesDate(row: ActivityRow, filter: DateFilter): boolean {
  if (filter === "all") return true;
  if (row.daysAgo === null) return false;
  return filter === "today" ? row.daysAgo <= 0 : row.daysAgo <= 6;
}

function matchesSearch(row: ActivityRow, q: string): boolean {
  if (!q) return true;
  const haystack = [
    row.entityLabel,
    row.humanReadableAction,
    row.recipient,
    row.parsedDetails.subject,
    row.parsedDetails.eventTitle,
  ];
  return haystack.some((v) => v?.toLowerCase().includes(q));
}

function FilterGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.id
              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
              : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: ActivityPageData }) {
  const cards = [
    { label: "Total Activity",            value: data.totalCount,       hint: "Records in the Action Log",              icon: Activity,     cls: "text-cyan-400" },
    { label: "Drafts Created",            value: data.draftsCreated,    hint: "Gmail drafts prepared",                  icon: FileText,     cls: "text-cyan-400" },
    { label: "External Actions Executed", value: data.externalExecuted, hint: "Confirmed emails sent and events created", icon: CheckCircle2, cls: "text-emerald-400" },
    {
      label: "Execution Issues",
      value: data.issueCount,
      hint:  data.issueCount === 0 ? "No execution issues recorded." : "Explicit failures in the Action Log",
      icon:  AlertTriangle,
      cls:   data.issueCount === 0 ? "text-[hsl(var(--muted-foreground))]" : "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.label}</p>
              <Icon className={cn("h-3.5 w-3.5 shrink-0", c.cls)} aria-hidden />
            </div>
            <p className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight tabular-nums">
              {c.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[hsl(var(--muted-foreground))]">{c.hint}</p>
          </div>
        );
      })}
    </div>
  );
}

// ─── Auditability panel ───────────────────────────────────────────────────────

const AUDIT_NOTES = [
  "OpsPilot records prepared and executed actions.",
  "External execution evidence comes from the Action Log.",
  "Human approval is shown only when recorded.",
  "Historical records are preserved rather than silently removed.",
];

function AuditabilityPanel() {
  return (
    <section
      aria-labelledby="auditability-title"
      className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 sm:flex-row sm:items-start sm:gap-6"
    >
      <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">
        <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
        <h3 id="auditability-title" className="text-xs font-semibold text-[hsl(var(--foreground))]">
          Auditability
        </h3>
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {AUDIT_NOTES.map((note) => (
          <li key={note} className="flex items-start gap-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            <span className="mt-[7px] h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))] shrink-0" aria-hidden />
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function EntityCell({ row }: { row: ActivityRow }) {
  const unknown = !row.entityId;
  return (
    <span className="inline-flex items-center gap-1.5">
      <code
        className={cn(
          "text-xs font-mono font-semibold",
          unknown ? "text-[hsl(var(--muted-foreground))] italic" : "text-[hsl(var(--foreground))]",
        )}
      >
        {row.entityLabel}
      </code>
      {row.integrityWarning && (
        <AlertTriangle
          className="h-3 w-3 text-amber-400 shrink-0"
          aria-label="Data quality warning"
        />
      )}
    </span>
  );
}

function PlainTh({ label }: { label: string }) {
  return (
    <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
      {label}
    </th>
  );
}

function EmptyState({
  title, hint, onReset,
}: { title: string; hint?: string; onReset?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-14 px-4 text-center">
      <Activity className="mx-auto mb-3 h-6 w-6 text-[hsl(var(--muted-foreground))]" aria-hidden />
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">{title}</p>
      {hint && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>}
      {onReset && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onReset}>
          Reset filters
        </Button>
      )}
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function IdField({ label, id }: { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <DrawerField label={label} value={<code className="font-mono text-[11px]" title={id}>{shortenId(id)}</code>} />
      <div><CopyButton text={id} label="Copy ID" /></div>
    </div>
  );
}

function ActivityDrawerBody({ row }: { row: ActivityRow }) {
  const d = row.parsedDetails;
  const isCalendar = row.actionCategory === "Calendar";

  return (
    <div className="px-5 py-5 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <DrawerField label="Timestamp" value={row.localizedTimestamp} />
        <DrawerField label="Category"  value={<CategoryLabel category={row.actionCategory} />} />
        <div className="col-span-2">
          <DrawerField label="Activity" value={row.humanReadableAction} />
        </div>
        <DrawerField
          label="Entity"
          value={<code className="font-mono text-xs break-all">{row.entityLabel}</code>}
        />
        <DrawerField label="Execution status" value={<OutcomeBadge outcome={row.outcome} label={row.statusLabel} />} />
        <DrawerField label="User decision" value={row.decisionLabel} />
        <DrawerField
          label="Human approval"
          value={
            <span className={row.approvalConfirmed ? "text-emerald-400" : "text-[hsl(var(--muted-foreground))]"}>
              {row.approvalConfirmed ? "Confirmed" : "Not recorded"}
            </span>
          }
        />
      </div>

      {row.integrityWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
          <p className="text-[11px] leading-relaxed text-amber-300/90">{row.integrityWarning}</p>
        </div>
      )}

      {(row.recipient || d.subject || d.eventTitle || d.eventDate || d.requiredCommand || d.errorNote || row.recommendation) && (
        <>
          <Separator />
          <div className="grid grid-cols-1 gap-4">
            {row.recommendation && <DrawerField label="Recommendation" value={row.recommendation} />}
            {d.subject         && <DrawerField label="Subject"        value={<span className="break-words">{d.subject}</span>} />}
            {d.eventTitle      && <DrawerField label="Event title"    value={<span className="break-words">{d.eventTitle}</span>} />}
            {d.eventDate       && (
              <DrawerField
                label="Event date"
                value={d.scheduleMode ? `${d.eventDate} · ${d.scheduleMode.replace(/_/g, "-")}` : d.eventDate}
              />
            )}
            {row.recipient     && <DrawerField label="Recipient"      value={<span className="break-all">{row.recipient}</span>} />}
            {d.requiredCommand && (
              <DrawerField
                label="Required approval command"
                value={<code className="font-mono text-xs">{d.requiredCommand}</code>}
              />
            )}
            {d.errorNote       && <DrawerField label="Error note"     value={<span className="break-words text-red-300/90">{d.errorNote}</span>} />}
          </div>
        </>
      )}

      {(row.draftId || row.messageId || d.eventId) && (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            {row.draftId && (
              <DrawerField
                label="Draft ID"
                value={<code className="font-mono text-[11px]" title={row.draftId}>{shortenId(row.draftId)}</code>}
              />
            )}
            {!isCalendar && row.messageId && <IdField label="Message ID" id={row.messageId} />}
            {isCalendar && d.eventId && <IdField label="Calendar event ID" id={d.eventId} />}
          </div>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
        Read-only record from the OpsPilot Action Log. Nothing can be executed from this page.
      </p>
    </div>
  );
}

function ActivityDrawer({ row, onClose }: { row: ActivityRow | null; onClose: () => void }) {
  return (
    <DetailDrawer
      open={row !== null}
      onClose={onClose}
      title={row?.entityLabel ?? ""}
      subtitle={row?.humanReadableAction}
      badge={row ? <OutcomeBadge outcome={row.outcome} label={row.statusLabel} /> : undefined}
    >
      {row && <ActivityDrawerBody row={row} />}
    </DetailDrawer>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function ActivityView({ data }: { data: ActivityPageData }) {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [status,   setStatus]   = useState<StatusFilter>("all");
  const [date,     setDate]     = useState<DateFilter>("all");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<ActivityRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.rows.filter(
      (r) =>
        (category === "all" || r.actionCategory === category) &&
        (status === "all" || r.outcome === status) &&
        matchesDate(r, date) &&
        matchesSearch(r, q),
    );
  }, [data.rows, category, status, date, search]);

  const filtersActive = category !== "all" || status !== "all" || date !== "all" || search.trim() !== "";

  function resetFilters() {
    setCategory("all");
    setStatus("all");
    setDate("all");
    setSearch("");
  }

  return (
    <>
      <ActivityDrawer row={selected} onClose={() => setSelected(null)} />

      <SummaryCards data={data} />

      <AuditabilityPanel />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FilterGroup label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          <FilterGroup label="Status"   options={STATUS_OPTIONS}   value={status}   onChange={setStatus} />
          <FilterGroup label="Period"   options={DATE_OPTIONS}     value={date}     onChange={setDate} />
        </div>
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Entity ID, recipient or action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search activity by entity ID, recipient or action"
            className="h-8 w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {data.rows.length > 0 && filtered.length > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {data.rows.length} record{data.rows.length !== 1 ? "s" : ""}, newest first
        </p>
      )}

      {data.rows.length === 0 && <EmptyState title="No activity has been recorded yet." />}

      {data.rows.length > 0 && filtered.length === 0 && (
        <EmptyState
          title={
            status === "issue" && category === "all" && date === "all" && !search.trim()
              ? "No execution issues recorded."
              : "No activity matches your filters."
          }
          hint={filtersActive ? "Try different filters or a different search term." : undefined}
          onReset={filtersActive ? resetFilters : undefined}
        />
      )}

      {/* Desktop audit table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Activity audit log">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <PlainTh label="Time" />
                <PlainTh label="Entity" />
                <PlainTh label="Activity" />
                <PlainTh label="Category" />
                <PlainTh label="Decision" />
                <PlainTh label="Status" />
                <PlainTh label="Details" />
                <PlainTh label="Action" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                    {row.localizedTimestamp}
                  </td>
                  <td className="px-4 py-3"><EntityCell row={row} /></td>
                  <td className="px-4 py-3 text-xs font-medium text-[hsl(var(--foreground))]">
                    {row.humanReadableAction}
                  </td>
                  <td className="px-4 py-3"><CategoryLabel category={row.actionCategory} /></td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                    {row.decisionLabel}
                  </td>
                  <td className="px-4 py-3"><OutcomeBadge outcome={row.outcome} label={row.statusLabel} /></td>
                  <td className="px-4 py-3 text-[11px] text-[hsl(var(--muted-foreground))] max-w-[220px]">
                    <span className="line-clamp-1 break-all">{row.summary ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row);
                      }}
                      aria-label={`View ${row.humanReadableAction} for ${row.entityLabel}`}
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile timeline cards */}
      {filtered.length > 0 && (
        <ol className="lg:hidden space-y-3" aria-label="Activity timeline">
          {filtered.map((row) => (
            <li key={row.id}>
              <Card className="hover:border-white/15 transition-colors">
                <CardContent className="px-4 py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))]">{row.localizedTimestamp}</p>
                      <p className="mt-0.5 text-xs font-medium text-[hsl(var(--foreground))]">{row.humanReadableAction}</p>
                      <div className="mt-0.5"><EntityCell row={row} /></div>
                    </div>
                    <OutcomeBadge outcome={row.outcome} label={row.statusLabel} />
                  </div>
                  {row.summary && (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2 break-words">{row.summary}</p>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <CategoryLabel category={row.actionCategory} />
                      <span className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                        <Send className="h-3 w-3" aria-hidden />
                        {row.decisionLabel}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7"
                      onClick={() => setSelected(row)}
                      aria-label={`View ${row.humanReadableAction} for ${row.entityLabel}`}
                    >
                      View
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
