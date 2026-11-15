"use server";
// Step 4 invoice request (sprint-planning.md A-3.1, contract name requestInvoice).
// Owner: Engineer A (Aryan). The amount is computed on the server: here with computeFee and
// the live pricing (to catch a stale page), and again in Postgres by request_invoice().

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/lib/data/events";
import { getLivePricing } from "@/lib/data/organizer-db";
import { readInvoiceForm } from "@/lib/organizer/invoice";
import { computeFee } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/require-role";
import { invoiceRequestSchema, type ClientInput } from "@/lib/validation";

type Db = Awaited<ReturnType<typeof createClient>>;

export type InvoiceFormState = { errors?: Record<string, string> };

/**
 * The caller's own client for this university: reuses (and refreshes) one they created,
 * otherwise creates one. Clients are private to their creator (DECISIONS.md 001).
 */
async function ownClientId(db: Db, userId: string, c: ClientInput): Promise<string> {
  const pattern = c.fullName.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data: existing, error } = await db
    .from("clients")
    .select("id")
    .eq("created_by", userId)
    .ilike("full_name", pattern)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not look up the client: ${error.message}`);
  const fields = { full_name: c.fullName, attn: c.attn, address: c.address, email: c.email };
  if (existing) {
    const { error: e } = await db.from("clients").update(fields).eq("id", existing.id);
    if (e) throw new Error(`Could not update the client: ${e.message}`);
    return existing.id;
  }
  const { data, error: e } = await db.from("clients").insert({ ...fields, created_by: userId }).select("id").single();
  if (e) throw new Error(`Could not save the client: ${e.message}`);
  return data.id;
}

/** Requests the invoice for one of the signed-in organizer's courses. Returns the invoice id. */
export async function requestInvoice(courseId: string, input: unknown): Promise<string> {
  const me = await requireRole("organizer");
  const parsed = invoiceRequestSchema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid invoice request: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
  const r = parsed.data;
  const db = await createClient();

  const { data: course } = await db.from("courses").select("course_type").eq("id", courseId).eq("organizer_id", me.id).maybeSingle();
  if (!course) throw new Error("Course not found");
  if (!course.course_type) throw new Error("Finish the course details (step 1) first");

  const fee = computeFee(course.course_type, r.participants, r.payByCard, await getLivePricing());
  if (Math.abs(fee.total - r.amount) > 0.005) {
    throw new Error("Pricing changed since you opened this page. Reload to see the current amount.");
  }

  const clientId = await ownClientId(db, me.id, r.client);
  const { data: invoiceId, error } = await db.rpc("request_invoice", {
    p_course_id: courseId,
    p_client_id: clientId,
    p_participants: r.participants,
    p_pay_by_card: r.payByCard,
    p_due_date: r.dueDate,
    p_document_ids: r.agreementDocumentIds,
    p_po_number: r.poNumber,
    p_notes: r.notes,
  });
  if (error) throw new Error(error.message);

  await logEvent(courseId, "invoice.requested", { invoiceId, amount: fee.total, participants: r.participants });
  return invoiceId;
}

/** The invoice form. Quotes are A-6.2; until then only invoice mode submits. */
export async function saveInvoiceForm(_prev: InvoiceFormState, fd: FormData): Promise<InvoiceFormState> {
  const courseId = String(fd.get("courseId") ?? "");
  if (fd.get("mode") !== "invoice") return { errors: { form: "Quote requests aren't available yet. Choose Invoice if your agreement is signed." } };

  const raw = readInvoiceForm(fd);
  const parsed = invoiceRequestSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[issue.path.join(".") || "form"] ??= issue.message;
    return { errors };
  }

  try {
    await requestInvoice(courseId, raw);
  } catch (e) {
    return { errors: { form: e instanceof Error ? e.message : "Something went wrong. Please try again." } };
  }
  revalidatePath("/organizer");
  revalidatePath(`/organizer/courses/${courseId}`);
  redirect(`/organizer/courses/${courseId}/invoice`);
}
