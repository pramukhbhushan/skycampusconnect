// What IAHV admins can change (B-3.1, B-5.1, B-6.1, B-2.2, B-4.4, B-5.3). Owner: Engineer B.
// Each function checks the same rules as the Postgres functions in
// supabase/migrations/*_b_admin_transitions.sql, then records the change.
// TODO(backend): replace the adminStore writes with supabase.rpc(...) calls once A-0.3 lands.
import {
  fundingTransition,
  invoiceTransition,
  quoteTransition,
  type FundingAction,
  type InvoiceAction,
  type QuoteAction,
} from "@/lib/admin/transitions";
import { unknownFields, type EmailTemplate } from "@/lib/email/templates";
import type { PricingConstants } from "@/lib/pricing";
import type { Role } from "@/lib/types";
import { getAllAdminRows, getCourseFacts } from "./admin";
import { adminStore, logActivity } from "./admin-store";
import { getUsers } from "./settings";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function usedInvoiceNumbers(): Set<string> {
  const numbers = new Set<string>();
  for (const row of getAllAdminRows()) {
    const n = getCourseFacts(row.id)?.invoice?.number;
    if (n) numbers.add(n.toUpperCase());
  }
  return numbers;
}

export function decideFunding(courseId: string, action: FundingAction, actor: string, note?: string): ActionResult {
  const funding = getCourseFacts(courseId)?.funding;
  if (!funding) return fail("This course has no funding request.");
  const t = fundingTransition(action, funding.status);
  if (!t.ok) return fail(t.error);
  if (action === "needs_info" && !note?.trim()) return fail("Tell the organizer what's missing.");
  adminStore.funding.set(courseId, { status: t.to, note: note?.trim() });
  logActivity(courseId, actor, action === "approve" ? "Approved the funding request" : `Asked for more funding information: ${note!.trim()}`);
  return { ok: true, message: action === "approve" ? "Funding approved. Step 4 is now open for the organizer." : "Sent back to the organizer with your note." };
}

export function changeQuote(courseId: string, action: QuoteAction, actor: string, quoteNumber?: string): ActionResult {
  const quote = getCourseFacts(courseId)?.quote;
  if (!quote) return fail("This course has no quote request.");
  const t = quoteTransition(action, quote.status);
  if (!t.ok) return fail(t.error);
  const number = action === "issue" ? quoteNumber?.trim().toUpperCase() : quote.number;
  if (action === "issue" && !number) return fail("Enter the quote number.");
  adminStore.quotes.set(courseId, { status: t.to, number: number ?? null });
  const text = { issue: `Issued quote ${number}`, accept: "Marked the quote accepted", revise: "Sent the quote back for revision", expire: "Marked the quote expired" }[action];
  logActivity(courseId, actor, text);
  return { ok: true, message: `${text}.` };
}

export function changeInvoice(courseId: string, action: InvoiceAction, actor: string, invoiceNumber?: string): ActionResult {
  const invoice = getCourseFacts(courseId)?.invoice;
  if (!invoice) return fail("This course has no invoice request.");
  const t = invoiceTransition(action, invoice.status);
  if (!t.ok) return fail(t.error);

  let number = invoice.number;
  if (action === "issue") {
    number = invoiceNumber?.trim().toUpperCase() ?? "";
    if (!number) return fail("Enter the invoice number.");
    if (usedInvoiceNumbers().has(number)) return fail(`Invoice ${number} is already used on another course.`);
  }
  adminStore.invoices.set(courseId, { status: t.to, number });
  const text = {
    issue: `Issued invoice ${number}`,
    mark_sent: `Marked invoice ${number} sent to the client`,
    mark_paid: `Marked invoice ${number} paid`,
    close: "Closed the course",
  }[action];
  logActivity(courseId, actor, text);
  return { ok: true, message: `${text}.` };
}

export async function setUserRole(userId: string, role: Role, actingAdminId: string): Promise<ActionResult> {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return fail("That person doesn't exist.");
  if (user.role === role) return { ok: true, message: `${user.name} is already ${role === "iahv_admin" ? "an IAHV admin" : "an organizer"}.` };
  if (role === "organizer") {
    if (userId === actingAdminId) return fail("You can't remove your own admin access. Ask another IAHV admin.");
    if (users.filter((u) => u.role === "iahv_admin").length <= 1) return fail("There must be at least one IAHV admin.");
  }
  adminStore.roles.set(userId, role);
  return { ok: true, message: `${user.name} is now ${role === "iahv_admin" ? "an IAHV admin" : "an organizer"}.` };
}

export function updateEmailTemplate(template: Pick<EmailTemplate, "key" | "subject" | "body">): ActionResult {
  const bad = unknownFields(`${template.subject}\n${template.body}`);
  if (bad.length) return fail(`Unknown field${bad.length > 1 ? "s" : ""}: ${bad.map((b) => `{{${b}}}`).join(", ")}.`);
  adminStore.templates.set(template.key, { subject: template.subject.trim(), body: template.body.trim() });
  return { ok: true, message: "Saved. New reminders use this text." };
}

export function updatePricing(pricing: PricingConstants): ActionResult {
  adminStore.pricing = pricing;
  return { ok: true, message: "Pricing saved. New fee estimates use these numbers." };
}
