// Works out which admin queue a course is in, its status and its next action (B-1.1/B-3.2),
// from the facts the database stores. Pure, so the same rules serve sample data now and
// Supabase rows later. Owner: Engineer B.
import type { AdminQueue, Tone } from "@/lib/types";
import { dueLabel, endedLabel, neededByLabel, startedLabel, waitingLabel } from "./time";
import type { FundingStatus, InvoiceStatus, QuoteStatus } from "./transitions";

export type CourseFacts = {
  id: string;
  hasType: boolean; // false while the course is a draft
  startDate: string | null;
  endDate: string | null;
  funding: { status: FundingStatus; neededBy: string | null } | null;
  quote: { status: QuoteStatus; number: string | null; requestedOn: string; amount: number | null } | null;
  invoice: {
    status: InvoiceStatus;
    number: string | null;
    amount: number | null;
    requestedOn: string;
    dueDate: string | null;
    accountingSubmitted: boolean;
  } | null;
};

export type NextAction =
  | { kind: "funding" } // approve / needs info
  | { kind: "quote" } // issue # or settle an issued quote
  | { kind: "invoice" } // issue # / mark sent / mark paid / close
  | { kind: "remind"; template: ReminderTemplateKey }
  | { kind: "none" };

export type ReminderTemplateKey = "request_invoice" | "submit_accounting" | "payment_overdue" | "payment_coming_up" | "funding_needs_info";

export type AdminStatus = {
  queue: AdminQueue;
  statusLabel: string;
  tone: Tone;
  dueLabel: string;
  late: boolean;
  /** Waiting on IAHV longer than 10 business days. */
  flagged: boolean;
  next: NextAction;
  actionLabel: string;
};

const PAYABLE: InvoiceStatus[] = ["issued", "sent_to_client", "accounting_submitted"];

/** Rules are checked in order; the first match wins. */
export function deriveAdminStatus(f: CourseFacts, today: string): AdminStatus {
  const base = { flagged: false };
  const inv = f.invoice;

  if (f.funding?.status === "submitted") {
    const d = f.funding.neededBy ? neededByLabel(f.funding.neededBy, today) : { label: "—", late: false };
    return { ...base, queue: "funding", statusLabel: "Funding approval", tone: "waiting", dueLabel: d.label, late: d.late, next: { kind: "funding" }, actionLabel: "Review & approve" };
  }
  if (f.quote?.status === "requested" || f.quote?.status === "revised") {
    const w = waitingLabel(f.quote.requestedOn, today);
    return { queue: "quote", statusLabel: f.quote.status === "revised" ? "Quote being revised" : "Quote requested", tone: "waiting", dueLabel: w.label, late: w.late, flagged: w.flagged, next: { kind: "quote" }, actionLabel: "Enter quote #" };
  }
  if (inv?.status === "requested") {
    const w = waitingLabel(inv.requestedOn, today);
    return { queue: "invoice", statusLabel: "Invoice requested", tone: "waiting", dueLabel: w.label, late: w.late, flagged: w.flagged, next: { kind: "invoice" }, actionLabel: "Enter invoice #" };
  }
  if (inv && PAYABLE.includes(inv.status) && inv.dueDate && dueLabel(inv.dueDate, today).late) {
    return { ...base, queue: "follow", statusLabel: "Payment overdue", tone: "late", dueLabel: dueLabel(inv.dueDate, today).label, late: true, next: { kind: "remind", template: "payment_overdue" }, actionLabel: "Send reminder" };
  }
  if (inv && PAYABLE.includes(inv.status) && !inv.accountingSubmitted && f.endDate && f.endDate < today) {
    return { ...base, queue: "follow", statusLabel: "Accounting not submitted", tone: "late", dueLabel: endedLabel(f.endDate, today), late: true, next: { kind: "remind", template: "submit_accounting" }, actionLabel: "Send reminder" };
  }
  if (f.hasType && !inv && f.quote?.status !== "issued" && f.startDate && f.startDate <= today) {
    return { ...base, queue: "follow", statusLabel: "Invoice not requested", tone: "late", dueLabel: startedLabel(f.startDate, today), late: true, next: { kind: "remind", template: "request_invoice" }, actionLabel: "Send reminder" };
  }
  if (f.funding?.status === "needs_info") {
    return { ...base, queue: "none", statusLabel: "Funding needs info", tone: "waiting", dueLabel: "Waiting on organizer", late: false, next: { kind: "remind", template: "funding_needs_info" }, actionLabel: "Send reminder" };
  }
  if (inv && PAYABLE.includes(inv.status)) {
    const d = inv.dueDate ? dueLabel(inv.dueDate, today) : { label: "No due date", late: false };
    return { ...base, queue: "payment", statusLabel: "Pending payment", tone: "info", dueLabel: d.label, late: false, next: { kind: "invoice" }, actionLabel: "Mark paid" };
  }
  if (inv?.status === "paid") {
    return { ...base, queue: "none", statusLabel: "Paid", tone: "ok", dueLabel: "Ready to close", late: false, next: { kind: "invoice" }, actionLabel: "Close course" };
  }
  if (inv?.status === "closed") {
    return { ...base, queue: "none", statusLabel: "Closed", tone: "ok", dueLabel: "—", late: false, next: { kind: "none" }, actionLabel: "Open" };
  }
  if (f.quote?.status === "issued") {
    return { ...base, queue: "none", statusLabel: "Quote issued", tone: "info", dueLabel: "Waiting on agreement", late: false, next: { kind: "quote" }, actionLabel: "Update quote" };
  }
  return { ...base, queue: "none", statusLabel: "On track", tone: "ok", dueLabel: "—", late: false, next: { kind: "none" }, actionLabel: "Open" };
}
