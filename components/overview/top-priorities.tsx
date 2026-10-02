import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type PriorityItem, type SeverityLevel } from "@/lib/opspilot/types";
import { formatIDRCompact, formatIDR } from "@/lib/opspilot/format";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface TopPrioritiesProps {
  items: PriorityItem[];
}

const severityConfig: Record<
  SeverityLevel,
  { label: string; badgeClass: string; dotClass: string }
> = {
  critical: {
    label:      "Critical",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/25",
    dotClass:   "bg-red-500",
  },
  high: {
    label:      "High",
    badgeClass: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    dotClass:   "bg-orange-500",
  },
  medium: {
    label:      "Medium",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dotClass:   "bg-amber-500",
  },
  low: {
    label:      "Low",
    badgeClass: "bg-white/5 text-[hsl(var(--muted-foreground))] border-white/10",
    dotClass:   "bg-gray-500",
  },
};

export function TopPriorities({ items }: TopPrioritiesProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Priorities</CardTitle>
          <CardDescription>AI-ranked items requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
              <AlertTriangle className="h-5 w-5 text-emerald-400" aria-hidden />
            </div>
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">All clear</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              No critical items at this time.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Priorities</CardTitle>
        <CardDescription>
          {items.length} item{items.length !== 1 ? "s" : ""} requiring your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul role="list" className="divide-y divide-[hsl(var(--border))]">
          {items.map((item) => {
            const sev = severityConfig[item.severity];
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                {/* Severity dot */}
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sev.dotClass}`}
                  aria-label={sev.label}
                />

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">
                      {item.entityId}
                    </span>
                    <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate">
                      {item.customer}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium ${sev.badgeClass}`}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                    {item.issue}
                  </p>
                  {item.monetaryExposure !== null && (
                    <p
                      className="text-xs font-semibold text-cyan-400"
                      title={formatIDR(item.monetaryExposure)}
                    >
                      {formatIDRCompact(item.monetaryExposure)}
                    </p>
                  )}
                </div>

                {/* Right: action + link */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] text-right max-w-[160px] leading-snug">
                    {item.recommendedAction}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    asChild
                    aria-label={`View details for ${item.entityId}`}
                  >
                    <Link href={item.href}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
