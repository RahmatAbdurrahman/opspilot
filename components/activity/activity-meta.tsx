import { CalendarDays, FileText, Mail, Cpu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityCategory, ActivityOutcome } from "@/lib/opspilot/types";

/**
 * Presentation helpers shared by /activity and the Overview Recent Activity card.
 * Server-safe (no hooks). All labels come from lib/opspilot/activity.ts.
 */

export const CATEGORY_ICON: Record<ActivityCategory, LucideIcon> = {
  Draft:    FileText,
  Email:    Mail,
  Calendar: CalendarDays,
  System:   Cpu,
};

const OUTCOME_CLS: Record<ActivityOutcome, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  issue:   "bg-red-500/15 text-red-400 border-red-500/25",
  unknown: "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
};

export function OutcomeBadge({
  outcome,
  label,
  className,
}: {
  outcome: ActivityOutcome;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        OUTCOME_CLS[outcome],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CategoryLabel({ category }: { category: ActivityCategory }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
      <Icon className="h-3 w-3" aria-hidden />
      {category}
    </span>
  );
}
