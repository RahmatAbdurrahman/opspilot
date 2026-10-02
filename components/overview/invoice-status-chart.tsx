"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { type InvoiceStatusItem } from "@/lib/opspilot/types";

interface InvoiceStatusChartProps {
  data: InvoiceStatusItem[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: InvoiceStatusItem }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--popover))] px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-[hsl(var(--foreground))]">{item.name}</p>
      <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.value} invoice{item.value !== 1 ? "s" : ""}</p>
    </div>
  );
}

interface LegendPayload {
  value: string;
  color: string;
}

function CustomLegend({ payload }: { payload?: LegendPayload[] }) {
  if (!payload) return null;
  return (
    <ul className="flex flex-col gap-1 mt-2">
      {payload.map((p) => (
        <li key={p.value} className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          {p.value}
        </li>
      ))}
    </ul>
  );
}

export function InvoiceStatusChart({ data }: InvoiceStatusChartProps) {
  const hasData = data.some((d) => d.value > 0);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Status</CardTitle>
        <CardDescription>
          {total} invoice{total !== 1 ? "s" : ""} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
            No invoices found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
