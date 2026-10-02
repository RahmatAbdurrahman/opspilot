import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCards } from "@/components/overview/kpi-cards";
import { TopPriorities } from "@/components/overview/top-priorities";
import { RevenueExposureChart } from "@/components/overview/revenue-exposure-chart";
import { InvoiceStatusChart } from "@/components/overview/invoice-status-chart";
import { RecentActivity } from "@/components/overview/recent-activity";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshDataButton } from "@/components/shared/refresh-data-button";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import {
  deriveKpis,
  deriveTopPriorities,
  deriveRevenueExposure,
  deriveInvoiceStatus,
  deriveRecentActivity,
} from "@/lib/opspilot/metrics";
import { LayoutDashboard, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "Overview" };

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-32 mt-1" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Priorities */}
      <Card>
        <CardHeader>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-2.5 w-48 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Error display ────────────────────────────────────────────────────────────

function OverviewError({ message }: { message: string }) {
  // Technical detail stays in the server log; the UI shows product language only.
  console.error("[OpsPilot] Operational data unavailable:", message);
  return (
    <div className="flex flex-col gap-6 p-6 flex-1">
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden />
          </div>
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
              Operational data is temporarily unavailable.
            </p>
          </div>
          <RefreshDataButton label="Retry" ariaLabel="Retry loading operational data" variant="outline" compact={false} />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main data-fetching server component ─────────────────────────────────────

async function OverviewContent() {
  let dataset;
  try {
    dataset = await fetchOpsPilotData();
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <OverviewError message={message} />;
  }

  const kpis             = deriveKpis(dataset);
  const priorities       = deriveTopPriorities(dataset, 5);
  const revenueExposure  = deriveRevenueExposure(dataset);
  const invoiceStatus    = deriveInvoiceStatus(dataset);
  const recentActivity   = deriveRecentActivity(dataset, 5);

  return (
    <PageShell>
      {/* KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueExposureChart data={revenueExposure} />
        </div>
        <InvoiceStatusChart data={invoiceStatus} />
      </div>

      {/* Top Priorities */}
      <TopPriorities items={priorities} />

      {/* Recent Activity */}
      <RecentActivity entries={recentActivity} />
    </PageShell>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  return (
    <div className="flex flex-col">
      {/* Page header sits outside Suspense so it's always visible */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <PageHeader
          title="Revenue Overview"
          description="Know what needs attention and act on it faster."
          icon={LayoutDashboard}
        />
      </div>

      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
