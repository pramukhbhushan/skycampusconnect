// Step 1 form: reading, validating and the rules around it. Pure, so the browser
// preview and the server action agree. Owner: Engineer A (Aryan).

import { courseSchema, type CourseInput } from "@/lib/validation";
import type { Funder, StepStatus } from "@/lib/types";

/** Campus requirements checklist on step 1 (stored in course_steps.data for step 1). */
export const REQUIREMENTS = [
  { title: "Event request submitted to my university", hint: "Some campuses need this 2+ weeks ahead (e.g. Purdue)." },
  { title: "Room booked for all three days", hint: "Friday and Saturday sessions are required to complete the course." },
  { title: "Campus funding application submitted", hint: "Only if your school, a sponsor or donor is paying." },
] as const;

export type Step1Data = { requirements: boolean[] };

/** A saved draft only needs a name; everything else may be filled in later. */
export type CourseDraft = { name: string } & Partial<Omit<CourseInput, "name">>;

export type FieldErrors = Partial<Record<keyof CourseInput | "form", string>>;

export type ParsedCourse =
  | { ok: true; data: CourseDraft; complete: boolean; requirements: boolean[] }
  | { ok: false; errors: FieldErrors };

export function needsFundingApproval(funders: readonly Funder[]): boolean {
  return funders.some((f) => f !== "students");
}

/** Step 1 is done when the details are complete and every campus requirement that applies is ticked. */
export function step1Status(complete: boolean, funders: readonly Funder[], requirements: readonly boolean[]): StepStatus {
  const applies = REQUIREMENTS.map((_, i) => i !== 2 || needsFundingApproval(funders));
  const allTicked = applies.every((needed, i) => !needed || requirements[i] === true);
  return complete && allTicked ? "done" : "in_progress";
}

function text(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

/** FormData from the step 1 form -> plain values (not yet validated). */
export function readCourseForm(fd: FormData): Record<string, unknown> {
  const count = text(fd, "estParticipants");
  return {
    name: text(fd, "name") ?? "",
    type: text(fd, "type"),
    format: text(fd, "format"),
    startDate: text(fd, "startDate"),
    endDate: text(fd, "endDate"),
    university: text(fd, "university"),
    teachers: text(fd, "teachers"),
    estParticipants: count === undefined ? undefined : Number(count),
    funders: fd.getAll("funders").filter((v): v is string => typeof v === "string"),
    requirements: REQUIREMENTS.map((_, i) => fd.get(`requirement${i}`) === "on"),
  };
}

function firstErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = (issue.path[0] ?? "form") as keyof FieldErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}

/**
 * Validates step 1 values. "continue" needs every field (Bhushan's courseSchema);
 * "draft" needs only a name, but anything filled in must still be valid.
 */
export function parseCourse(raw: Record<string, unknown>, intent: "draft" | "continue"): ParsedCourse {
  const requirements = Array.isArray(raw.requirements) ? raw.requirements.map((r) => r === true) : [];
  const values = { ...raw };
  delete values.requirements;

  const full = courseSchema.safeParse(values);
  if (full.success) return { ok: true, data: full.data, complete: true, requirements };
  if (intent === "continue") return { ok: false, errors: firstErrors(full.error.issues) };

  // Draft: check only what was filled in.
  const shape = courseSchema.shape;
  const errors: FieldErrors = {};
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const v = values[key];
    const empty = v === undefined || (Array.isArray(v) && v.length === 0);
    if (empty && key !== "name") continue;
    const r = shape[key].safeParse(v);
    if (r.success) data[key] = r.data;
    else errors[key] = r.error.issues[0]?.message ?? "Check this field";
  }
  if (typeof data.startDate === "string" && typeof data.endDate === "string" && data.endDate < data.startDate) {
    errors.endDate = "End date can't be before the start date";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as CourseDraft, complete: false, requirements };
}
