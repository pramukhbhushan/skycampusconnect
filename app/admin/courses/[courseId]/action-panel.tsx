"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cx } from "@/components/ui";
import type { CourseFacts, NextAction } from "@/lib/admin/derive";
import { fundingActionsFor, invoiceActionsFor, quoteActionsFor } from "@/lib/admin/transitions";
import { fundingAction, invoiceAction, quoteAction, type FormState } from "../../actions";

const primaryBtn = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-brand px-4 font-semibold text-white disabled:cursor-wait disabled:opacity-60";
const secondaryBtn = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-field bg-white px-4 font-semibold text-brand-dark hover:bg-surface disabled:cursor-wait disabled:opacity-60";
const fieldCls = "min-h-11 w-full rounded-xl border border-field bg-white px-3.5 text-[15px] text-ink";

function Result({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cx("rounded-xl px-3.5 py-2.5 text-sm", state.ok ? "bg-ok-bg text-ok-text" : "bg-danger-bg text-danger-text")}>
      {state.ok ? state.message : state.error}
    </p>
  );
}

function FundingForm({ courseId, status }: { courseId: string; status: NonNullable<CourseFacts["funding"]>["status"] }) {
  const [state, action, pending] = useActionState(fundingAction, null);
  const actions = fundingActionsFor(status);
  if (!actions.length) return <Result state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      <h3 className="text-sm font-bold">Funding request</h3>
      {actions.includes("approve") && (
        <button name="action" value="approve" disabled={pending} className={primaryBtn}>Approve funding</button>
      )}
      {actions.includes("needs_info") && (
        <>
          <label htmlFor="funding-note" className="text-sm font-semibold">Or ask for more information</label>
          <textarea id="funding-note" name="note" rows={2} placeholder="What's missing? The organizer sees this note." className={`${fieldCls} py-2.5`} />
          <button name="action" value="needs_info" disabled={pending} className={secondaryBtn}>Send back for more info</button>
        </>
      )}
      <Result state={state} />
    </form>
  );
}

const QUOTE_LABEL = { issue: "Issue quote", accept: "Mark accepted", revise: "Needs revision", expire: "Mark expired" } as const;
const INVOICE_LABEL = { issue: "Issue invoice", mark_sent: "Mark sent to client", mark_paid: "Mark paid", close: "Close course" } as const;

function QuoteForm({ courseId, quote }: { courseId: string; quote: NonNullable<CourseFacts["quote"]> }) {
  const [state, action, pending] = useActionState(quoteAction, null);
  const actions = quoteActionsFor(quote.status);
  if (!actions.length) return <Result state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      <h3 className="text-sm font-bold">Quote{quote.number ? ` ${quote.number}` : ""}</h3>
      {actions.includes("issue") && (
        <>
          <label htmlFor="quote-number" className="text-sm font-semibold">Quote number</label>
          <input id="quote-number" name="number" placeholder="e.g. Q-1042" className={fieldCls} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <button key={a} name="action" value={a} disabled={pending} className={i === 0 ? primaryBtn : secondaryBtn}>{QUOTE_LABEL[a]}</button>
        ))}
      </div>
      <Result state={state} />
    </form>
  );
}

function InvoiceForm({ courseId, invoice }: { courseId: string; invoice: NonNullable<CourseFacts["invoice"]> }) {
  const [state, action, pending] = useActionState(invoiceAction, null);
  const actions = invoiceActionsFor(invoice.status);
  if (!actions.length) return <Result state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="courseId" value={courseId} />
      <h3 className="text-sm font-bold">Invoice{invoice.number ? ` ${invoice.number}` : ""}</h3>
      {actions.includes("issue") && (
        <>
          <label htmlFor="invoice-number" className="text-sm font-semibold">Invoice number</label>
          <input id="invoice-number" name="number" placeholder="e.g. INV-24901" className={fieldCls} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a, i) => (
          <button key={a} name="action" value={a} disabled={pending} className={i === 0 ? primaryBtn : secondaryBtn}>{INVOICE_LABEL[a]}</button>
        ))}
      </div>
      <Result state={state} />
    </form>
  );
}

/** Only the actions that are valid right now (B-3.1, B-5.1, B-6.1). */
export function ActionPanel({ courseId, facts, next, remindHref }: { courseId: string; facts: CourseFacts; next: NextAction; remindHref: string }) {
  // Keep each form mounted while its record exists, so a confirmation stays on screen
  // after the last action (e.g. "Funding approved") even though no buttons remain.
  const sections = [
    facts.funding && <FundingForm key="f" courseId={courseId} status={facts.funding.status} />,
    facts.quote && <QuoteForm key="q" courseId={courseId} quote={facts.quote} />,
    facts.invoice && <InvoiceForm key="i" courseId={courseId} invoice={facts.invoice} />,
  ].filter(Boolean);
  const waiting =
    (facts.funding && fundingActionsFor(facts.funding.status).length > 0) ||
    (facts.quote && quoteActionsFor(facts.quote.status).length > 0) ||
    (facts.invoice && invoiceActionsFor(facts.invoice.status).length > 0);

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-[22px]">
      <h2 className="text-[17px] font-bold">Next action</h2>
      {next.kind === "remind" && (
        <Link href={remindHref} className={`${primaryBtn} no-underline hover:text-white`}>Send reminder</Link>
      )}
      <div className="flex flex-col gap-5 empty:hidden [&>form+form]:border-t [&>form+form]:border-line-3 [&>form+form]:pt-5">{sections}</div>
      {!waiting && next.kind !== "remind" && <p className="text-sm text-muted">Nothing is waiting on IAHV for this course.</p>}
    </div>
  );
}
