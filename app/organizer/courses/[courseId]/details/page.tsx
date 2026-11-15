import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMyCourse, getMyStep1Requirements } from "@/lib/data/organizer-db";
import { CourseDetailsForm } from "../../new/course-details-form";

export const metadata: Metadata = { title: "Course details" };

// Step 1 · Course details & campus requirements, for an existing course (including drafts).
export default async function CourseDetailsPage({ params }: PageProps<"/organizer/courses/[courseId]/details">) {
  const { courseId } = await params;
  const course = await getMyCourse(courseId);
  if (!course) notFound();
  const requirements = await getMyStep1Requirements(course.id);

  return (
    <CourseDetailsForm
      courseId={course.id}
      initial={{
        name: course.name,
        type: course.type,
        format: course.format,
        startDate: course.startDate ?? "",
        endDate: course.endDate ?? "",
        university: course.university ?? "",
        teachers: course.teachers ?? "",
        estParticipants: course.estParticipants,
        funders: course.funders,
      }}
      requirements={requirements}
    />
  );
}
