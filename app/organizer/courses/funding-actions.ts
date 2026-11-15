"use server";
// Step 3 funding request (sprint-planning.md A-5.1, contract name submitFundingRequest).
// Owner: Engineer A (Aryan). Drafts save whatever is filled in; submitting validates with
// B's fundingRequestSchema and save_funding_request() enforces the rules in Postgres.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logEvent } from "@/lib/data/events";
import { readFundingForm } from "@/lib/organizer/funding";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/require-role";
import { fundingRequestSchema } from "@/lib/validation";

export type FundingFormState = { errors?: Record<string, string> };

type Input = { values: Record<string, unknown>; documentIds: string[] };

function errorsOf(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[issue.path.map(String).join(".") || "form"] ??= issue.message;
  return errors;
}

/**
 * Saves (submit = false) or submits (submit = true) the funding request of one of the
 * signed-in organizer's courses. Returns field errors instead of throwing for bad input.
 */
export async function submitFundingRequest(courseId: string, input: Input, submit: boolean): Promise<Record<string, string> | null> {
  const me = await requireRole("organizer");
  const db = await createClient();
  const ids = Array.isArray(input.documentIds) ? input.documentIds.filter((id) => typeof id === "string") : [];

  // B's schema describes PDFs by name/size/type; describe the attached ones from the database.
  const { data: docs, error: docError } = ids.length
    ? await db.from("documents").select("id, file_name, size_bytes").eq("course_id", courseId).in("id", ids)
    : { data: [], error: null };
  if (docError) throw new Error(`Could not check the files: ${docError.message}`);
  const proofOfFunds = docs.map((d) => ({ name: d.file_name, size: d.size_bytes, type: "application/pdf" as const }));

  const v = input.values ?? {};
  let values: Record<string, unknown> = v;
  if (submit) {
    const parsed = fundingRequestSchema.safeParse({ ...v, proofOfFunds });
    if (!parsed.success) return errorsOf(parsed.error.issues);
    values = parsed.data;
  } else {
    // Drafts: only reject values that are present but malformed.
    const bad: Record<string, string> = {};
    for (const key of ["totalFunding", "estParticipants", "studentFee"] as const) {
      if (typeof v[key] === "number" && (Number.isNaN(v[key]) || (v[key] as number) < 0)) bad[key] = "Enter a number";
    }
    if (v.neededBy !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(v.neededBy))) bad.neededBy = "Use a date like 2027-03-05";
    if (Object.keys(bad).length) return bad;
  }

  const agreement = ["yes", "in_progress", "no"].includes(String(values.agreement)) ? (values.agreement as "yes" | "in_progress" | "no") : undefined;
  const { error } = await db.rpc("save_funding_request", {
    p_course_id: courseId,
    p_submit: submit,
    p_total_funding: typeof values.totalFunding === "number" ? values.totalFunding : undefined,
    p_needed_by: typeof values.neededBy === "string" ? values.neededBy : undefined,
    p_document_ids: ids,
    p_student_fee: typeof values.studentFee === "number" ? values.studentFee : 0,
    p_prior_funding_note: typeof values.priorFundingNote === "string" ? values.priorFundingNote : undefined,
    p_agreement: agreement,
    p_est_participants: typeof values.estParticipants === "number" ? values.estParticipants : undefined,
  });
  if (error) return { form: error.message };

  await logEvent(courseId, submit ? "funding.submitted" : "step.updated", submit ? { by: me.id } : { step: 3, draft: true });
  return null;
}

/** The step 3 form: "Save draft" or "Submit to IAHV". */
export async function saveFundingForm(_prev: FundingFormState, fd: FormData): Promise<FundingFormState> {
  const courseId = String(fd.get("courseId") ?? "");
  const submit = fd.get("intent") === "submit";
  let errors: Record<string, string> | null;
  try {
    errors = await submitFundingRequest(courseId, readFundingForm(fd), submit);
  } catch (e) {
    return { errors: { form: e instanceof Error ? e.message : "Something went wrong. Please try again." } };
  }
  if (errors) return { errors };
  revalidatePath("/organizer");
  revalidatePath(`/organizer/courses/${courseId}`);
  redirect(submit ? `/organizer/courses/${courseId}/funding` : `/organizer/courses/${courseId}`);
}
