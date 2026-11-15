// Step 4 invoice request: pure helpers shared by the form and the server action.
// Owner: Engineer A (Aryan).

import { addDays, endOfNextQuarter } from "@/lib/dates";

export type ApTerm = "2w" | "4w" | "6w" | "q";

/** Suggested date IAHV should receive payment, counted from the course end date (never before today). */
export function suggestedDue(endDate: string, term: ApTerm, today: string): string {
  const due = term === "q" ? endOfNextQuarter(endDate) : addDays(endDate, { "2w": 14, "4w": 28, "6w": 42 }[term]);
  return due < today ? addDays(today, { "2w": 14, "4w": 28, "6w": 42, q: 90 }[term]) : due;
}

function text(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/** FormData from the invoice form -> the shape of B's invoiceRequestSchema (not yet validated). */
export function readInvoiceForm(fd: FormData): Record<string, unknown> {
  const participants = text(fd, "participants");
  const amount = text(fd, "amount");
  return {
    client: {
      fullName: text(fd, "clientName") ?? "",
      attn: text(fd, "clientAttn") ?? "",
      address: text(fd, "clientAddress") ?? "",
      email: text(fd, "clientEmail") ?? "",
    },
    participants: participants === undefined ? undefined : Number(participants),
    payByCard: fd.get("payByCard") === "on",
    apTerm: text(fd, "apTerm"),
    dueDate: text(fd, "dueDate"),
    amount: amount === undefined ? undefined : Number(amount),
    poNumber: text(fd, "poNumber"),
    agreementDocumentIds: [...new Set(fd.getAll("agreementDocumentIds").filter((v): v is string => typeof v === "string" && v !== ""))],
    notes: text(fd, "notes"),
  };
}

export const INVOICE_STATUS_LABEL = {
  requested: "Requested · waiting on IAHV for the invoice #",
  issued: "Invoice # issued",
  sent_to_client: "Sent to the university",
  accounting_submitted: "Course accounting submitted",
  paid: "Paid",
  closed: "Closed",
  rejected: "Returned by IAHV",
} as const;

/** "03/05/2027" from a date or timestamp. */
function mmddyyyy(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;
}

/**
 * Copy-ready text for Journey course accounting (plan-v3: "invoice # X for $Y paid by ...").
 * Before payment it names who the invoice is billed to and when it's due; after, when it was paid.
 */
export function journeyAccountingText(inv: {
  number: string;
  amount: number | null;
  clientName: string | null;
  dueDate: string | null;
  paidAt: string | null;
}): string {
  const amount =
    inv.amount === null ? "" : ` for $${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const who = inv.clientName ? ` ${inv.paidAt ? "paid by" : "billed to"} ${inv.clientName}` : "";
  const when = inv.paidAt ? ` on ${mmddyyyy(inv.paidAt)}` : inv.dueDate ? `, due ${mmddyyyy(inv.dueDate)}` : "";
  return `Invoice # ${inv.number}${amount}${who}${when}.`;
}
