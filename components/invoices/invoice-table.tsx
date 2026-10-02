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
  type InvoiceRow,
  type InvoicePageData,
  type InvoicePaymentState,
  type CustomerPriority,
} from "@/lib/opspilot/types";
import { formatIDRCompact, formatIDR } from "@/lib/opspilot/format";
import { Search, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Payment state badge ──────────────────────────────────────────────────────

const STATE_CLS: Record<InvoicePaymentState, string> = {
  Paid:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Current: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Overdue: "bg-red-500/15 text-red-400 border-red-500/25",
};

const PRIORITY_CLS: Record<CustomerPriority, string> = {
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Low:    "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

function InlineBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", cls)}>
      {label}
    </span>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "amount" | "daysOverdue" | "dueDate";
type SortDir = "asc" | "desc";

function sortRows(rows: InvoiceRow[], key: SortKey, dir: SortDir): InvoiceRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (key === "amount")     diff = a.amount - b.amount;
    if (key === "daysOverdue") diff = a.daysOverdue - b.daysOverdue;
    if (key === "dueDate") {
      // Sort by raw formatted string comparison is unreliable; we use index position
      // The rows already carry daysOverdue: more overdue = earlier date
      diff = b.daysOverdue - a.daysOverdue;
    }
    return dir === "asc" ? diff : -diff;
  });
}

// ─── Recommended action (deterministic) ──────────────────────────────────────

function recommendedAction(row: InvoiceRow): string {
  if (row.paymentState === "Paid")    return "No follow-up required.";
  if (row.paymentState === "Overdue") return "Prepare payment reminder and send via IBM Bob.";
  return "Monitor until due date. No immediate action required.";
}

// ─── Invoice detail drawer ────────────────────────────────────────────────────

function InvoiceDrawer({
  row,
  onClose,
}: {
  row: InvoiceRow | null;
  onClose: () => void;
}) {
  if (!row) return null;
  const action = recommendedAction(row);
  const isOverdue = row.paymentState === "Overdue";
  const isPaid    = row.paymentState === "Paid";

  return (
    <DetailDrawer
      open={!!row}
      onClose={onClose}
      title={row.invoice_id}
      subtitle={row.customerName}
      badge={<InlineBadge label={row.paymentState} cls={STATE_CLS[row.paymentState]} />}
    >
      <div className="px-5 py-5 space-y-6">
        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Invoice ID"  value={<code className="font-mono text-xs">{row.invoice_id}</code>} />
          <DrawerField label="Customer"    value={row.customerName} />
          {row.customerEmail && (
            <DrawerField
              label="Customer Email"
              value={
                <a href={`mailto:${row.customerEmail}`} className="text-cyan-400 hover:underline break-all">
                  {row.customerEmail}
                </a>
              }
            />
          )}
          <DrawerField label="Customer Priority" value={<InlineBadge label={row.customerPriority} cls={PRIORITY_CLS[row.customerPriority]} />} />
          <DrawerField
            label="Amount"
            value={
              <span title={formatIDR(row.amount)}>
                <span className="text-base font-bold text-[hsl(var(--foreground))]">
                  {formatIDRCompact(row.amount)}
                </span>
                <span className="text-[11px] text-[hsl(var(--muted-foreground))] ml-1">
                  ({formatIDR(row.amount)})
                </span>
              </span>
            }
          />
          <DrawerField label="Due Date"      value={row.dueDateFormatted} />
          <DrawerField label="Payment Status" value={row.status} />
          <DrawerField
            label="Payment State"
            value={<InlineBadge label={row.paymentState} cls={STATE_CLS[row.paymentState]} />}
          />
          {isOverdue && (
            <DrawerField
              label="Days Overdue"
              value={
                <span className="text-red-400 font-semibold">
                  {row.daysOverdue} day{row.daysOverdue !== 1 ? "s" : ""}
                </span>
              }
            />
          )}
        </div>

        <Separator />

        {/* Recommended action */}
        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Recommended Action
          </p>
          <p className="text-sm text-[hsl(var(--foreground))]">{action}</p>
        </div>

        {/* IBM Bob handoff — only for unpaid invoices */}
        {!isPaid && (
          <BobHandoff
            suggestedCommand={`Handle ${row.invoice_id}`}
            executionCommand={isOverdue ? `SEND ${row.invoice_id}` : undefined}
            executionLabel={isOverdue ? "Send prepared Gmail draft" : undefined}
            contextNote="The email draft is prepared and external sending requires human approval in IBM Bob."
          />
        )}
      </div>
    </DetailDrawer>
  );
}

// ─── Summary KPI cards ────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: InvoicePageData }) {
  const cards = [
    { label: "Total Invoices",  value: String(data.totalInvoices) },
    { label: "Unpaid Amount",   value: formatIDRCompact(data.unpaidAmount),  tooltip: formatIDR(data.unpaidAmount) },
    { label: "Overdue Amount",  value: formatIDRCompact(data.overdueAmount), tooltip: formatIDR(data.overdueAmount) },
    { label: "Overdue Invoices", value: String(data.overdueCount) },
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

// ─── Sort header ──────────────────────────────────────────────────────────────

function SortTh({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th scope="col" className="px-4 py-2.5 text-left cursor-pointer select-none" onClick={() => onSort(sortKey)}>
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">
        {label}
        {active
          ? dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          : <ChevronDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "Paid" | "Unpaid" | "Overdue";

function FilterTab({
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

// ─── Mobile card ─────────────────────────────────────────────────────────────

function InvoiceCard({ row, onView }: { row: InvoiceRow; onView: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <Card className="hover:border-white/15 transition-colors">
        <CardContent className="px-4 py-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{row.invoice_id}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{row.customerName}</p>
            </div>
            <InlineBadge label={row.paymentState} cls={STATE_CLS[row.paymentState]} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[hsl(var(--muted-foreground))]">Due {row.dueDateFormatted}</span>
            <span className="font-bold text-[hsl(var(--foreground))]" title={formatIDR(row.amount)}>
              {formatIDRCompact(row.amount)}
            </span>
          </div>
          {row.daysOverdue > 0 && (
            <p className="text-xs text-red-400">{row.daysOverdue} day{row.daysOverdue !== 1 ? "s" : ""} overdue</p>
          )}
          <div className="flex justify-end pt-0.5">
            <Button variant="ghost" size="icon-sm" onClick={onView} aria-label={`View ${row.invoice_id}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InvoiceTable({ data }: { data: InvoicePageData }) {
  const [tab,      setTab]      = useState<FilterTab>("all");
  const [search,   setSearch]   = useState("");
  const [sortKey,  setSortKey]  = useState<SortKey>("daysOverdue");
  const [sortDir,  setSortDir]  = useState<SortDir>("desc");
  const [selected, setSelected] = useState<InvoiceRow | null>(null);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = data.rows.filter((r) => {
      if (tab === "Paid"    && r.paymentState !== "Paid")    return false;
      if (tab === "Unpaid"  && r.status        !== "Unpaid") return false;
      if (tab === "Overdue" && r.paymentState !== "Overdue") return false;
      if (q && !r.invoice_id.toLowerCase().includes(q) && !r.customerName.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(base, sortKey, sortDir);
  }, [data.rows, tab, search, sortKey, sortDir]);

  return (
    <>
      <InvoiceDrawer row={selected} onClose={() => setSelected(null)} />

      <SummaryCards data={data} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {(["all", "Paid", "Unpaid", "Overdue"] as const).map((t) => (
            <FilterTab key={t} label={t === "all" ? "All" : t} active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden />
          <input
            type="search"
            placeholder="Search invoice or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search invoices"
            className="h-8 w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {filtered.length === 0
          ? "No invoices match your filters."
          : `Showing ${filtered.length} of ${data.rows.length} invoice${data.rows.length !== 1 ? "s" : ""}`}
      </p>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No invoices found.</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Try adjusting your filters.</p>
          <Button variant="ghost" size="sm" className="mt-4"
            onClick={() => { setTab("all"); setSearch(""); }}>
            Reset filters
          </Button>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Invoice list">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Invoice</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Customer</th>
                <SortTh label="Amount"      sortKey="amount"      current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Due Date"    sortKey="dueDate"     current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Payment State</th>
                <SortTh label="Days Overdue" sortKey="daysOverdue" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((row) => (
                  <motion.tr
                    key={row.invoice_id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="group border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
                        {row.invoice_id}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--foreground))] max-w-[140px] truncate">
                      {row.customerName}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[hsl(var(--foreground))] whitespace-nowrap">
                      <span title={formatIDR(row.amount)}>{formatIDRCompact(row.amount)}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {row.dueDateFormatted}
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">
                      {row.status}
                    </td>
                    <td className="px-4 py-3">
                      <InlineBadge label={row.paymentState} cls={STATE_CLS[row.paymentState]} />
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums">
                      {row.daysOverdue > 0 ? (
                        <span className="text-red-400">{row.daysOverdue}d</span>
                      ) : (
                        <span className="text-[hsl(var(--muted-foreground))]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={() => setSelected(row)}
                        aria-label={`View ${row.invoice_id}`}
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
              <InvoiceCard key={row.invoice_id} row={row} onView={() => setSelected(row)} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
