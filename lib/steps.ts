import type { StepStatus, Tone } from "./types";

export const STEP_NAMES = [
  "Campus requirements",
  "Post on Journey",
  "Funding approval",
  "Quote & invoice",
  "Sign-ups & orientation",
  "Attendance",
  "Course accounting",
  "Payment & closure",
] as const;

/** Landing-page descriptions for each step. */
export const STEP_OVERVIEW = [
  { phase: "Before", title: "Campus requirements", desc: "Follow your university’s event, room and funding deadlines." },
  { phase: "Before", title: "Post on Journey", desc: "Post the course and save its Journey course ID." },
  { phase: "Before", title: "Funding approval", desc: "If the school or a sponsor pays, upload proof of funds for a $0 student fee." },
  { phase: "Before", title: "Quote & invoice", desc: "Request a quote first if your school needs one, then the invoice." },
  { phase: "Before", title: "Sign-ups & orientation", desc: "Collect sign-ups, hold orientation calls, share the Journey link." },
  { phase: "After", title: "Record attendance", desc: "Mark each student complete, dropout or no-show in Journey." },
  { phase: "After", title: "Course accounting", desc: "Enter the invoice number and submit the course for closure." },
  { phase: "After", title: "Payment & closure", desc: "Track the school’s payment until the course is fully closed." },
] as const;

export const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  done: "Done",
  in_progress: "In progress",
  waiting: "Waiting on IAHV",
  todo: "To do",
  skipped: "Skipped",
};

/** Tailwind classes for a progress-bar segment. */
export const SEGMENT_CLASS: Record<StepStatus, string> = {
  done: "bg-brand",
  in_progress: "bg-brand-light",
  waiting: "bg-amber",
  todo: "bg-line-2",
  skipped: "bg-white border border-dashed border-skip",
};

export const TONE_CLASS: Record<Tone, string> = {
  waiting: "bg-warn-bg text-warn-fg",
  late: "bg-danger-bg text-danger-fg",
  ok: "bg-ok-bg text-ok-fg",
  info: "bg-tint text-brand-dark",
};

/** The step the course is currently on (first one not done or skipped). */
export function currentStep(steps: StepStatus[]): number {
  const i = steps.findIndex((s) => s !== "done" && s !== "skipped");
  return i === -1 ? steps.length : i + 1;
}

export function doneCount(steps: StepStatus[]): number {
  return steps.filter((s) => s === "done").length;
}

/** Screen-reader summary of a progress bar, e.g. "Steps 1 and 2 done, step 3 waiting on IAHV". */
export function describeSteps(steps: StepStatus[]): string {
  const groups: string[] = [];
  let i = 0;
  while (i < steps.length) {
    let j = i;
    while (j + 1 < steps.length && steps[j + 1] === steps[i]) j++;
    const range = i === j ? `step ${i + 1}` : `steps ${i + 1} to ${j + 1}`;
    groups.push(`${range} ${STEP_STATUS_LABEL[steps[i]].toLowerCase()}`);
    i = j + 1;
  }
  const text = groups.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
