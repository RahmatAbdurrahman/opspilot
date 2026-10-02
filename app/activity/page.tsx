import type { Metadata } from "next";
import { Suspense } from "react";
import { Activity, Info } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { PageDataSkeleton, PageDataError } from "@/components/shared/page-data-states";
import { ActivityView } from "@/components/activity/activity-view";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveActivityPageData } from "@/lib/opspilot/activity";

export const metadata: Metadata = { title: "Activity" };

async function ActivityContent() {
  let dataset;
  try {
    dataset = await fetchOpsPilotData();
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }

  return <ActivityView data={deriveActivityPageData(dataset)} />;
}

export default function ActivityPage() {
  return (
    <PageShell>
      <PageHeader
        title="Activity"
        description="Audit trail of OpsPilot recommendations and executed actions."
        icon={Activity}
        actions={
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Info className="h-3 w-3 shrink-0 text-cyan-400" aria-hidden />
            Activity records reflect confirmed OpsPilot system events.
          </p>
        }
      />
      <Suspense fallback={<PageDataSkeleton />}>
        <ActivityContent />
      </Suspense>
    </PageShell>
  );
}
