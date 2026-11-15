// Which status changes an IAHV admin may make (B-3.1, B-5.1, B-6.1). The same rules are
// enforced in Postgres by supabase/migrations/*_b_admin_transitions.sql; keep them in sync.
// Owner: Engineer B.

export type FundingStatus = "draft" | "submitted" | "approved" | "needs_info";
export type QuoteStatus = "requested" | "issued" | "accepted" | "revised" | "expired";
export type InvoiceStatus = "requested" | "issued" | "sent_to_client" | "accounting_submitted" | "paid" | "closed" | "rejected";

export type FundingAction = "approve" | "needs_info";
export type QuoteAction = "issue" | "accept" | "revise" | "expire";
export type InvoiceAction = "issue" | "mark_sent" | "mark_paid" | "close";

const FUNDING: Record<FundingAction, { from: FundingStatus[]; to: FundingStatus }> = {
  approve: { from: ["submitted", "needs_info"], to: "approved" },
  needs_info: { from: ["submitted"], to: "needs_info" },
};

const QUOTE: Record<QuoteAction, { from: QuoteStatus[]; to: QuoteStatus }> = {
  issue: { from: ["requested", "revised"], to: "issued" },
  accept: { from: ["issued"], to: "accepted" },
  revise: { from: ["issued"], to: "revised" },
  expire: { from: ["issued"], to: "expired" },
};

const INVOICE: Record<InvoiceAction, { from: InvoiceStatus[]; to: InvoiceStatus }> = {
  issue: { from: ["requested"], to: "issued" },
  mark_sent: { from: ["issued"], to: "sent_to_client" },
  mark_paid: { from: ["issued", "sent_to_client", "accounting_submitted"], to: "paid" },
  close: { from: ["paid"], to: "closed" },
};

export type Transition<S> = { ok: true; to: S } | { ok: false; error: string };

const LABEL: Record<string, string> = {
  draft: "a draft", submitted: "submitted", approved: "approved", needs_info: "waiting for more information",
  requested: "requested", issued: "issued", accepted: "accepted", revised: "being revised", expired: "expired",
  sent_to_client: "sent to the client", accounting_submitted: "in course accounting", paid: "paid", closed: "closed",
  rejected: "rejected",
};

function check<S extends string>(table: Record<string, { from: S[]; to: S }>, action: string, current: S, what: string): Transition<S> {
  const rule = table[action];
  if (!rule) return { ok: false, error: `Unknown action "${action}".` };
  if (!rule.from.includes(current)) return { ok: false, error: `This ${what} is ${LABEL[current] ?? current}, so it can't be changed that way.` };
  return { ok: true, to: rule.to };
}

export const fundingTransition = (action: FundingAction, current: FundingStatus) => check(FUNDING, action, current, "funding request");
export const quoteTransition = (action: QuoteAction, current: QuoteStatus) => check(QUOTE, action, current, "quote");
export const invoiceTransition = (action: InvoiceAction, current: InvoiceStatus) => check(INVOICE, action, current, "invoice");

/** The admin actions available from a given status, in the order to show them. */
export function invoiceActionsFor(status: InvoiceStatus): InvoiceAction[] {
  return (Object.keys(INVOICE) as InvoiceAction[]).filter((a) => INVOICE[a].from.includes(status));
}
export function quoteActionsFor(status: QuoteStatus): QuoteAction[] {
  return (Object.keys(QUOTE) as QuoteAction[]).filter((a) => QUOTE[a].from.includes(status));
}
export function fundingActionsFor(status: FundingStatus): FundingAction[] {
  return (Object.keys(FUNDING) as FundingAction[]).filter((a) => FUNDING[a].from.includes(status));
}
