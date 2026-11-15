import { notFound } from "next/navigation";
import { formatRange } from "@/lib/dates";
import { courses, getCourse } from "@/lib/data/courses";
import { COURSE_TYPE_LABEL } from "@/lib/pricing";
import type { Course } from "@/lib/types";

/** Course pages are prerendered for every known course while we use mock data. */
export function courseStaticParams() {
  return courses.filter((c) => c.type !== null).map((c) => ({ courseId: c.id }));
}

export async function loadCourse(params: Promise<{ courseId: string }>): Promise<Course> {
  const { courseId } = await params;
  const course = getCourse(courseId);
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
