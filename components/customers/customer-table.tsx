"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailDrawer } from "@/components/shared/detail-drawer";
import { DrawerField } from "@/components/shared/drawer-field";
import { BobHandoff } from "@/components/shared/bob-handoff";
import { Separator } from "@/components/ui/separator";
import {
  type CustomerRow,
  type CustomerPageData,
  type CustomerStatus,
  type CustomerPriority,
  type CustomerOperationalState,
} from "@/lib/opspilot/types";
import { formatIDRCompact, formatIDR } from "@/lib/opspilot/format";
import { Search, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CLS: Record<CustomerStatus, string> = {
  Active:   "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Lead:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Inactive: "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
  Churned:  "bg-red-500/15 text-red-400 border-red-500/25",
};

const PRIORITY_CLS: Record<CustomerPriority, string> = {
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Low:    "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

const STATE_CLS: Record<CustomerOperationalState, string> = {
  "Needs Follow-up": "text-amber-400",
  "Active":          "text-emerald-400",
  "Inactive Lead":   "text-[hsl(var(--muted-foreground))]",
  "Churned":         "text-red-400",
};

function InlineBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "opportunityValue" | "daysSinceContact" | "priority";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<CustomerPriority, number> = { High: 0, Medium: 1, Low: 2 };

function sortRows(rows: CustomerRow[], key: SortKey, dir: SortDir): CustomerRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (key === "opportunityValue") diff = a.opportunityValue - b.opportunityValue;
    else if (key === "daysSinceContact") diff = a.daysSinceContact - b.daysSinceContact;
    else if (key === "priority") diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return dir === "asc" ? diff : -diff;
  });
}

// ─── Operational context narrative ───────────────────────────────────────────

function buildContextNote(row: CustomerRow): string {
  const parts: string[] = [];
  if (row.status === "Lead" && row.daysSinceContact >= 7) {
    const days = row.daysSinceContact === -1 ? "an unknown number of" : String(row.daysSinceContact);
    parts.push(`This lead has had no contact for ${days} days`);
    if (row.opportunityValue > 0) {
      parts.push(`and represents ${formatIDR(row.opportunityValue)} in opportunity value`);
    }
    parts.push(".");
  } else if (row.status === "Active") {
    parts.push("This is an active customer.");
    if (row.overdueAmount > 0) {
      parts.push(`There is ${formatIDR(row.overdueAmount)} in overdue invoices.`);
    }
  }
  if (row.openTasks > 0) {
    parts.push(`${row.openTasks} open task${row.openTasks > 1 ? "s" : ""} require follow-up.`);
  }
  return parts.join(" ") || "No outstanding operational issues.";
}

// ─── Customer detail drawer ───────────────────────────────────────────────────

function CustomerDrawer({
  row,
  onClose,
}: {
  row: CustomerRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const contextNote = buildContextNote(row);

  return (
    <DetailDrawer
      open={!!row}
      onClose={onClose}
      title={row.customer_name}
      subtitle={row.customer_id}
      badge={
        <InlineBadge label={row.status} cls={STATUS_CLS[row.status]} />
      }
    >
      <div className="px-5 py-5 space-y-6">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Customer ID"   value={<code className="font-mono text-xs">{row.customer_id}</code>} />
          <DrawerField label="Name"           value={row.customer_name} />
          <DrawerField
            label="Email"
            value={
              <a href={`mailto:${row.email}`} className="text-cyan-400 hover:underline break-all">
                {row.email}
              </a>
            }
          />
          <DrawerField label="Status"         value={row.status} />
          <DrawerField
            label="Last Contact"
            value={row.lastContactFormatted}
          />
          <DrawerField
            label="Days Since Contact"
            value={
              row.daysSinceContact === -1
                ? "Unknown"
                : `${row.daysSinceContact} day${row.daysSinceContact !== 1 ? "s" : ""}`
            }
          />
          <DrawerField
            label="Opportunity Value"
            value={
              row.opportunityValue > 0 ? (
                <span title={formatIDR(row.opportunityValue)}>
                  {formatIDRCompact(row.opportunityValue)}
                </span>
              ) : "—"
            }
          />
          <DrawerField label="Priority"       value={row.priority} />
        </div>

        <Separator />

        {/* Related data */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Related Activity
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Invoices</p>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                {row.totalInvoices} total
                {row.unpaidInvoices > 0 && (
                  <span className="text-amber-400 ml-1">· {row.unpaidInvoices} unpaid</span>
                )}
              </p>
              {row.overdueAmount > 0 && (
                <p className="text-xs text-red-400 mt-0.5"
                   title={formatIDR(row.overdueAmount)}>
                  {formatIDRCompact(row.overdueAmount)} overdue
                </p>
              )}
            </div>
            <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-3 py-2">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Open Tasks</p>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.openTasks}</p>
            </div>
            {row.unpreparedMeetings > 0 && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 col-span-2">
                <p className="text-[10px] text-amber-400">Upcoming unprepared meetings</p>
                <p className="text-sm font-semibold text-amber-400">{row.unpreparedMeetings}</p>
              </div>
            )}
          </div>
        </div>

        {/* Operational context */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Operational Context
          </p>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{contextNote}</p>
        </div>

        {/* IBM Bob handoff */}
        <BobHandoff
          suggestedCommand={`Handle ${row.customer_id}`}
          contextNote="OpsPilot AI can verify the account context and prepare the recommended follow-up in IBM Bob."
        />
      </div>
    </DetailDrawer>
  );
}

// ─── Summary KPI cards ────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: CustomerPageData }) {
  const cards = [
    { label: "Total Customers",    value: String(data.totalCustomers) },
    { label: "Active Customers",   value: String(data.activeCustomers) },
    { label: "Active Leads",       value: String(data.activeLeads) },
    {
      label: "Lead Opportunity Value",
      value: formatIDRCompact(data.leadOpportunityValue),
      tooltip: formatIDR(data.leadOpportunityValue),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
        >
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.label}</p>
          <p
            className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight tabular-nums"
            title={c.tooltip}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Sort header button ───────────────────────────────────────────────────────

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label:   string;
  sortKey: SortKey;
  current: SortKey;
  dir:     SortDir;
  onSort:  (k: SortKey) => void;
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
          ? dir === "asc"
            ? <ChevronUp className="h-3 w-3" />
            : <ChevronDown className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

// ─── Mobile card ─────────────────────────────────────────────────────────────

function CustomerCard({ row, onView }: { row: CustomerRow; onView: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <Card className="hover:border-white/15 transition-colors">
        <CardContent className="px-4 py-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.customer_name}</p>
              <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.customer_id}</p>
            </div>
            <InlineBadge label={row.status} cls={STATUS_CLS[row.status]} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <InlineBadge label={row.priority} cls={PRIORITY_CLS[row.priority]} />
            <span className={cn("text-xs", STATE_CLS[row.operationalState])}>{row.operationalState}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>Last contact: {row.lastContactFormatted}</span>
            {row.opportunityValue > 0 && (
              <span className="text-cyan-400 font-semibold" title={formatIDR(row.opportunityValue)}>
                {formatIDRCompact(row.opportunityValue)}
              </span>
            )}
          </div>
          <div className="flex justify-end pt-0.5">
            <Button variant="ghost" size="icon-sm" onClick={onView} aria-label={`View ${row.customer_name}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerTable({ data }: { data: CustomerPageData }) {
  const [statusFilter,   setStatusFilter]   = useState<CustomerStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<CustomerPriority | "all">("all");
  const [search,         setSearch]         = useState("");
  const [sortKey,        setSortKey]        = useState<SortKey>("opportunityValue");
  const [sortDir,        setSortDir]        = useState<SortDir>("desc");
  const [selected,       setSelected]       = useState<CustomerRow | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = data.rows.filter((r) => {
      if (statusFilter   !== "all" && r.status   !== statusFilter)   return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (q && !r.customer_name.toLowerCase().includes(q) && !r.customer_id.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(base, sortKey, sortDir);
  }, [data.rows, statusFilter, priorityFilter, search, sortKey, sortDir]);

  return (
    <>
      <CustomerDrawer row={selected} onClose={() => setSelected(null)} />

      <SummaryCards data={data} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(["all", "Active", "Lead"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === s
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
              )}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1">
          {(["all", "High", "Medium", "Low"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={priorityFilter === p}
              onClick={() => setPriorityFilter(p)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                priorityFilter === p
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
              )}
            >
              {p === "all" ? "All Priorities" : p}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <input
            type="search"
            placeholder="Search name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers"
            className="h-8 w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {filtered.length === 0
          ? "No customers match your filters."
          : `Showing ${filtered.length} of ${data.rows.length} customer${data.rows.length !== 1 ? "s" : ""}`}
      </p>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No customers found.</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Try adjusting your filters.</p>
          <Button variant="ghost" size="sm" className="mt-4"
            onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setSearch(""); }}>
            Reset filters
          </Button>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Customer list">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Customer</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Last Contact</th>
                <SortTh label="Days Inactive" sortKey="daysSinceContact" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Opportunity"   sortKey="opportunityValue"  current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Priority"      sortKey="priority"          current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">State</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((row) => (
                  <motion.tr
                    key={row.customer_id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{row.customer_name}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.customer_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InlineBadge label={row.status} cls={STATUS_CLS[row.status]} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {row.lastContactFormatted}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums text-[hsl(var(--muted-foreground))]">
                      {row.daysSinceContact === -1 ? "—" : `${row.daysSinceContact}d`}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-cyan-400 whitespace-nowrap">
                      {row.opportunityValue > 0 ? (
                        <span title={formatIDR(row.opportunityValue)}>
                          {formatIDRCompact(row.opportunityValue)}
                        </span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))] font-normal">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <InlineBadge label={row.priority} cls={PRIORITY_CLS[row.priority]} />
                    </td>
                    <td className={cn("px-4 py-3 text-xs font-medium", STATE_CLS[row.operationalState])}>
                      {row.operationalState}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={() => setSelected(row)}
                        aria-label={`View ${row.customer_name}`}
                      >
                        View <ArrowRight className="h-3 w-3" />
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
            {filtered.map((row) => (
              <CustomerCard key={row.customer_id} row={row} onView={() => setSelected(row)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
