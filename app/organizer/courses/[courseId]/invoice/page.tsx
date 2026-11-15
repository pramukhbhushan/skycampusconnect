import type { Metadata } from "next";
import { CourseHeader } from "@/components/course-stepper";
import type { StepStatus } from "@/lib/types";
import { courseStaticParams, courseSubtitle, loadCourse } from "../course-data";
import { InvoiceForm } from "./invoice-form";

export const metadata: Metadata = { title: "Invoice request" };

export const generateStaticParams = courseStaticParams;

// Step 4 · Quote & invoice request.
export default async function InvoicePage({ params }: PageProps<"/organizer/courses/[courseId]/invoice">) {
  const course = await loadCourse(params);
  const steps: StepStatus[] = course.steps.map((s, i) => (i === 3 && s === "todo" ? "in_progress" : s));

  return (
    <>
      <CourseHeader title={course.name} subtitle={courseSubtitle(course)} steps={steps} />
      <InvoiceForm
        courseId={course.id}
        courseType={course.type!}
        endDate={course.endDate!}
        initialParticipants={course.estParticipants ?? 10}
        client={course.client ?? { fullName: course.university ?? "" }}
        funding={course.funding}
        agreementSigned={(course.funding?.agreement ?? "yes") === "yes"}
      />
    </>
  );
}
