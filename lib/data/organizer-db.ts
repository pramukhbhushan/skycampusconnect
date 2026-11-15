// Organizer data from Supabase (A-1.1). Owner: Engineer A (Aryan).
// The sample-data files (courses.ts, organizer.ts) stay as they are for the admin
// pages until B-1.1 moves them to the database; the organizer pages read from here.
//
// Every query runs as the signed-in user, so row-level security limits it to their own
// courses. These read cookies: call them from code that sits behind <Suspense>.

import { cache } from "react";
import { DEFAULT_PRICING, type PricingConstants } from "@/lib/pricing";
import type { Course, UploadedDocument } from "@/lib/types";
import { requireRole, type CurrentUser } from "@/lib/supabase/require-role";
import { createClient } from "@/lib/supabase/server";
import {
  COURSE_SELECT,
  formatFileSize,
  formatMonthDay,
  initialsOf,
  openPriorCourses,
  toCourse,
  toProgress,
  type CourseProgress,
} from "./course-mapper";

/** The signed-in organizer, checked once per request. */
export const getMe = cache(async (): Promise<CurrentUser & { initials: string }> => {
  const me = await requireRole("organizer");
  return { ...me, initials: initialsOf(me.name, me.email) };
});

// One query per request for all of my courses, shared by the functions below.
const myCourseRows = cache(async () => {
  const me = await getMe();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("organizer_id", me.id)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Could not load your courses: ${error.message}`);
  return data;
});

/** My courses, soonest first (drafts without dates last). */
export const listMyCourses = cache(async (): Promise<Course[]> => (await myCourseRows()).map(toCourse));

/** My courses with their funding and invoice state, for the "My courses" cards. */
export async function listMyCoursesWithProgress(): Promise<{ course: Course; progress: CourseProgress }[]> {
  return (await myCourseRows()).map((row) => ({ course: toCourse(row), progress: toProgress(row) }));
}

/** One of my courses, or null if it doesn't exist or isn't mine. */
export async function getMyCourse(courseId: string): Promise<Course | null> {
  const me = await getMe();
  // Not a uuid: no such course (and Postgres would reject the query).
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("id", courseId)
    .eq("organizer_id", me.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data ? toCourse(data) : null;
}

/** My earlier courses that aren't closed yet (blocks funding approval). */
export async function listMyOpenPriorCourses(course: Course): Promise<Course[]> {
  return openPriorCourses(course, await listMyCourses());
}

/** Saved step data (checklists) of my course, by step number. */
export async function getMyStepData(courseId: string): Promise<Record<number, unknown>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("course_steps").select("step_no, data").eq("course_id", courseId);
  if (error) throw new Error(`Could not load the course steps: ${error.message}`);
  return Object.fromEntries(data.map((row) => [row.step_no, row.data]));
}

/** The campus-requirements checklist saved on step 1 of my course. */
export async function getMyStep1Requirements(courseId: string): Promise<boolean[]> {
  const saved = ((await getMyStepData(courseId))[1] as { requirements?: unknown } | undefined)?.requirements;
  return Array.isArray(saved) ? saved.map((v) => v === true) : [];
}

/** Students who completed my course (step 6). Not on the shared Course type (lib/types.ts is frozen). */
export async function getMyActualParticipants(courseId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses").select("actual_participants").eq("id", courseId).maybeSingle();
  if (error) throw new Error(`Could not load the course: ${error.message}`);
  return data?.actual_participants ?? null;
}

/** PDFs uploaded to my course, optionally of one kind, oldest first. */
export async function listMyCourseDocuments(
  courseId: string,
  kind?: "proof_of_funds" | "agreement" | "other",
): Promise<UploadedDocument[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select("id, file_name, size_bytes, created_at").eq("course_id", courseId);
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load the files: ${error.message}`);
  return data.map((d) => ({ id: d.id, name: d.file_name, size: formatFileSize(d.size_bytes), uploadedOn: formatMonthDay(d.created_at) }));
}

/**
 * Pricing from the admin-editable `settings` row (what request_invoice() charges), falling
 * back to the defaults in lib/pricing.ts if the row is missing or malformed.
 */
export async function getLivePricing(): Promise<PricingConstants> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", "pricing").maybeSingle();
  const v = data?.value as Partial<PricingConstants> | null | undefined;
  const ok =
    v &&
    typeof v.basePrice?.happiness === "number" &&
    typeof v.basePrice?.premium === "number" &&
    typeof v.includedStudents === "number" &&
    typeof v.extraStudentPrice === "number" &&
    typeof v.cardFeeRate === "number";
  return ok ? (v as PricingConstants) : DEFAULT_PRICING;
}

export type MyInvoice = {
  id: string;
  status: "requested" | "issued" | "sent_to_client" | "accounting_submitted" | "paid" | "closed" | "rejected";
  number: string | null;
  amount: number | null;
  dueDate: string | null;
  requestedAt: string;
};

/** The current (not rejected) invoice of my course, if one was requested. */
export async function getMyInvoice(courseId: string): Promise<MyInvoice | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, status, invoice_number, amount, due_date, requested_at")
    .eq("course_id", courseId)
    .neq("status", "rejected")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the invoice: ${error.message}`);
  return data
    ? { id: data.id, status: data.status, number: data.invoice_number, amount: data.amount, dueDate: data.due_date, requestedAt: data.requested_at }
    : null;
}

export type MyFundingRequest = {
  status: "draft" | "submitted" | "approved" | "needs_info";
  totalFunding: number | null;
  studentFee: number;
  neededBy: string | null; // yyyy-mm-dd
  priorFundingNote: string | null;
  reviewNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  documentIds: string[];
};

/** The step 3 funding request of my course, with raw values for the form. */
export async function getMyFundingRequest(courseId: string): Promise<MyFundingRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("funding_requests")
    .select("status, total_funding, student_fee, needed_by, prior_funding_note, review_note, submitted_at, reviewed_at, funding_request_documents(document_id)")
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the funding request: ${error.message}`);
  if (!data) return null;
  return {
    status: data.status,
    totalFunding: data.total_funding,
    studentFee: data.student_fee,
    neededBy: data.needed_by,
    priorFundingNote: data.prior_funding_note,
    reviewNote: data.review_note,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    documentIds: data.funding_request_documents.map((d) => d.document_id),
  };
}
