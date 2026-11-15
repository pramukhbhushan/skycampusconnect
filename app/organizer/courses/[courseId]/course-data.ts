import { notFound } from "next/navigation";
import { formatRange } from "@/lib/dates";
import { getMyCourse } from "@/lib/data/organizer-db";
import { COURSE_TYPE_LABEL } from "@/lib/pricing";
import type { Course } from "@/lib/types";

/** My course for this URL; 404 if it doesn't exist, isn't mine, or is still an untyped draft. */
export async function loadCourse(params: Promise<{ courseId: string }>): Promise<Course> {
  const { courseId } = await params;
  const course = await getMyCourse(courseId);
  if (!course || !course.type) notFound();
  return course;
}

/** "SKY Happiness Retreat · University of Maryland, College Park · Mar 5–7, 2027 · Journey ID J-104582" */
export function courseSubtitle(course: Course): string {
  return [
    course.type && COURSE_TYPE_LABEL[course.type],
    course.university,
    formatRange(course.startDate, course.endDate),
    course.journeyCourseId && `Journey ID ${course.journeyCourseId}`,
  ]
    .filter(Boolean)
    .join(" · ");
}
