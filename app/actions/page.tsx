import type { Metadata } from "next";
import { Suspense } from "react";
import { Zap, Info } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { PageDataSkeleton, PageDataError } from "@/components/shared/page-data-states";
import { ActionCenterView } from "@/components/actions/action-center-view";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveActionCenterData } from "@/lib/opspilot/metrics";

export const metadata: Metadata = { title: "Action Center" };

async function ActionCenterContent() {
  let dataset;
  try {
    dataset = await fetchOpsPilotData();
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }

  const data = deriveActionCenterData(dataset);

  return <ActionCenterView data={data} />;
}

export default function ActionsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Action Center"
        description="Review recommended actions and continue securely in IBM Bob."
        icon={Zap}
        actions={
          <p className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] px-2.5 py-1 text-[11px] text-[hsl(var(--muted-foreground))]">
            <Info className="h-3 w-3 shrink-0 text-cyan-400" aria-hidden />
            External actions require human approval in IBM Bob.
          </p>
        }
      />
      <Suspense fallback={<PageDataSkeleton />}>
        <ActionCenterContent />
      </Suspense>
    </PageShell>
  );
}
