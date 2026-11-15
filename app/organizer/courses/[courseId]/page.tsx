import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CourseHeader } from "@/components/course-stepper";
import { StatusPill } from "@/components/ui";
import { getMyActualParticipants, getMyCourse, getMyStepData } from "@/lib/data/organizer-db";
import { savedChecks, isChecklistStep } from "@/lib/organizer/step-checklists";
import { STEP_NAMES, STEP_OVERVIEW, STEP_STATUS_LABEL } from "@/lib/steps";
import type { StepStatus, Tone } from "@/lib/types";
import { courseSubtitle } from "./course-data";
import { StepChecklistForm } from "./step-checklist-form";

export const metadata: Metadata = { title: "Course" };

const TONE: Record<StepStatus, Tone> = {
  done: "ok",
  in_progress: "info",
  waiting: "waiting",
  todo: "info",
  locked: "info",
  skipped: "info",
};

// Course overview: all 8 steps, with the checklists for steps 2, 5 and 6 inline.
export default async function CoursePage({ params }: PageProps<"/organizer/courses/[courseId]">) {
  const { courseId } = await params;
  const course = await getMyCourse(courseId);
  if (!course) notFound();
  if (!course.type) redirect(`/organizer/courses/${course.id}/details`); // drafts finish step 1 first
  const [stepData, actualParticipants] = await Promise.all([getMyStepData(course.id), getMyActualParticipants(course.id)]);
  const base = `/organizer/courses/${course.id}`;

  const stepLink = (n: number): { href: string; label: string } | null => {
    if (n === 1) return { href: `${base}/details`, label: "Edit course details" };
    if (n === 3 && course.steps[2] !== "skipped") return { href: `${base}/funding`, label: "Open funding request" };
    if (n === 4) return { href: `${base}/invoice`, label: "Open quote & invoice" };
    if (n === 7 || n === 8) return { href: `${base}/invoice`, label: "Open course accounting" };
    return null;
  };

  return (
    <>
      <CourseHeader title={course.name} subtitle={courseSubtitle(course)} steps={course.steps} />
      <main className="mx-auto flex max-w-[1240px] flex-col gap-4 px-8 pt-8 pb-16">
        {STEP_NAMES.map((name, i) => {
          const n = i + 1;
          const status = course.steps[i];
          const link = stepLink(n);
          return (
            <section key={name} aria-labelledby={`step-${n}`} className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-bold tracking-[0.06em] text-brand uppercase">Step {n} of 8</span>
                  <h2 id={`step-${n}`} className="text-xl font-bold">{name}</h2>
                  <p className="text-[15px] text-muted">{STEP_OVERVIEW[i].desc}</p>
                </div>
                <StatusPill tone={TONE[status]}>{STEP_STATUS_LABEL[status]}</StatusPill>
              </div>
              {isChecklistStep(n) && status !== "skipped" ? (
                <StepChecklistForm
                  courseId={course.id}
                  step={n}
                  checks={savedChecks(n, stepData[n])}
                  value={n === 2 ? course.journeyCourseId ?? "" : n === 6 ? String(actualParticipants ?? "") : ""}
                />
              ) : (
                link &&
                status !== "skipped" && (
                  <Link href={link.href} className="self-start text-[15px] font-semibold">
                    {link.label} →
                  </Link>
                )
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
