"use client";

import { useState } from "react";
import { StepLayout } from "@/components/course-stepper";
import { CheckCircle, Clock } from "@/components/icons";
import { ButtonLink, Callout, Card, ChipGroup, Eyebrow, PdfBadge, Segmented, SideCard, TextArea, TextField, cx } from "@/components/ui";
import { addDays, endOfNextQuarter, formatDate } from "@/lib/dates";
import { COURSE_TYPE_LABEL, INCLUDED_STUDENTS, computeFee, money } from "@/lib/pricing";
import type { Client, CourseType, FundingRequest } from "@/lib/types";

type ApTerm = "2w" | "4w" | "6w" | "q";

const AP_OPTIONS: { id: ApTerm; label: string }[] = [
  { id: "2w", label: "~2 weeks" },
  { id: "4w", label: "~4 weeks" },
  { id: "6w", label: "~6 weeks" },
  { id: "q", label: "Quarterly" },
];

/** Suggested date IAHV should receive payment, counted from the course end date. */
function suggestedDue(endDate: string, term: ApTerm): string {
  if (term === "q") return endOfNextQuarter(endDate);
  return addDays(endDate, { "2w": 14, "4w": 28, "6w": 42 }[term]);
}

// TODO(backend): submit via a server action that inserts into `quotes` or `invoices`.
export function InvoiceForm({
  courseId,
  courseType,
  endDate,
  initialParticipants,
  client,
  funding,
  agreementSigned,
}: {
  courseId: string;
  courseType: CourseType;
  endDate: string;
  initialParticipants: number;
  client: Client;
  funding?: FundingRequest;
  agreementSigned: boolean;
}) {
  const [mode, setMode] = useState<"quote" | "invoice">(agreementSigned ? "invoice" : "quote");
  const [count, setCount] = useState(initialParticipants);
  const [card, setCard] = useState(false);
  const [ap, setAp] = useState<ApTerm>("4w");

  const fee = computeFee(courseType, count, card);
  const due = formatDate(suggestedDue(endDate, ap));
  const noun = mode === "invoice" ? "invoice" : "quote";
  const agreementDoc = funding?.documents[0];

  return (
    <StepLayout
      aside={
        <>
          <div className="flex flex-col gap-1.5 rounded-[20px] bg-brand p-6 text-white">
            <span className="text-sm font-semibold text-[#dce7ff]">{mode === "invoice" ? "Invoice" : "Quote"} amount</span>
            <span className="text-[38px] font-bold">{money(fee.total)}</span>
            <span className="text-sm text-[#e6eeff]">
              {count} participants · due {due}
            </span>
          </div>
          <SideCard title="What happens next">
            <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-normal text-ink-soft">
              <li>IAHV Finance issues your {noun} # in 2–4 business days.</li>
              <li>Check it, then forward it to the university.</li>
              <li>
                After the course, enter the invoice # in Journey course accounting (Step 7). We&apos;ll give you text to copy.
              </li>
            </ol>
          </SideCard>
        </>
      }
    >
      <form className="contents">
        {funding?.status === "approved" && (
          <Callout role="status" tone="ok" icon={<CheckCircle size={22} strokeWidth={2.2} />} title={`Funding approved by IAHV Finance on ${funding.approvedOn}`}>
            <span>
              {agreementSigned
                ? "Your agreement is signed, so you can request the invoice directly. No quote needed."
                : "Request a quote first. The invoice unlocks once your agreement is signed."}
            </span>
          </Callout>
        )}
        {funding?.status === "submitted" && (
          <Callout role="status" tone="warn" icon={<Clock size={22} />} title="Funding approval is still with IAHV Finance">
            <span>You can fill in your request now. IAHV issues the {noun} # once funding is approved.</span>
          </Callout>
        )}

        <Card>
          <div className="flex flex-wrap items-end justify-between gap-3.5">
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 4 of 8</Eyebrow>
              <h2 className="text-2xl font-bold">Request your {noun}</h2>
            </div>
            <Segmented
              label="Request type"
              options={[
                { id: "quote", label: "Quote" },
                { id: "invoice", label: "Invoice" },
              ]}
              value={mode}
              onChange={setMode}
              className="[&_button]:text-sm"
            />
          </div>

          {mode === "invoice" && (
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-semibold">Formal agreement showing funding is secured</span>
              {agreementDoc ? (
                <label className="flex cursor-pointer items-center gap-3.5 rounded-[14px] border-2 border-brand bg-surface px-4 py-3.5">
                  <input type="checkbox" defaultChecked className="size-5 accent-brand" />
                  <PdfBadge className="bg-white" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold">{agreementDoc.name}</span>
                    <span className="text-[13px] text-muted">Reused from Step 3 · no need to upload again</span>
                  </span>
                </label>
              ) : (
                <p className="text-sm text-muted">No agreement on file yet.</p>
              )}
              <label htmlFor="i-agreement" className="cursor-pointer self-start text-sm font-semibold text-brand">
                + Upload {agreementDoc ? "a different" : "an"} agreement
                <input id="i-agreement" type="file" accept="application/pdf" className="sr-only" />
              </label>
            </div>
          )}
        </Card>

        <Card className="gap-[18px]">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="text-xl font-bold">Who the {noun} goes to</h2>
            <span className="rounded-full bg-tint px-2.5 py-1 text-[13px] font-semibold text-brand-dark">Saved for this university</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            <TextField id="i-client" label="Client / university (full name)" defaultValue={client.fullName} />
            <TextField id="i-attn" label="Attn (person paying)" placeholder="[Contact name, office]" defaultValue={client.attn} />
            <TextField id="i-addr" label="Billing address" placeholder="[Street, city, state, ZIP]" defaultValue={client.address} />
            <TextField id="i-email" type="email" label="Client email" placeholder="[accounts payable email]" defaultValue={client.email} />
            {mode === "invoice" && (
              <>
                <TextField id="i-quote" label="Quote #" defaultValue="None requested" readOnly />
                <TextField id="i-po" label="Purchase order #" optional="if the school gave one" placeholder="Optional" />
              </>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold">Amount &amp; due date</h2>
          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-2">
              <span id="i-count-label" className="text-sm font-semibold"># of participants</span>
              <div role="group" aria-labelledby="i-count-label" className="flex items-center overflow-hidden rounded-xl border border-field">
                <button
                  type="button"
                  aria-label="Fewer participants"
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="size-12 cursor-pointer bg-surface text-[22px] font-semibold text-brand-dark"
                >
                  −
                </button>
                <span aria-live="polite" className="min-w-16 text-center text-lg font-bold">{count}</span>
                <button
                  type="button"
                  aria-label="More participants"
                  onClick={() => setCount((c) => c + 1)}
                  className="size-12 cursor-pointer bg-surface text-[22px] font-semibold text-brand-dark"
                >
                  +
                </button>
              </div>
            </div>
            <label className="flex min-h-12 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={card} onChange={() => setCard((c) => !c)} className="size-5 accent-brand" />
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">University will pay by credit card</span>
                <span className="text-[13px] text-muted">Adds a 3% fee and a payment link</span>
              </span>
            </label>
          </div>

          <div className="overflow-hidden rounded-[14px] border border-line text-[15px]">
            <Line label={`${COURSE_TYPE_LABEL[courseType]} · first ${INCLUDED_STUDENTS} students`} amount={money(fee.base)} />
            <Line
              label={`${fee.extraStudents} extra student${fee.extraStudents === 1 ? "" : "s"} × $100`}
              amount={money(fee.extraAmount)}
              divider
            />
            {card && <Line label="Credit card fee (3%)" amount={money(fee.cardFee)} divider />}
            <div className="flex justify-between gap-3 bg-tint px-[18px] py-4 text-[17px] font-bold">
              <span>{mode === "invoice" ? "Invoice" : "Quote"} amount</span>
              <span className="text-brand-dark">{money(fee.total)}</span>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-semibold">How long does the university&apos;s accounts payable usually take?</legend>
            <p className="mb-2.5 text-[13px] text-muted">We&apos;ll suggest a due date: the day IAHV should receive payment.</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <ChipGroup options={AP_OPTIONS} value={ap} onChange={setAp} />
            </div>
            <p className="mt-3 text-[15px]">
              Suggested due date: <strong>{due}</strong>
            </p>
          </fieldset>

          <TextArea id="i-notes" label="Notes for IAHV Finance" optional="optional" />
        </Card>

        <div className="flex flex-wrap justify-between gap-3">
          <ButtonLink href={`/organizer/courses/${courseId}/funding`} variant="secondary" className="px-[22px]">← Back</ButtonLink>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/organizer" variant="secondary" className="px-[22px]">Save draft</ButtonLink>
            <ButtonLink href="/organizer">Submit {noun} request</ButtonLink>
          </div>
        </div>
      </form>
    </StepLayout>
  );
}

function Line({ label, amount, divider }: { label: string; amount: string; divider?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3 px-[18px] py-3.5", divider && "border-t border-line-3")}>
      <span>{label}</span>
      <span className="font-semibold">{amount}</span>
    </div>
  );
}
