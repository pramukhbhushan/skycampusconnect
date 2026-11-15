// Organizer data from Supabase (A-1.1). Owner: Engineer A (Aryan).
// The sample-data files (courses.ts, organizer.ts) stay as they are for the admin
// pages until B-1.1 moves them to the database; the organizer pages read from here.
//
// Every query runs as the signed-in user, so row-level security limits it to their own
// courses. These read cookies: call them from code that sits behind <Suspense>.

import { cache } from "react";
import type { Course } from "@/lib/types";
import { requireRole, type CurrentUser } from "@/lib/supabase/require-role";
import { createClient } from "@/lib/supabase/server";
import { COURSE_SELECT, initialsOf, openPriorCourses, toCourse } from "./course-mapper";

/** The signed-in organizer, checked once per request. */
export const getMe = cache(async (): Promise<CurrentUser & { initials: string }> => {
  const me = await requireRole("organizer");
  return { ...me, initials: initialsOf(me.name, me.email) };
});

/** My courses, soonest first (drafts without dates last). */
export const listMyCourses = cache(async (): Promise<Course[]> => {
  const me = await getMe();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(COURSE_SELECT)
    .eq("organizer_id", me.id)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Could not load your courses: ${error.message}`);
  return data.map(toCourse);
});

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

/** The campus-requirements checklist saved on step 1 of my course. */
export async function getMyStep1Requirements(courseId: string): Promise<boolean[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_steps")
    .select("data")
    .eq("course_id", courseId)
    .eq("step_no", 1)
    .maybeSingle();
  if (error) throw new Error(`Could not load step 1: ${error.message}`);
  const saved = (data?.data as { requirements?: unknown } | null)?.requirements;
  return Array.isArray(saved) ? saved.map((v) => v === true) : [];
}
