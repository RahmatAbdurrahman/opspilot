"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DrawerField } from "@/components/shared/drawer-field";
import { BobHandoff } from "@/components/shared/bob-handoff";
import type {
  ActionCenterItem,
  ActionCenterSummary,
  ActionLifecycleState,
  ActionCategory,
  ActionExecutionType,
} from "@/lib/opspilot/types";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  CalendarDays,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Badge config ─────────────────────────────────────────────────────────────

const LIFECYCLE_CLS: Record<ActionLifecycleState, string> = {
  recommended: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  prepared:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  executed:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

const LIFECYCLE_LABEL: Record<ActionLifecycleState, string> = {
  recommended: "Recommended",
  prepared:    "Prepared",
  executed:    "Executed",
};

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  email:    "Email",
  calendar: "Calendar",
  followup: "Customer Follow-up",
};

const EXECUTION_ICON: Record<ActionExecutionType, React.ComponentType<{ className?: string }>> = {
  Email:    Mail,
  Calendar: CalendarDays,
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function LifecycleBadge({ state }: { state: ActionLifecycleState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        LIFECYCLE_CLS[state],
      )}
    >
      {LIFECYCLE_LABEL[state]}
    </span>
  );
}

function ExecutionTypeLabel({ type }: { type: ActionExecutionType }) {
  const Icon = EXECUTION_ICON[type];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
      <Icon className="h-3 w-3" aria-hidden />
      {type}
    </span>
  );
}

function FilterBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
      )}
    >
      {label}
    </button>
  );
}

function LifecycleTabs({
  active, onChange, tabs,
}: {
  active: string;
  onChange: (t: LifecycleFilter) => void;
  tabs: { id: LifecycleFilter; label: string; count: number }[];
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === tab.id
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
          )}
        >
          {tab.label}
          <span className={cn(
            "ml-1.5 inline-flex items-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
            active === tab.id ? "bg-cyan-500/20 text-cyan-400" : "bg-white/8 text-[hsl(var(--muted-foreground))]",
          )}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}

type SortDir = "asc" | "desc";

function SortTh<K extends string>({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: K; current: K; dir: SortDir; onSort: (k: K) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      scope="col"
      className="px-4 py-2.5 text-left cursor-pointer select-none"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function PlainTh({ label }: { label: string }) {
  return (
    <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
      {label}
    </th>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

const TAB_EMPTY_MESSAGE: Record<LifecycleFilter, string> = {
  all:         "No operational actions right now.",
  recommended: "No recommended actions right now.",
  prepared:    "No prepared actions are awaiting review.",
  executed:    "No executed actions are recorded in the Action Log yet.",
};

function EmptyState({
  title, hint, onReset,
}: { title: string; hint?: string; onReset?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-14 px-4 text-center">
      <Zap className="mx-auto mb-3 h-6 w-6 text-[hsl(var(--muted-foreground))]" aria-hidden />
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

// ─── Responsible AI panel ─────────────────────────────────────────────────────

const HUMAN_CONTROL_NOTES = [
  "Analysis and recommendations may be automated.",
  "External email and calendar actions require IBM Bob approval.",
  "Executions are recorded in the OpsPilot Action Log.",
  "Duplicate protection prevents repeated actions.",
];

function HumanControlPanel() {
  return (
    <section
      aria-labelledby="human-control-title"
      className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3 sm:flex-row sm:items-start sm:gap-6"
    >
      <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">
        <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
        <h3 id="human-control-title" className="text-xs font-semibold text-[hsl(var(--foreground))]">
          Human Control
        </h3>
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {HUMAN_CONTROL_NOTES.map((note) => (
          <li key={note} className="flex items-start gap-2 text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
            <span className="mt-[7px] h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))] shrink-0" aria-hidden />
            {note}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: ActionCenterSummary }) {
  const cards = [
    { label: "Recommended",       value: data.recommendedCount,      hint: "No draft or execution yet",  icon: Clock,        cls: "text-amber-400" },
    { label: "Prepared",          value: data.preparedCount,         hint: "Gmail draft awaiting SEND",  icon: FileText,     cls: "text-cyan-400" },
    { label: "Executed",          value: data.executedCount,         hint: "Confirmed by the Action Log", icon: CheckCircle2, cls: "text-emerald-400" },
    { label: "Approval Required", value: data.approvalRequiredCount, hint: "Ready to run in IBM Bob",    icon: ShieldCheck,  cls: "text-[hsl(var(--muted-foreground))]" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

// ─── Action detail drawer ─────────────────────────────────────────────────────

function ActionDrawer({
  item,
  onClose,
}: {
  item: ActionCenterItem | null;
  onClose: () => void;
}) {
  return (
    <DetailDrawer
      open={item !== null}
      onClose={onClose}
      title={item?.entityId ?? ""}
      subtitle={item ? `${item.actionLabel} · ${item.customerName}` : undefined}
      badge={item ? <LifecycleBadge state={item.lifecycleState} /> : undefined}
    >
      {item && <ActionDrawerBody item={item} />}
    </DetailDrawer>
  );
}

function ActionDrawerBody({ item }: { item: ActionCenterItem }) {
  const { receipt, draft } = item;
  const isExecuted = item.lifecycleState === "executed";

  return (
    <div className="px-5 py-5 space-y-6">
      {/* Core fields */}
      <div className="grid grid-cols-2 gap-4">
        <DrawerField label="Entity"   value={<code className="font-mono text-xs">{item.entityId}</code>} />
        <DrawerField label="Customer" value={item.customerName} />
        <DrawerField label="Action"   value={item.actionLabel} />
        <DrawerField label="Type"     value={<ExecutionTypeLabel type={item.executionType} />} />
        <DrawerField label="Lifecycle state"     value={<LifecycleBadge state={item.lifecycleState} />} />
        <DrawerField label="Last known activity" value={item.lastActivityFormatted === "—" ? "No logged activity" : item.lastActivityFormatted} />
        <div className="col-span-2">
          <DrawerField label="Execution status" value={item.executionStatus} />
        </div>
      </div>

      <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Recommendation
        </p>
        <p className="text-sm text-[hsl(var(--foreground))]">{item.recommendation}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.context}</p>
      </div>

      {/* Prepared: latest unsent Gmail draft */}
      {draft && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            Gmail draft prepared
          </p>
          <div className="grid grid-cols-2 gap-3">
            {draft.subject && (
              <div className="col-span-2"><DrawerField label="Subject" value={draft.subject} /></div>
            )}
            {draft.recipient && <DrawerField label="Recipient" value={draft.recipient} />}
            <DrawerField label="Drafted" value={draft.createdAtFormatted} />
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            The draft has not been sent. Sending requires your approval in IBM Bob.
          </p>
        </div>
      )}

      {/* Executed: receipt built from the action_log entry */}
      {receipt && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">Execution receipt</p>
          </div>
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Status"         value={<LifecycleBadge state="executed" />} />
              <DrawerField label="Execution type" value={<ExecutionTypeLabel type={item.executionType} />} />
              <DrawerField label="Timestamp"      value={receipt.executedAtFormatted} />
              <DrawerField
                label="Human approval"
                value={
                  <span className={receipt.approvalConfirmed ? "text-emerald-400" : "text-[hsl(var(--muted-foreground))]"}>
                    {receipt.approvalLabel}
                  </span>
                }
              />
              {receipt.recipient && <DrawerField label="Recipient" value={receipt.recipient} />}
              {receipt.referenceId && (
                <DrawerField
                  label={item.executionType === "Calendar" ? "Event ID" : "Message ID"}
                  value={<code className="font-mono text-[11px]">{receipt.referenceId}</code>}
                />
              )}
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {receipt.approvalConfirmed
                ? "Executed through IBM Bob after human approval and recorded in the OpsPilot Action Log."
                : "Recorded in the OpsPilot Action Log."}
            </p>
          </div>
        </div>
      )}

      {/* IBM Bob handoff — the website only copies commands, it never executes */}
      {isExecuted ? (
        <BobHandoff
          title="Review in IBM Bob"
          suggestedCommand={item.suggestedCommand}
          contextNote="This action is already executed, so no execution command is offered. Duplicate protection in IBM Bob prevents repeating it."
        />
      ) : (
        <BobHandoff
          title="Continue securely in IBM Bob"
          suggestedCommand={item.suggestedCommand}
          executionCommand={item.executionCommand ?? undefined}
          executionLabel={
            item.lifecycleState === "prepared"
              ? "Sends the prepared Gmail draft."
              : item.executionType === "Calendar"
              ? "Creates the Google Calendar reminder."
              : undefined
          }
          contextNote={
            item.executionCommand
              ? undefined
              : "Run the suggested command in IBM Bob to prepare a Gmail draft. A SEND command becomes available once the draft is recorded in the Action Log."
          }
        />
      )}
    </div>
  );
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

type LifecycleFilter = ActionLifecycleState | "all";
type SortKey = "state" | "entity" | "customer" | "activity";

const LIFECYCLE_ORDER: Record<ActionLifecycleState, number> = {
  recommended: 0,
  prepared:    1,
  executed:    2,
};

function sortItems(rows: ActionCenterItem[], key: SortKey, dir: SortDir): ActionCenterItem[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (key === "state")    diff = LIFECYCLE_ORDER[a.lifecycleState] - LIFECYCLE_ORDER[b.lifecycleState];
    if (key === "entity")   diff = a.entityId.localeCompare(b.entityId);
    if (key === "customer") diff = a.customerName.localeCompare(b.customerName);
    if (key === "activity") diff = (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0);
    return dir === "asc" ? diff : -diff;
  });
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function ActionCenterView({ data }: { data: ActionCenterSummary }) {
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>("all");
  const [categoryFilter,  setCategoryFilter]  = useState<ActionCategory | "all">("all");
  const [search,          setSearch]          = useState("");
  const [sortKey,         setSortKey]         = useState<SortKey>("state");
  const [sortDir,         setSortDir]         = useState<SortDir>("asc");
  const [selected,        setSelected]        = useState<ActionCenterItem | null>(null);

  function handleSort(k: SortKey) {
    if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = data.items.filter((item) => {
      if (lifecycleFilter !== "all" && item.lifecycleState !== lifecycleFilter) return false;
      if (categoryFilter  !== "all" && item.actionCategory !== categoryFilter)  return false;
      if (q && !item.entityId.toLowerCase().includes(q) && !item.customerName.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    return sortItems(base, sortKey, sortDir);
  }, [data.items, lifecycleFilter, categoryFilter, search, sortKey, sortDir]);

  const secondaryFiltersActive = categoryFilter !== "all" || search.trim() !== "";

  function resetFilters() {
    setLifecycleFilter("all");
    setCategoryFilter("all");
    setSearch("");
  }

  const tabs: { id: LifecycleFilter; label: string; count: number }[] = [
    { id: "all",         label: "All",         count: data.items.length },
    { id: "recommended", label: "Recommended", count: data.recommendedCount },
    { id: "prepared",    label: "Prepared",    count: data.preparedCount },
    { id: "executed",    label: "Executed",    count: data.executedCount },
  ];

  return (
    <>
      <ActionDrawer item={selected} onClose={() => setSelected(null)} />

      <HumanControlPanel />

      <SummaryCards data={data} />

      <div className="flex flex-col gap-3">
        <LifecycleTabs active={lifecycleFilter} onChange={setLifecycleFilter} tabs={tabs} />

        {/* Secondary filters + search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {(["all", "email", "calendar", "followup"] as const).map((c) => (
              <FilterBtn
                key={c}
                label={c === "all" ? "All Types" : CATEGORY_LABEL[c]}
                active={categoryFilter === c}
                onClick={() => setCategoryFilter(c)}
              />
            ))}
          </div>
          <div className="relative w-full sm:ml-auto sm:w-auto">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Entity ID or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search actions by entity ID or customer name"
              className="h-8 w-full sm:w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {data.items.length} action{data.items.length !== 1 ? "s" : ""}
        </p>
      )}

      {filtered.length === 0 &&
        (secondaryFiltersActive ? (
          <EmptyState
            title="No actions match your filters."
            hint="Try a different type or search term."
            onReset={resetFilters}
          />
        ) : (
          <EmptyState title={TAB_EMPTY_MESSAGE[lifecycleFilter]} />
        ))}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Action Center">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <SortTh label="Entity"        sortKey="entity"   current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Customer"      sortKey="customer" current={sortKey} dir={sortDir} onSort={handleSort} />
                <PlainTh label="Recommended Action" />
                <PlainTh label="Type" />
                <SortTh label="State"         sortKey="state"    current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Last Activity" sortKey="activity" current={sortKey} dir={sortDir} onSort={handleSort} />
                <PlainTh label="Action" />
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((item) => (
                  <motion.tr
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
                        {item.entityId}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[150px] truncate">
                      {item.customerName}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <p className="text-xs font-medium text-[hsl(var(--foreground))]">{item.actionLabel}</p>
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">{item.context}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ExecutionTypeLabel type={item.executionType} />
                    </td>
                    <td className="px-4 py-3">
                      <LifecycleBadge state={item.lifecycleState} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {item.lastActivityFormatted}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(item);
                        }}
                        aria-label={`${item.lifecycleState === "executed" ? "View" : "Review"} ${item.entityId}`}
                      >
                        {item.lifecycleState === "executed" ? "View" : "Review"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="lg:hidden space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="hover:border-white/15 transition-colors">
                  <CardContent className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <code className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
                          {item.entityId}
                        </code>
                        <p className="mt-0.5 text-xs font-medium text-[hsl(var(--foreground))]">{item.actionLabel}</p>
                        <p className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-2">{item.context}</p>
                      </div>
                      <LifecycleBadge state={item.lifecycleState} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="truncate">{item.customerName}</span>
                      <ExecutionTypeLabel type={item.executionType} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {item.lastActivityFormatted === "—" ? "No logged activity" : item.lastActivityFormatted}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={() => setSelected(item)}
                        aria-label={`${item.lifecycleState === "executed" ? "View" : "Review"} ${item.entityId}`}
                      >
                        {item.lifecycleState === "executed" ? "View" : "Review"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
