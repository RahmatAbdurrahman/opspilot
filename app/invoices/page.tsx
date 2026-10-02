import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { PageHeader } from "@/components/shared/page-header";
import { PageDataSkeleton, PageDataError } from "@/components/shared/page-data-states";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { fetchOpsPilotData, fetchErrorMessage } from "@/lib/opspilot/api";
import { deriveInvoicePageData } from "@/lib/opspilot/metrics";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Invoices" };

async function InvoicesContent() {
  let data;
  try {
    const dataset = await fetchOpsPilotData();
    data = deriveInvoicePageData(dataset);
  } catch (err) {
    const message = fetchErrorMessage(err);
    return <PageDataError message={message} />;
  }
  return <InvoiceTable data={data} />;
}

export default function InvoicesPage() {
  return (
    <PageShell>
      <PageHeader
        title="Invoices"
        description="Monitor receivables and payment follow-ups."
        icon={FileText}
      />
      <Suspense fallback={<PageDataSkeleton summaryCards={4} />}>
        <InvoicesContent />
      </Suspense>
    </PageShell>
  );
}
