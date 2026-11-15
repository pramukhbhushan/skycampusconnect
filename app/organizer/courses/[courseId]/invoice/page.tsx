import type { Metadata } from "next";
import { CourseHeader, StepLayout } from "@/components/course-stepper";
import { CheckCircle, Clock } from "@/components/icons";
import { ButtonLink, Callout, Card, Eyebrow, SideCard } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { getLivePricing, getMyInvoice, listMyCourseDocuments, type MyInvoice } from "@/lib/data/organizer-db";
import { INVOICE_STATUS_LABEL, journeyAccountingText } from "@/lib/organizer/invoice";
import { money } from "@/lib/pricing";
import type { StepStatus } from "@/lib/types";
import { courseSubtitle, loadCourse } from "../course-data";
import { AccountingCard } from "./accounting-card";
import { InvoiceForm } from "./invoice-form";

export const metadata: Metadata = { title: "Invoice request" };

// Step 4 · Quote & invoice request.
export default async function InvoicePage({ params }: PageProps<"/organizer/courses/[courseId]/invoice">) {
  const course = await loadCourse(params);
  const [invoice, pricing, proofDocs, agreementDocs] = await Promise.all([
    getMyInvoice(course.id),
    getLivePricing(),
    listMyCourseDocuments(course.id, "proof_of_funds"),
    listMyCourseDocuments(course.id, "agreement"),
  ]);
  const steps: StepStatus[] = course.steps.map((s, i) => (i === 3 && s === "todo" ? "in_progress" : s));

  return (
    <>
      <CourseHeader title={course.name} subtitle={courseSubtitle(course)} steps={steps} />
      {invoice ? (
        <InvoiceStatus courseId={course.id} invoice={invoice} attendanceDone={course.steps[5] === "done"} />
      ) : (
        <InvoiceForm
          courseId={course.id}
          courseType={course.type!}
          endDate={course.endDate!}
          initialParticipants={course.estParticipants ?? 10}
          client={course.client ?? { fullName: course.university ?? "" }}
          funding={course.funding}
          agreementSigned={(course.funding?.agreement ?? "yes") === "yes"}
          pricing={pricing}
          proofDocs={proofDocs}
          agreementDocs={agreementDocs}
        />
      )}
    </>
  );
}

/** What the organizer sees once the invoice has been requested. */
function InvoiceStatus({ courseId, invoice, attendanceDone }: { courseId: string; invoice: MyInvoice; attendanceDone: boolean }) {
  const waiting = invoice.status === "requested";
  const numbered = invoice.number !== null && (invoice.status === "issued" || invoice.status === "sent_to_client");
  const afterAccounting = invoice.status === "accounting_submitted" || invoice.status === "paid" || invoice.status === "closed";
  return (
    <StepLayout
      aside={
        <SideCard title="What happens next">
          <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-normal text-ink-soft">
            <li>IAHV issues your invoice # in 2–4 business days.</li>
            <li>Check it, then forward it to the university.</li>
            <li>After the course, enter the invoice # in Journey course accounting (Step 7).</li>
          </ol>
        </SideCard>
      }
    >
      <Callout
        role="status"
        tone={waiting ? "warn" : "ok"}
        icon={waiting ? <Clock size={22} /> : <CheckCircle size={22} strokeWidth={2.2} />}
        title={INVOICE_STATUS_LABEL[invoice.status]}
      >
        <span>
          {waiting
            ? "You'll see the invoice # here once IAHV issues it. You can keep working on other steps meanwhile."
            : `Invoice # ${invoice.number ?? "—"}.`}
        </span>
      </Callout>
      <Card>
        <Eyebrow>Step 4 of 8</Eyebrow>
        <h2 className="text-2xl font-bold">Your invoice request</h2>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-x-5 gap-y-3.5 text-sm">
          {[
            ["Invoice #", invoice.number ?? "Not issued yet"],
            ["Amount", invoice.amount === null ? "—" : money(invoice.amount)],
            ["Due date", invoice.dueDate ? formatDate(invoice.dueDate) : "—"],
            ["Requested", formatDate(invoice.requestedAt.slice(0, 10))],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {invoice.number && (numbered || afterAccounting) && (
        <AccountingCard
          courseId={courseId}
          text={journeyAccountingText({ ...invoice, number: invoice.number })}
          canSubmit={numbered && attendanceDone}
          blocker={
            afterAccounting
              ? `Submitted in Journey${invoice.accountingSubmittedAt ? ` on ${formatDate(invoice.accountingSubmittedAt.slice(0, 10))}` : ""}.`
              : "After the course, record attendance (Step 6), then come back to submit course accounting."
          }
        />
      )}
      {afterAccounting && (
        <Card>
          <Eyebrow>Step 8 of 8</Eyebrow>
          <h2 className="text-2xl font-bold">Payment &amp; closure</h2>
          <p className="text-[15px] text-ink-soft">
            {invoice.status === "closed"
              ? "Paid and closed. This course is complete."
              : invoice.status === "paid"
                ? `Paid${invoice.paidAt ? ` on ${formatDate(invoice.paidAt.slice(0, 10))}` : ""}. IAHV will close the course on Journey.`
                : `Waiting for the university's payment${invoice.dueDate ? ` (due ${formatDate(invoice.dueDate)})` : ""}. IAHV marks it paid when it arrives.`}
          </p>
        </Card>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        <ButtonLink href={`/organizer/courses/${courseId}`} variant="secondary" className="px-[22px]">← All steps</ButtonLink>
      </div>
    </StepLayout>
  );
}
