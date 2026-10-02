import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { PageDataSkeleton, PageDataError } from "@/components/shared/page-data-states";
import { CustomerTable } from "@/components/customers/customer-table";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveCustomerPageData } from "@/lib/opspilot/metrics";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Customers" };

async function CustomersContent() {
  let data;
  try {
    const dataset = await fetchOpsPilotData();
    data = deriveCustomerPageData(dataset);
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }
  return <CustomerTable data={data} />;
}

export default function CustomersPage() {
  return (
    <PageShell>
      <PageHeader
        title="Customers"
        description="Account health, engagement, and revenue opportunity."
        icon={Users}
      />
      <Suspense fallback={<PageDataSkeleton summaryCards={4} />}>
        <CustomersContent />
      </Suspense>
    </PageShell>
  );
}
