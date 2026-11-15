// What the "My courses" card says for a course. Owner: Engineer A (Aryan).
// Basic version for A-1.1; A-2.3 adds real blocker text.

import { STEP_NAMES, currentStep } from "@/lib/steps";
import type { Course, OrganizerCourseCard } from "@/lib/types";

export function courseCard(course: Course): OrganizerCourseCard {
  const base = `/organizer/courses/${course.id}`;

  if (!course.type) {
    return {
      courseId: course.id,
      statusLabel: "Draft",
      tone: "info",
      next: "Add your campus, dates and course type to unlock the rest of your steps.",
      cta: { label: "Continue setup", href: `${base}/details` },
    };
  }

  if (course.steps.every((s) => s === "done" || s === "skipped")) {
    return {
      courseId: course.id,
      statusLabel: "Closed",
      tone: "ok",
      next: "This course is complete. Nothing more to do.",
      cta: { label: "View course", href: `${base}/invoice` },
    };
  }

  const step = currentStep(course.steps);
  const status = course.steps[step - 1];
  const name = STEP_NAMES[step - 1];
  // Until A-2.2 adds pages for every step, steps without their own page link to the nearest one.
  const href = step === 3 ? `${base}/funding` : step >= 4 ? `${base}/invoice` : `${base}/details`;

  if (status === "waiting") {
    const onOrganizer = step === 7;
    return {
      courseId: course.id,
      statusLabel: onOrganizer ? "Action due" : "Waiting on IAHV",
      tone: onOrganizer ? "late" : "waiting",
      next: onOrganizer
        ? `Step ${step} · ${name}: enter your invoice number in Journey and submit for closure.`
        : `Step ${step} · ${name}: IAHV is reviewing. You can keep working on other steps meanwhile.`,
      cta: { label: `Open step ${step}`, href },
    };
  }

  return {
    courseId: course.id,
    statusLabel: "In progress",
    tone: "info",
    next: `Step ${step} · ${name} is next.`,
    cta: { label: `Open step ${step}`, href },
  };
}
