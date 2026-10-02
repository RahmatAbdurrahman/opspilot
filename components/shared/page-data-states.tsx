import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshDataButton } from "@/components/shared/refresh-data-button";
import { AlertTriangle } from "lucide-react";

/** Generic skeleton for pages with a summary-card row + table */
const SUMMARY_GRID: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

export function PageDataSkeleton({ summaryCards = 4 }: { summaryCards?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className={`grid grid-cols-2 gap-4 ${SUMMARY_GRID[summaryCards] ?? "sm:grid-cols-4"}`}>
        {Array.from({ length: summaryCards }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-3 w-24" /></CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-md" />
        ))}
        <Skeleton className="ml-auto h-8 w-52 rounded-md" />
      </div>
      {/* Table */}
      <div className="rounded-xl border border-[hsl(var(--border))] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-[hsl(var(--border))] last:border-0"
          >
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generic data-source error card */
export function PageDataError({ message }: { message: string }) {
  // Technical detail stays in the server log; the UI shows product language only.
  console.error("[OpsPilot] Operational data unavailable:", message);
  return (
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
  );
}
