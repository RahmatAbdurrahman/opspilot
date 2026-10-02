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
  type TaskRow,
  type TaskPageSummary,
  type MeetingRow,
  type MeetingPageSummary,
  type TaskScheduleState,
  type MeetingProximity,
  type TaskPriority,
  type TaskStatus,
  type PrepStatus,
} from "@/lib/opspilot/types";
import { Search, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Visual config ────────────────────────────────────────────────────────────

const SCHEDULE_CLS: Record<TaskScheduleState, string> = {
  "Overdue":      "bg-red-500/15 text-red-400 border-red-500/25",
  "Due today":    "bg-amber-500/15 text-amber-400 border-amber-500/25",
  "Due tomorrow": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "Upcoming":     "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "No deadline":  "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

const PRIORITY_CLS: Record<TaskPriority, string> = {
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Low:    "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

const STATUS_CLS: Record<TaskStatus, string> = {
  Open:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Cancelled: "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

const PREP_CLS: Record<PrepStatus, string> = {
  "Prepared":     "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  "Not Prepared": "bg-amber-500/15 text-amber-400 border-amber-500/25",
};

const PROXIMITY_CLS: Record<MeetingProximity, string> = {
  Past:     "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
  Today:    "bg-amber-500/15 text-amber-400 border-amber-500/25",
  Tomorrow: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Upcoming: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Unknown:  "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

function InlineBadge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap", cls)}>
      {label}
    </span>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
  tabs,
}: {
  active: string;
  onChange: (t: string) => void;
  tabs: { id: string; label: string; count?: number }[];
}) {
  return (
    <div className="flex gap-1 border-b border-[hsl(var(--border))] mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            active === tab.id
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "ml-1.5 inline-flex items-center rounded-full px-1.5 text-[10px] font-semibold",
              active === tab.id ? "bg-cyan-500/20 text-cyan-400" : "bg-white/8 text-[hsl(var(--muted-foreground))]",
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({
  tasks,
  meetings,
}: {
  tasks: TaskPageSummary;
  meetings: MeetingPageSummary;
}) {
  const cards = [
    { label: "Open Tasks",          value: String(tasks.openCount) },
    { label: "Overdue Tasks",        value: String(tasks.overdueCount) },
    { label: "Upcoming Meetings",    value: String(meetings.upcomingCount) },
    { label: "Upcoming Not Prepared", value: String(meetings.notPreparedCount) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-3"
        >
          <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.label}</p>
          <p className="mt-1 text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight tabular-nums">
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Sort helper ──────────────────────────────────────────────────────────────

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

function SearchInput({ value, onChange, placeholder, label }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string;
}) {
  return (
    <div className="relative ml-auto">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-8 w-52 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] pl-8 pr-3 text-xs text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-colors"
      />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-[hsl(var(--border))] py-16 text-center">
      <p className="text-sm font-medium text-[hsl(var(--foreground))]">No results found.</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{message}</p>
      <Button variant="ghost" size="sm" className="mt-4" onClick={onReset}>Reset filters</Button>
    </div>
  );
}

// ─── TASKS DRAWER ─────────────────────────────────────────────────────────────

function TaskDrawer({ row, onClose }: { row: TaskRow | null; onClose: () => void }) {
  if (!row) return null;
  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={row.task_id}
      subtitle={row.task}
      badge={<InlineBadge label={row.scheduleState} cls={SCHEDULE_CLS[row.scheduleState]} />}
    >
      <div className="px-5 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Task ID"     value={<code className="font-mono text-xs">{row.task_id}</code>} />
          <DrawerField label="Customer"    value={row.customerName} />
          <DrawerField label="Deadline"    value={row.deadlineFormatted} />
          <DrawerField label="Schedule"    value={<InlineBadge label={row.scheduleState} cls={SCHEDULE_CLS[row.scheduleState]} />} />
          <DrawerField label="Priority"    value={<InlineBadge label={row.priority}       cls={PRIORITY_CLS[row.priority]} />} />
          <DrawerField label="Status"      value={<InlineBadge label={row.status}         cls={STATUS_CLS[row.status]} />} />
        </div>

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Task
          </p>
          <p className="text-sm text-[hsl(var(--foreground))]">{row.task}</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Operational Context
          </p>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{row.contextNote}</p>
        </div>

        <BobHandoff
          suggestedCommand={row.task_id}
          executionCommand={`CREATE ${row.task_id}`}
          executionLabel="Create calendar event"
          contextNote="Calendar actions are executed through IBM Bob with human approval."
        />
      </div>
    </DetailDrawer>
  );
}

// ─── TASKS TABLE ──────────────────────────────────────────────────────────────

type TaskSortKey = "deadline" | "priority" | "overdue";

const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = { High: 0, Medium: 1, Low: 2 };

function sortTasks(rows: TaskRow[], key: TaskSortKey, dir: SortDir): TaskRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (key === "deadline") {
      // More overdue = lower daysUntil = earlier: sort by daysOverdue desc for overdue, asc for upcoming
      diff = a.daysOverdue - b.daysOverdue;
    } else if (key === "priority") {
      diff = TASK_PRIORITY_ORDER[a.priority] - TASK_PRIORITY_ORDER[b.priority];
    } else if (key === "overdue") {
      diff = a.daysOverdue - b.daysOverdue;
    }
    return dir === "asc" ? diff : -diff;
  });
}

function TasksView({ data }: { data: TaskPageSummary }) {
  const [statusFilter,   setStatusFilter]   = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "Overdue" | "Due today" | "Upcoming">("all");
  const [search,         setSearch]         = useState("");
  const [sortKey,        setSortKey]        = useState<TaskSortKey>("deadline");
  const [sortDir,        setSortDir]        = useState<SortDir>("asc");
  const [selected,       setSelected]       = useState<TaskRow | null>(null);

  function handleSort(k: TaskSortKey) {
    if (k === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = data.rows.filter((r) => {
      if (statusFilter   !== "all" && r.status   !== statusFilter)   return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      if (scheduleFilter !== "all") {
        if (scheduleFilter === "Upcoming" && r.scheduleState !== "Upcoming" && r.scheduleState !== "Due tomorrow") return false;
        else if (scheduleFilter !== "Upcoming" && r.scheduleState !== scheduleFilter) return false;
      }
      if (q && !r.task_id.toLowerCase().includes(q) && !r.task.toLowerCase().includes(q) && !r.customerName.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortTasks(base, sortKey, sortDir);
  }, [data.rows, statusFilter, priorityFilter, scheduleFilter, search, sortKey, sortDir]);

  function resetFilters() {
    setStatusFilter("all");
    setPriorityFilter("all");
    setScheduleFilter("all");
    setSearch("");
  }

  return (
    <>
      <TaskDrawer row={selected} onClose={() => setSelected(null)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-wrap">
          {(["all", "Open", "Completed"] as const).map((s) => (
            <FilterBtn key={s} label={s === "all" ? "All Status" : s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "High", "Medium", "Low"] as const).map((p) => (
            <FilterBtn key={p} label={p === "all" ? "All Priority" : p} active={priorityFilter === p} onClick={() => setPriorityFilter(p)} />
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "Overdue", "Due today", "Upcoming"] as const).map((s) => (
            <FilterBtn key={s} label={s === "all" ? "All Schedule" : s} active={scheduleFilter === s} onClick={() => setScheduleFilter(s)} />
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Task ID, title, customer…" label="Search tasks" />
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {filtered.length === 0
          ? "No tasks match your filters."
          : `Showing ${filtered.length} of ${data.rows.length} task${data.rows.length !== 1 ? "s" : ""}`}
      </p>

      {filtered.length === 0 && <EmptyState message="Try adjusting your filters." onReset={resetFilters} />}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Task list">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Task</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Customer</th>
                <SortTh label="Deadline"       sortKey={"deadline" as TaskSortKey} current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Schedule</th>
                <SortTh label="Priority"       sortKey={"priority" as TaskSortKey} current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((row) => (
                  <motion.tr
                    key={row.task_id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] max-w-[200px] line-clamp-2">{row.task}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.task_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[120px] truncate">{row.customerName}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.deadlineFormatted}</td>
                    <td className="px-4 py-3"><InlineBadge label={row.scheduleState} cls={SCHEDULE_CLS[row.scheduleState]} /></td>
                    <td className="px-4 py-3"><InlineBadge label={row.priority}      cls={PRIORITY_CLS[row.priority]} /></td>
                    <td className="px-4 py-3"><InlineBadge label={row.status}        cls={STATUS_CLS[row.status]} /></td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                        aria-label={`View ${row.task_id}`}
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
              <motion.div key={row.task_id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Card className="hover:border-white/15 transition-colors">
                  <CardContent className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))] line-clamp-2">{row.task}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.task_id}</p>
                      </div>
                      <InlineBadge label={row.scheduleState} cls={SCHEDULE_CLS[row.scheduleState]} />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <InlineBadge label={row.priority} cls={PRIORITY_CLS[row.priority]} />
                      <InlineBadge label={row.status}   cls={STATUS_CLS[row.status]} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                      <span>{row.customerName}</span>
                      <span>{row.deadlineFormatted}</span>
                    </div>
                    <div className="flex justify-end pt-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelected(row)} aria-label={`View ${row.task_id}`}>
                        <ArrowRight className="h-3.5 w-3.5" />
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

// ─── MEETINGS DRAWER ──────────────────────────────────────────────────────────

function MeetingDrawer({ row, onClose }: { row: MeetingRow | null; onClose: () => void }) {
  if (!row) return null;

  const isPast     = row.proximity === "Past";
  const isUnprepared = row.prepStatus === "Not Prepared" && !isPast;

  const recommendedAction = isPast
    ? "Historical meeting — no new calendar preparation action required."
    : row.prepStatus === "Prepared"
    ? "No preparation action required."
    : "Prepare for meeting.";

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={row.meeting_id}
      subtitle={row.meeting}
      badge={<InlineBadge label={row.prepStatus} cls={PREP_CLS[row.prepStatus]} />}
    >
      <div className="px-5 py-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <DrawerField label="Meeting ID"   value={<code className="font-mono text-xs">{row.meeting_id}</code>} />
          <DrawerField label="Customer"     value={row.customerName} />
          <DrawerField label="Title"        value={row.meeting} />
          <DrawerField label="Date"         value={row.dateFormatted} />
          <DrawerField label="Local Time"   value={row.timeLocal} />
          <DrawerField label="Preparation"  value={<InlineBadge label={row.prepStatus} cls={PREP_CLS[row.prepStatus]} />} />
          <DrawerField label="Proximity"    value={<InlineBadge label={row.proximity}  cls={PROXIMITY_CLS[row.proximity]} />} />
        </div>

        <Separator />

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Operational Context
          </p>
          <p className="text-xs text-[hsl(var(--foreground))] leading-relaxed">{row.contextNote}</p>
        </div>

        <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
            Recommended Action
          </p>
          <p className="text-xs text-[hsl(var(--foreground))]">{recommendedAction}</p>
        </div>

        {!isPast && (
          <BobHandoff
            suggestedCommand={row.meeting_id}
            executionCommand={isUnprepared ? `CREATE ${row.meeting_id}` : undefined}
            executionLabel={isUnprepared ? "Create calendar event" : undefined}
            contextNote="Calendar actions are executed through IBM Bob with human approval."
          />
        )}
      </div>
    </DetailDrawer>
  );
}

// ─── MEETINGS TABLE ───────────────────────────────────────────────────────────

type MeetingSortKey = "date" | "prep";

function sortMeetings(rows: MeetingRow[], key: MeetingSortKey, dir: SortDir): MeetingRow[] {
  return [...rows].sort((a, b) => {
    let diff = 0;
    if (key === "date") {
      const av = a.daysAway ?? 9999;
      const bv = b.daysAway ?? 9999;
      diff = av - bv;
    } else if (key === "prep") {
      diff = a.prepStatus.localeCompare(b.prepStatus);
    }
    return dir === "asc" ? diff : -diff;
  });
}

function MeetingsView({ data }: { data: MeetingPageSummary }) {
  const [prepFilter,  setPrepFilter]  = useState<PrepStatus | "all">("all");
  const [proxFilter,  setProxFilter]  = useState<MeetingProximity | "all">("all");
  const [search,      setSearch]      = useState("");
  const [sortKey,     setSortKey]     = useState<MeetingSortKey>("date");
  const [sortDir,     setSortDir]     = useState<SortDir>("asc");
  const [selected,    setSelected]    = useState<MeetingRow | null>(null);

  function handleSort(k: MeetingSortKey) {
    if (k === sortKey) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = data.rows.filter((r) => {
      if (prepFilter !== "all"  && r.prepStatus !== prepFilter)  return false;
      if (proxFilter !== "all"  && r.proximity  !== proxFilter)  return false;
      if (q && !r.meeting_id.toLowerCase().includes(q) && !r.meeting.toLowerCase().includes(q) && !r.customerName.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortMeetings(base, sortKey, sortDir);
  }, [data.rows, prepFilter, proxFilter, search, sortKey, sortDir]);

  function resetFilters() { setPrepFilter("all"); setProxFilter("all"); setSearch(""); }

  return (
    <>
      <MeetingDrawer row={selected} onClose={() => setSelected(null)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-wrap">
          {(["all", "Not Prepared", "Prepared"] as const).map((p) => (
            <FilterBtn key={p} label={p === "all" ? "All Readiness" : p} active={prepFilter === p} onClick={() => setPrepFilter(p)} />
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["all", "Today", "Tomorrow", "Upcoming", "Past"] as const).map((p) => (
            <FilterBtn key={p} label={p === "all" ? "All Time" : p} active={proxFilter === p} onClick={() => setProxFilter(p)} />
          ))}
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Meeting ID, title, customer…" label="Search meetings" />
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))]">
        {filtered.length === 0
          ? "No meetings match your filters."
          : `Showing ${filtered.length} of ${data.rows.length} meeting${data.rows.length !== 1 ? "s" : ""}`}
      </p>

      {filtered.length === 0 && <EmptyState message="Try adjusting your filters." onReset={resetFilters} />}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden lg:block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
          <table className="w-full text-left" aria-label="Meeting list">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-white/[0.02]">
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Meeting</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Customer</th>
                <SortTh label="Date"      sortKey={"date" as MeetingSortKey} current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Time</th>
                <SortTh label="Readiness" sortKey={"prep" as MeetingSortKey} current={sortKey} dir={sortDir} onSort={handleSort} />
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Proximity</th>
                <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map((row) => (
                  <motion.tr
                    key={row.meeting_id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs font-medium text-[hsl(var(--foreground))] max-w-[180px] line-clamp-2">{row.meeting}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.meeting_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] max-w-[120px] truncate">{row.customerName}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.dateFormatted}</td>
                    <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">{row.timeLocal}</td>
                    <td className="px-4 py-3"><InlineBadge label={row.prepStatus} cls={PREP_CLS[row.prepStatus]} /></td>
                    <td className="px-4 py-3"><InlineBadge label={row.proximity}  cls={PROXIMITY_CLS[row.proximity]} /></td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                        aria-label={`View ${row.meeting_id}`}
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
              <motion.div key={row.meeting_id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <Card className="hover:border-white/15 transition-colors">
                  <CardContent className="px-4 py-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[hsl(var(--foreground))] line-clamp-2">{row.meeting}</p>
                        <p className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{row.meeting_id}</p>
                      </div>
                      <InlineBadge label={row.prepStatus} cls={PREP_CLS[row.prepStatus]} />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <InlineBadge label={row.proximity} cls={PROXIMITY_CLS[row.proximity]} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                      <span>{row.customerName}</span>
                      <span>{row.dateFormatted} {row.timeLocal !== "—" ? `· ${row.timeLocal}` : ""}</span>
                    </div>
                    <div className="flex justify-end pt-0.5">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelected(row)} aria-label={`View ${row.meeting_id}`}>
                        <ArrowRight className="h-3.5 w-3.5" />
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

// ─── Root export ──────────────────────────────────────────────────────────────

export function TasksMeetingsView({
  tasks,
  meetings,
}: {
  tasks:    TaskPageSummary;
  meetings: MeetingPageSummary;
}) {
  const [activeTab, setActiveTab] = useState("tasks");

  const tabs = [
    { id: "tasks",    label: "Tasks",    count: tasks.rows.length },
    { id: "meetings", label: "Meetings", count: meetings.rows.length },
  ];

  return (
    <>
      <SummaryCards tasks={tasks} meetings={meetings} />

      <TabBar active={activeTab} onChange={setActiveTab} tabs={tabs} />

      {activeTab === "tasks"    && <TasksView    data={tasks} />}
      {activeTab === "meetings" && <MeetingsView data={meetings} />}
    </>
  );
}
