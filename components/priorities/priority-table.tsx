"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EntityDetailDrawer } from "./entity-detail-drawer";
import { type PriorityItem, type SeverityLevel, type PriorityEntityType } from "@/lib/opspilot/types";
import { formatIDRCompact, formatIDR } from "@/lib/opspilot/format";
import { Search, ArrowRight, Filter } from "lucide-react";

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_CONFIG: Record<SeverityLevel, { label: string; badge: string; dot: string }> = {
  critical: {
    label: "Critical",
    badge: "bg-red-500/15 text-red-400 border-red-500/25",
    dot:   "bg-red-500",
  },
  high: {
    label: "High",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    dot:   "bg-orange-500",
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dot:   "bg-amber-500",
  },
  low: {
    label: "Low",
    badge: "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
    dot:   "bg-gray-500",
  },
};

const ENTITY_LABELS: Record<PriorityEntityType | "all", string> = {
  all:      "All",
  customer: "Customer",
  invoice:  "Invoice",
  task:     "Task",
  meeting:  "Meeting",
};

// ─── Severity chip (for the filter bar) ──────────────────────────────────────

function SeverityChip({
  severity,
  count,
  active,
  onClick,
}: {
  severity: SeverityLevel | "all";
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const label = severity === "all" ? "All" : SEV_CONFIG[severity].label;
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150",
        active
          ? severity === "all"
            ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
            : SEV_CONFIG[severity as SeverityLevel].badge
          : "bg-transparent border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
      ].join(" ")}
      aria-pressed={active}
    >
      {severity !== "all" && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${active ? SEV_CONFIG[severity as SeverityLevel].dot : "bg-current opacity-50"}`}
        />
      )}
      {label}
      <span className={active ? "opacity-100" : "opacity-60"}>{count}</span>
    </button>
  );
}

// ─── Severity inline badge ────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const cfg = SEV_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Mobile card ─────────────────────────────────────────────────────────────

function PriorityCard({
  item,
  rank,
  onView,
}: {
  item: PriorityItem;
  rank: number;
  onView: (item: PriorityItem) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:border-white/15 transition-colors">
        <CardContent className="px-4 py-3.5 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] tabular-nums text-[hsl(var(--muted-foreground))] font-mono shrink-0">
                #{rank}
              </span>
              <code className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
                {item.entityId}
              </code>
              <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                {item.customer}
              </span>
            </div>
            <SeverityBadge severity={item.severity} />
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
            {item.issue}
          </p>

          {item.monetaryExposure !== null && (
            <p
              className="text-sm font-bold text-cyan-400"
              title={formatIDR(item.monetaryExposure)}
            >
              {formatIDRCompact(item.monetaryExposure)}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate flex-1">
              {item.recommendedAction}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onView(item)}
              aria-label={`View details for ${item.entityId}`}
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Desktop table row ────────────────────────────────────────────────────────

function PriorityRow({
  item,
  rank,
  onView,
}: {
  item: PriorityItem;
  rank: number;
  onView: (item: PriorityItem) => void;
}) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="group border-b border-[hsl(var(--border))] hover:bg-white/[0.02] transition-colors"
    >
      <td className="px-4 py-3 text-[11px] tabular-nums text-[hsl(var(--muted-foreground))] font-mono w-10">
        #{rank}
      </td>
      <td className="px-4 py-3">
        <code className="text-xs font-mono font-semibold text-[hsl(var(--foreground))]">
          {item.entityId}
        </code>
      </td>
      <td className="px-4 py-3 text-xs text-[hsl(var(--foreground))] max-w-[140px] truncate">
        {item.customer}
      </td>
      <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[200px]">
        <span className="line-clamp-2">{item.issue}</span>
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-cyan-400 whitespace-nowrap">
        {item.monetaryExposure !== null ? (
          <span title={formatIDR(item.monetaryExposure)}>
            {formatIDRCompact(item.monetaryExposure)}
          </span>
        ) : (
          <span className="text-[hsl(var(--muted-foreground))]">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <SeverityBadge severity={item.severity} />
      </td>
      <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[180px]">
        <span className="line-clamp-2">{item.recommendedAction}</span>
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs h-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onView(item)}
          aria-label={`View details for ${item.entityId}`}
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Button>
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PriorityTableProps {
  items: PriorityItem[];
}

export function PriorityTable({ items }: PriorityTableProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | "all">("all");
  const [entityFilter,   setEntityFilter]   = useState<PriorityEntityType | "all">("all");
  const [search,         setSearch]         = useState("");
  const [selected,       setSelected]       = useState<PriorityItem | null>(null);

  // Count per severity (from full list)
  const severityCounts = useMemo(() => {
    const counts: Record<SeverityLevel | "all", number> = {
      all: items.length, critical: 0, high: 0, medium: 0, low: 0,
    };
    for (const item of items) counts[item.severity]++;
    return counts;
  }, [items]);

  // Only show severity chips that have items
  const activeSeverities = useMemo<Array<SeverityLevel | "all">>(() => {
    const order: Array<SeverityLevel | "all"> = ["all", "critical", "high", "medium", "low"];
    return order.filter((s) => s === "all" || severityCounts[s] > 0);
  }, [severityCounts]);

  // Filtered + searched list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return items.filter((item) => {
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      if (entityFilter   !== "all" && item.entityType !== entityFilter) return false;
      if (q && !item.entityId.toLowerCase().includes(q) && !item.customer.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, severityFilter, entityFilter, search]);

  return (
    <>
      <EntityDetailDrawer item={selected} onClose={() => setSelected(null)} />

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Severity chips */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by severity">
          {activeSeverities.map((sev) => (
            <SeverityChip
              key={sev}
              severity={sev}
              count={severityCounts[sev]}
              active={severityFilter === sev}
              onClick={() => setSeverityFilter(sev)}
            />
          ))}
        </div>

        {/* Entity type + search row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden />
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Type:</span>
          </div>
          {(["all", "customer", "invoice", "task", "meeting"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEntityFilter(type)}
              aria-pressed={entityFilter === type}
              className={[
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                entityFilter === type
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                  : "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))] hover:border-white/20 hover:text-[hsl(var(--foreground))]",
              ].join(" ")}
            >
              {ENTITY_LABELS[type]}
            </button>
          ))}

          {/* Search */}
          <div className="relative ml-auto">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search ID or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search priorities"
              className="h-8 w-56 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Result count */}
      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {filtered.length === 0
          ? "No priorities match the current filters."
          : `Showing ${filtered.length} of ${items.length} operational ${items.length === 1 ? "item" : "items"}`}
      </p>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No priorities found.</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Try adjusting your filters.</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4"
            onClick={() => {
              setSeverityFilter("all");
              setEntityFilter("all");
              setSearch("");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}

      {/* Desktop table — hidden on mobile */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Operational priority queue">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                {["#", "Entity", "Customer", "Issue", "Exposure", "Severity", "Recommended Action", ""].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((item, idx) => (
                  <PriorityRow
                    key={item.id}
                    item={item}
                    rank={idx + 1}
                    onView={setSelected}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards — hidden on md+ */}
      {filtered.length > 0 && (
        <div className="lg:hidden space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((item, idx) => (
              <PriorityCard
                key={item.id}
                item={item}
                rank={idx + 1}
                onView={setSelected}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
