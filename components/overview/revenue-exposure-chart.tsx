"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type RevenueExposureItem } from "@/lib/opspilot/types";
import { formatIDR, formatIDRCompact } from "@/lib/opspilot/format";

interface RevenueExposureChartProps {
  data: RevenueExposureItem[];
}

const BAR_COLORS = ["#ef4444", "#f59e0b", "#06b6d4"];

interface TooltipPayload {
  value: number;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--popover))] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-[hsl(var(--foreground))] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs text-[hsl(var(--muted-foreground))]">
          {formatIDR(p.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueExposureChart({ data }: RevenueExposureChartProps) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Exposure</CardTitle>
        <CardDescription>
          Overdue unpaid · Unpaid current · Lead pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
            No exposure data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: 0, bottom: 4 }}
              barSize={32}
            >
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatIDRCompact(v)}
                tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
