import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckSquare } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { PageDataSkeleton, PageDataError } from "@/components/shared/page-data-states";
import { TasksMeetingsView } from "@/components/tasks/tasks-meetings-view";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveTasksPageData, deriveMeetingsPageData } from "@/lib/opspilot/metrics";

export const metadata: Metadata = { title: "Tasks & Meetings" };

async function TasksMeetingsContent() {
  let dataset;
  try {
    dataset = await fetchOpsPilotData();
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }

  const tasks    = deriveTasksPageData(dataset);
  const meetings = deriveMeetingsPageData(dataset);

  return <TasksMeetingsView tasks={tasks} meetings={meetings} />;
}

export default function TasksPage() {
  return (
    <PageShell>
      <PageHeader
        title="Tasks & Meetings"
        description="Open follow-ups, scheduled actions, and upcoming meetings."
        icon={CheckSquare}
      />
      <Suspense fallback={<PageDataSkeleton />}>
        <TasksMeetingsContent />
      </Suspense>
    </PageShell>
  );
}
