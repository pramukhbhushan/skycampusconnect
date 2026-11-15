"use server";
// Server actions for IAHV admins. Each one validates its input, then calls lib/data.
// TODO(backend): check requireUser("iahv_admin") here once A-0.3/A-0.5 provide it.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  changeInvoice,
  changeQuote,
  decideFunding,
  setUserRole,
  updateEmailTemplate,
  updatePricing,
  type ActionResult,
} from "@/lib/data/admin-actions";
import { adminUser } from "@/lib/data/admin-user";

export type FormState = ActionResult | null;

const courseId = z.string().trim().min(1).max(100);
const docNumber = z
  .string()
  .trim()
  .min(1, { error: "Enter the number." })
  .max(40, { error: "That number is too long." })
  .regex(/^[A-Za-z0-9-]+$/, { error: "Use letters, numbers and dashes only, e.g. INV-24817." });

const refresh = () => revalidatePath("/admin", "layout");
const invalid = (e: z.ZodError): FormState => ({ ok: false, error: e.issues[0]?.message ?? "Check the form." });

export async function fundingAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ courseId, action: z.enum(["approve", "needs_info"]), note: z.string().trim().max(1000).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  const result = decideFunding(parsed.data.courseId, parsed.data.action, adminUser.name, parsed.data.note);
  if (result.ok) refresh();
  return result;
}

export async function quoteAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ courseId, action: z.enum(["issue", "accept", "revise", "expire"]), number: docNumber.optional() })
    .safeParse({ ...Object.fromEntries(form), number: form.get("number") || undefined });
  if (!parsed.success) return invalid(parsed.error);
  const result = changeQuote(parsed.data.courseId, parsed.data.action, adminUser.name, parsed.data.number);
  if (result.ok) refresh();
  return result;
}

export async function invoiceAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ courseId, action: z.enum(["issue", "mark_sent", "mark_paid", "close"]), number: docNumber.optional() })
    .safeParse({ ...Object.fromEntries(form), number: form.get("number") || undefined });
  if (!parsed.success) return invalid(parsed.error);
  const result = changeInvoice(parsed.data.courseId, parsed.data.action, adminUser.name, parsed.data.number);
  if (result.ok) refresh();
  return result;
}

export async function roleAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ userId: z.string().min(1), role: z.enum(["organizer", "iahv_admin"]) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  const result = await setUserRole(parsed.data.userId, parsed.data.role, adminUser.id);
  if (result.ok) refresh();
  return result;
}

export async function templateAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      key: z.enum(["request_invoice", "submit_accounting", "payment_overdue", "payment_coming_up", "funding_needs_info"]),
      subject: z.string().trim().min(1, { error: "Add a subject." }).max(200),
      body: z.string().trim().min(1, { error: "Write the message." }).max(10_000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  const result = updateEmailTemplate(parsed.data);
  if (result.ok) refresh();
  return result;
}

const money = (label: string) =>
  z.coerce.number({ error: `${label}: enter a number.` }).min(0, { error: `${label} can't be negative.` }).max(100_000);

export async function pricingAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({
      happiness: money("SKY Happiness price").positive({ error: "SKY Happiness price must be more than $0." }),
      premium: money("SKY Premium price").positive({ error: "SKY Premium price must be more than $0." }),
      includedStudents: z.coerce.number().int({ error: "Students included must be a whole number." }).min(1).max(500),
      extraStudentPrice: money("Extra student price"),
      cardFeePercent: z.coerce.number({ error: "Card fee: enter a number." }).min(0).max(20, { error: "Card fee must be 20% or less." }),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return invalid(parsed.error);
  const p = parsed.data;
  const result = updatePricing({
    basePrice: { happiness: p.happiness, premium: p.premium },
    includedStudents: p.includedStudents,
    extraStudentPrice: p.extraStudentPrice,
    cardFeeRate: Math.round(p.cardFeePercent * 100) / 10_000,
  });
  if (result.ok) refresh();
  return result;
}
