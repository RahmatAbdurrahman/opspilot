import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CATEGORY_ICON, OutcomeBadge } from "@/components/activity/activity-meta";
import type { ActivityRow } from "@/lib/opspilot/types";
import { formatRelativeTime } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface RecentActivityProps {
  entries: ActivityRow[];
}

export function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest OpsPilot actions and decisions</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul role="list" className="divide-y divide-[hsl(var(--border))]">
          {entries.map((entry) => {
            const Icon = CATEGORY_ICON[entry.actionCategory];
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                      {entry.humanReadableAction}
                    </span>
                    <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                      {entry.entityLabel}
                    </span>
                  </div>
                  {entry.recommendation && (
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                      {entry.recommendation}
                    </p>
                  )}
                </div>

                {/* Right: status + time */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <OutcomeBadge outcome={entry.outcome} label={entry.statusLabel} />
                  {entry.timestampIso ? (
                    <time
                      dateTime={entry.timestampIso}
                      className="text-[10px] text-[hsl(var(--muted-foreground))]"
                    >
                      {formatRelativeTime(entry.timestampIso)}
                    </time>
                  ) : (
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Unknown time</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
      <CardFooter className="justify-end border-t border-[hsl(var(--border))] pt-3">
        <Link
          href="/activity"
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View full history
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  );
}
