import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { PageDataError } from "@/components/shared/page-data-states";
import { PriorityTable } from "@/components/priorities/priority-table";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveAllPriorities } from "@/lib/opspilot/metrics";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "Priorities" };

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PrioritiesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      {/* Filter row */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
        <Skeleton className="ml-auto h-8 w-52 rounded-md" />
      </div>
      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
            <Skeleton className="h-3 w-6" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Error display ────────────────────────────────────────────────────────────

// ─── Data-fetching server component ──────────────────────────────────────────

async function PrioritiesContent() {
  let priorities;
  try {
    const dataset = await fetchOpsPilotData();
    priorities = deriveAllPriorities(dataset);
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }

  return <PriorityTable items={priorities} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrioritiesPage() {
  return (
    <PageShell>
      <div className="flex flex-col gap-1">
        <PageHeader
          title="Priorities"
          description="Operational items requiring attention."
          icon={AlertCircle}
        />
        <p className="text-xs text-[hsl(var(--muted-foreground))] pl-12">
          Ranked by operational priority — overdue invoices, at-risk leads, high-priority tasks,
          and unprepared meetings.
        </p>
      </div>

      <Suspense fallback={<PrioritiesSkeleton />}>
        <PrioritiesContent />
      </Suspense>
    </PageShell>
  );
}
