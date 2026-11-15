// What the "My courses" card says for a course: a status, the next action or blocker, and
// where its button goes (sprint-planning.md A-2.3). Pure. Owner: Engineer A (Aryan).
//
// Order of precedence: something the organizer must fix (IAHV asked for more information,
// an invoice # to enter in Journey) beats something waiting on IAHV, which beats the next
// step to do.

import type { CourseProgress } from "@/lib/data/course-mapper";
import { formatMonthDay } from "@/lib/data/course-mapper";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import type { Course, OrganizerCourseCard, Tone } from "@/lib/types";

const NO_PROGRESS: CourseProgress = { funding: null, invoice: null };

/** Invoice states in which IAHV has issued a number the organizer can use. */
const NUMBERED = new Set(["issued", "sent_to_client"]);

export function courseCard(course: Course, progress: CourseProgress = NO_PROGRESS): OrganizerCourseCard {
  const base = `/organizer/courses/${course.id}`;
  const card = (statusLabel: string, tone: Tone, next: string, label: string, href: string): OrganizerCourseCard => ({
    courseId: course.id,
    statusLabel,
    tone,
    next,
    cta: { label, href },
  });

  if (!course.type) {
    return card("Draft", "info", "Add your campus, dates and course type to unlock the rest of your steps.", "Continue setup", `${base}/details`);
  }
  if (course.steps.every((s) => s === "done" || s === "skipped")) {
    return card("Closed", "ok", "This course is complete. Nothing more to do.", "View course", base);
  }

  const { funding, invoice } = progress;
  const needsFunding = course.steps[2] !== "skipped";

  // 1. Things only the organizer can unblock.
  if (needsFunding && funding?.status === "needs_info") {
    return card(
      "Action due",
      "late",
      `IAHV needs more information on your funding request${funding.reviewNote ? `: “${funding.reviewNote}”` : "."} Update it and submit again.`,
      "Update funding request",
      `${base}/funding`,
    );
  }
  if (invoice && NUMBERED.has(invoice.status) && invoice.number && course.steps[6] !== "done") {
    const ended = course.endDate !== null && course.steps[5] === "done";
    return ended
      ? card(
          "Action due",
          "late",
          `Enter invoice #${invoice.number} in Journey course accounting and submit the course for closure.`,
          "Open course accounting",
          `${base}/invoice`,
        )
      : card(
          "In progress",
          "info",
          `Invoice #${invoice.number} is ready. Check it and forward it to the university.`,
          "View invoice",
          `${base}/invoice`,
        );
  }

  // 2. Waiting on IAHV, with what the organizer can do meanwhile.
  if (needsFunding && funding?.status === "submitted") {
    const sent = funding.submittedAt ? ` (sent ${formatMonthDay(funding.submittedAt)})` : "";
    return invoice
      ? card("Waiting on IAHV", "waiting", `IAHV is reviewing your funding request${sent} and will issue your invoice # after approval.`, "View funding request", `${base}/funding`)
      : card(
          "Waiting on IAHV",
          "waiting",
          `IAHV is reviewing your funding request${sent}. You can start the invoice request meanwhile.`,
          "Start invoice request",
          `${base}/invoice`,
        );
  }
  if (invoice?.status === "requested") {
    return card(
      "Waiting on IAHV",
      "waiting",
      `IAHV is issuing your invoice # (requested ${formatMonthDay(invoice.requestedAt)}), usually in 2–4 business days.`,
      "View invoice request",
      `${base}/invoice`,
    );
  }

  // 3. The next step to do.
  const step = currentStep(course.steps);
  const name = STEP_NAMES[step - 1];
  const todo = (next: string, label: string, href: string) => card("In progress", "info", `Step ${step} · ${name}: ${next}`, label, href);

  switch (step) {
    case 1:
      return todo("finish your course details and campus requirements.", "Continue setup", `${base}/details`);
    case 2:
      return todo(
        course.journeyCourseId ? "tick off the Journey checklist." : "post the course on Journey and add its course ID.",
        "Open step 2",
        base,
      );
    case 3:
      return course.journeyCourseId
        ? todo("request funding approval with your proof of funds.", "Request funding approval", `${base}/funding`)
        : todo("add the Journey course ID (step 2) first; IAHV needs it to approve funding.", "Add Journey ID", base);
    case 4:
      return todo("request your invoice.", "Request invoice", `${base}/invoice`);
    case 5:
      return todo("collect sign-ups, hold orientation calls and share the Journey link.", "Open step 5", base);
    case 6:
      return todo("mark attendance in Journey and record how many students completed.", "Open step 6", base);
    case 7:
      return invoice?.number
        ? todo(`enter invoice #${invoice.number} in Journey course accounting.`, "Open course accounting", `${base}/invoice`)
        : card("Waiting on IAHV", "waiting", "Course accounting needs your invoice #, which IAHV hasn't issued yet.", "View invoice", `${base}/invoice`);
    default:
      return card("Waiting on IAHV", "waiting", "Waiting for the university's payment. IAHV closes the course once it's paid.", "View invoice", `${base}/invoice`);
  }
}
