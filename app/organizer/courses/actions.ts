"use server";
// Step 1 server actions (sprint-planning.md section 3: createCourse, updateCourse).
// Owner: Engineer A (Aryan). Every action checks the role and validates its input
// itself, because server actions can be called directly, not only from our forms.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logEvent } from "@/lib/data/events";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/require-role";
import {
  needsFundingApproval,
  parseCourse,
  readCourseForm,
  step1Status,
  type CourseDraft,
  type FieldErrors,
} from "@/lib/organizer/course-form";
import {
  checklistStatus,
  isChecklistStep,
  parseStepUpdate,
  type ChecklistStep,
  type StepErrors,
} from "@/lib/organizer/step-checklists";

type Db = Awaited<ReturnType<typeof createClient>>;

export type CourseFormState = { errors?: FieldErrors };

type Campus = { id: string; country: string };

/** Finds a campus by name (ignoring case), adding it if it isn't listed yet. */
async function findOrAddCampus(db: Db, name: string | undefined): Promise<Campus | null> {
  if (!name) return null;
  const find = async () => {
    const pattern = name.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data, error } = await db.from("campuses").select("id, country").ilike("name", pattern).limit(1).maybeSingle();
    if (error) throw new Error(`Could not look up the campus: ${error.message}`);
    return data ?? null;
  };
  const existing = await find();
  if (existing) return existing;
  // A new campus starts as US (column default); IAHV admins correct the country in the campus list.
  const { data, error } = await db.from("campuses").insert({ name }).select("id, country").single();
  if (!error) return data;
  if (error.code === "23505") return find(); // added by someone else a moment ago
  throw new Error(`Could not add the campus: ${error.message}`);
}

/** A course's country and currency follow its campus (Toronto -> CA, CAD). */
function locale(campus: Campus | null): { country: "US" | "CA"; currency: "USD" | "CAD" } {
  return campus?.country === "CA" ? { country: "CA", currency: "CAD" } : { country: "US", currency: "USD" };
}

async function saveStep1(db: Db, courseId: string, draft: CourseDraft, complete: boolean, requirements: boolean[], userId: string) {
  const status = step1Status(complete, draft.funders ?? [], requirements);
  const { error } = await db
    .from("course_steps")
    .update({
      status,
      data: { requirements },
      completed_at: status === "done" ? new Date().toISOString() : null,
      completed_by: status === "done" ? userId : null,
    })
    .eq("course_id", courseId)
    .eq("step_no", 1);
  if (error) throw new Error(`Could not save the campus requirements: ${error.message}`);
}

function parseOrThrow(input: unknown, intent: "draft" | "continue") {
  const parsed = parseCourse((input ?? {}) as Record<string, unknown>, intent);
  if (!parsed.ok) throw new Error(`Invalid course: ${Object.values(parsed.errors).join("; ")}`);
  return parsed;
}

/** Creates a course (and its 8 steps) for the signed-in organizer. Returns its id. */
export async function createCourse(input: unknown, intent: "draft" | "continue" = "continue"): Promise<string> {
  const me = await requireRole("organizer");
  const { data: c, complete, requirements } = parseOrThrow(input, intent);
  const db = await createClient();
  const campus = await findOrAddCampus(db, c.university);

  const { data: id, error } = await db.rpc("create_course", {
    p_name: c.name,
    p_course_type: c.type,
    p_format: c.format,
    p_start_date: c.startDate,
    p_end_date: c.endDate,
    p_campus_id: campus?.id,
    p_teachers: c.teachers,
    p_est_participants: c.estParticipants,
    p_funding_sources: c.funders,
    p_step1_data: { requirements },
  });
  if (error) throw new Error(`Could not create the course: ${error.message}`);
  // create_course has no country/currency parameters; set them from the campus.
  const placed = await db.from("courses").update(locale(campus)).eq("id", id);
  if (placed.error) throw new Error(`Could not set the course country: ${placed.error.message}`);

  await saveStep1(db, id, c, complete, requirements, me.id);
  await logEvent(id, "course.created", { name: c.name, complete });
  return id;
}

/** Updates one of the signed-in organizer's courses. Fields left empty are cleared. */
export async function updateCourse(courseId: string, input: unknown, intent: "draft" | "continue" = "continue"): Promise<void> {
  const me = await requireRole("organizer");
  const { data: c, complete, requirements } = parseOrThrow(input, intent);
  const db = await createClient();
  const campus = await findOrAddCampus(db, c.university);

  const { data, error } = await db
    .from("courses")
    .update({
      name: c.name,
      course_type: c.type ?? null,
      format: c.format ?? "in_person",
      start_date: c.startDate ?? null,
      end_date: c.endDate ?? null,
      campus_id: campus?.id ?? null,
      ...locale(campus),
      teachers: c.teachers ?? null,
      est_participants: c.estParticipants ?? null,
      funding_sources: c.funders ?? [],
    })
    .eq("id", courseId)
    .eq("organizer_id", me.id)
    .select("id");
  if (error) throw new Error(`Could not save the course: ${error.message}`);
  if (data.length === 0) throw new Error("Course not found");

  await saveStep1(db, courseId, c, complete, requirements, me.id);
  await logEvent(courseId, "course.updated", { complete });
}

/** The step 1 form: saves as a draft or continues to the next step. */
export async function saveCourseForm(_prev: CourseFormState, fd: FormData): Promise<CourseFormState> {
  const intent = fd.get("intent") === "draft" ? "draft" : "continue";
  const existingId = typeof fd.get("courseId") === "string" ? (fd.get("courseId") as string) : "";
  const raw = readCourseForm(fd);

  const parsed = parseCourse(raw, intent);
  if (!parsed.ok) return { errors: parsed.errors };

  let id = existingId;
  try {
    if (existingId) await updateCourse(existingId, raw, intent);
    else id = await createCourse(raw, intent);
  } catch (e) {
    return { errors: { form: e instanceof Error ? e.message : "Something went wrong. Please try again." } };
  }

  revalidatePath("/organizer");
  if (intent === "draft") redirect("/organizer");
  redirect(needsFundingApproval(parsed.data.funders ?? []) ? `/organizer/courses/${id}/funding` : `/organizer/courses/${id}/invoice`);
}

export type StepFormState = { errors?: StepErrors; saved?: boolean };

/**
 * Saves the checklist of step 2, 5 or 6 on one of the signed-in organizer's courses.
 * Step 2 also saves the Journey course ID; step 6 the number of students who completed.
 */
export async function updateStep(courseId: string, stepNo: number, input: unknown): Promise<void> {
  const me = await requireRole("organizer");
  if (!isChecklistStep(stepNo)) throw new Error(`Step ${stepNo} has no checklist`);
  const step: ChecklistStep = stepNo;
  const parsed = parseStepUpdate(step, (input ?? {}) as { checks?: unknown; value?: unknown });
  if (!parsed.ok) throw new Error(`Invalid step: ${Object.values(parsed.errors).join("; ")}`);
  const { update } = parsed;
  const db = await createClient();

  // Course fields first; also proves the course is the caller's.
  const courseFields =
    step === 2 ? { journey_course_id: update.journeyCourseId ?? null } : step === 6 ? { actual_participants: update.actualParticipants ?? null } : {};
  const owned = Object.keys(courseFields).length
    ? await db.from("courses").update(courseFields).eq("id", courseId).eq("organizer_id", me.id).select("id")
    : await db.from("courses").select("id").eq("id", courseId).eq("organizer_id", me.id);
  if (owned.error) throw new Error(`Could not save the step: ${owned.error.message}`);
  if (owned.data.length === 0) throw new Error("Course not found");

  const status = checklistStatus(step, update);
  const { error } = await db
    .from("course_steps")
    .update({
      status,
      data: { checks: update.checks },
      completed_at: status === "done" ? new Date().toISOString() : null,
      completed_by: status === "done" ? me.id : null,
    })
    .eq("course_id", courseId)
    .eq("step_no", step);
  if (error) throw new Error(`Could not save the step: ${error.message}`);

  await logEvent(courseId, "step.updated", { step, status });
}

/** The checklist form on the course page. Stays on the page and shows "Saved". */
export async function saveStepForm(_prev: StepFormState, fd: FormData): Promise<StepFormState> {
  const courseId = String(fd.get("courseId") ?? "");
  const stepNo = Number(fd.get("stepNo"));
  if (!isChecklistStep(stepNo)) return { errors: { form: "Unknown step" } };
  // Checkboxes only submit when ticked, so read them by index.
  const raw = {
    checks: Array.from({ length: 3 }, (_, i) => fd.get(`check${i}`) === "on"),
    value: fd.get("value") ?? undefined,
  };

  const parsed = parseStepUpdate(stepNo, raw);
  if (!parsed.ok) return { errors: parsed.errors };
  try {
    await updateStep(courseId, stepNo, raw);
  } catch (e) {
    return { errors: { form: e instanceof Error ? e.message : "Something went wrong. Please try again." } };
  }
  revalidatePath(`/organizer/courses/${courseId}`);
  revalidatePath("/organizer");
  return { saved: true };
}
