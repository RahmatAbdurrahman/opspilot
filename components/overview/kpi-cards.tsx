import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type KpiData } from "@/lib/opspilot/types";
import { formatIDRCompact, formatIDR } from "@/lib/opspilot/format";
import { DollarSign, AlertCircle, CheckSquare, TrendingUp } from "lucide-react";

interface KpiCardsProps {
  kpis: KpiData;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const cards = [
    {
      label:   "Revenue at Risk",
      value:   formatIDRCompact(kpis.revenueAtRisk),
      tooltip: formatIDR(kpis.revenueAtRisk),
      sub:     "overdue unpaid invoices",
      variant: "destructive" as const,
      icon:    DollarSign,
    },
    {
      label:   "Attention Items",
      value:   String(kpis.criticalItems),
      tooltip: "Overdue invoices + actionable open tasks + upcoming unprepared meetings",
      sub:     "require follow-up",
      variant: "warning" as const,
      icon:    AlertCircle,
    },
    {
      label:   "Open Tasks",
      value:   String(kpis.openTasks),
      tooltip: `${kpis.openHighPriorityTasks} high priority`,
      sub:     kpis.openHighPriorityTasks > 0
        ? `${kpis.openHighPriorityTasks} high priority`
        : "no high-priority tasks",
      variant: kpis.openHighPriorityTasks > 0 ? ("warning" as const) : ("secondary" as const),
      icon:    CheckSquare,
    },
    {
      label:   "Active Opportunities",
      value:   formatIDRCompact(kpis.activeOpportunities),
      tooltip: formatIDR(kpis.activeOpportunities),
      sub:     "lead pipeline value",
      variant: "success" as const,
      icon:    TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="hover:border-white/15 transition-colors"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{card.label}</CardDescription>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(var(--secondary))]">
                  <Icon className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" aria-hidden />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p
                className="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight tabular-nums"
                title={card.tooltip}
              >
                {card.value}
              </p>
              <div className="mt-1.5">
                <Badge variant={card.variant}>{card.sub}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
