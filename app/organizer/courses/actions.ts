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

type Db = Awaited<ReturnType<typeof createClient>>;

export type CourseFormState = { errors?: FieldErrors };

/** Finds a campus by name (ignoring case), adding it if it isn't listed yet. */
async function campusId(db: Db, name: string | undefined): Promise<string | null> {
  if (!name) return null;
  const find = async () => {
    const pattern = name.replace(/[\\%_]/g, (c) => `\\${c}`);
    const { data, error } = await db.from("campuses").select("id").ilike("name", pattern).limit(1).maybeSingle();
    if (error) throw new Error(`Could not look up the campus: ${error.message}`);
    return data?.id ?? null;
  };
  const existing = await find();
  if (existing) return existing;
  const { data, error } = await db.from("campuses").insert({ name }).select("id").single();
  if (!error) return data.id;
  if (error.code === "23505") return find(); // added by someone else a moment ago
  throw new Error(`Could not add the campus: ${error.message}`);
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

  const { data: id, error } = await db.rpc("create_course", {
    p_name: c.name,
    p_course_type: c.type,
    p_format: c.format,
    p_start_date: c.startDate,
    p_end_date: c.endDate,
    p_campus_id: (await campusId(db, c.university)) ?? undefined,
    p_teachers: c.teachers,
    p_est_participants: c.estParticipants,
    p_funding_sources: c.funders,
    p_step1_data: { requirements },
  });
  if (error) throw new Error(`Could not create the course: ${error.message}`);

  await saveStep1(db, id, c, complete, requirements, me.id);
  await logEvent(id, "course.created", { name: c.name, complete });
  return id;
}

/** Updates one of the signed-in organizer's courses. Fields left empty are cleared. */
export async function updateCourse(courseId: string, input: unknown, intent: "draft" | "continue" = "continue"): Promise<void> {
  const me = await requireRole("organizer");
  const { data: c, complete, requirements } = parseOrThrow(input, intent);
  const db = await createClient();

  const { data, error } = await db
    .from("courses")
    .update({
      name: c.name,
      course_type: c.type ?? null,
      format: c.format ?? "in_person",
      start_date: c.startDate ?? null,
      end_date: c.endDate ?? null,
      campus_id: await campusId(db, c.university),
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
