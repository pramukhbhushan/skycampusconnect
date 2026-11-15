// Checklists for steps 2, 5 and 6 (sprint-planning.md A-2.2). Step 1's checklist lives on
// the course details form (lib/organizer/course-form.ts). Pure, so the page and the server
// action agree. Owner: Engineer A (Aryan).

import type { StepStatus } from "@/lib/types";

export type ChecklistStep = 2 | 5 | 6;

type Field = { key: "journeyCourseId" | "actualParticipants"; label: string; hint: string; numeric: boolean };

export const CHECKLISTS: Record<ChecklistStep, { items: readonly string[]; field?: Field }> = {
  2: {
    items: ["Course posted on Journey", "Course details on Journey match this course (dates, type, campus)"],
    field: { key: "journeyCourseId", label: "Journey course ID", hint: "Shown on the course page in Journey, e.g. J-104582.", numeric: false },
  },
  5: {
    items: [
      "Sign-ups collected",
      "Orientation calls held: every student can attend all three days",
      "Journey link shared with every student",
    ],
  },
  6: {
    items: ["Attendance marked in Journey for every student (complete, dropout or no-show)"],
    field: { key: "actualParticipants", label: "Students who completed the course", hint: "From your Journey attendance.", numeric: true },
  },
};

export function isChecklistStep(n: number): n is ChecklistStep {
  return n === 2 || n === 5 || n === 6;
}

export type StepUpdate = { checks: boolean[]; journeyCourseId?: string | null; actualParticipants?: number | null };
export type StepErrors = Partial<Record<"journeyCourseId" | "actualParticipants" | "form", string>>;

const JOURNEY_ID = /^[A-Za-z0-9][A-Za-z0-9-]{1,39}$/;

/** Validates a checklist submission for one step. */
export function parseStepUpdate(
  step: ChecklistStep,
  raw: { checks?: unknown; value?: unknown },
): { ok: true; update: StepUpdate } | { ok: false; errors: StepErrors } {
  const count = CHECKLISTS[step].items.length;
  const checks = Array.from({ length: count }, (_, i) => Array.isArray(raw.checks) && raw.checks[i] === true);
  const field = CHECKLISTS[step].field;
  if (!field) return { ok: true, update: { checks } };

  const text = typeof raw.value === "string" ? raw.value.trim() : raw.value === undefined || raw.value === null ? "" : String(raw.value);
  if (text === "") return { ok: true, update: { checks, [field.key]: null } };

  if (field.key === "journeyCourseId") {
    if (!JOURNEY_ID.test(text)) return { ok: false, errors: { journeyCourseId: "Use the ID from Journey, like J-104582" } };
    return { ok: true, update: { checks, journeyCourseId: text } };
  }
  const n = Number(text);
  if (!Number.isInteger(n) || n < 0 || n > 500) {
    return { ok: false, errors: { actualParticipants: "Enter a whole number from 0 to 500" } };
  }
  return { ok: true, update: { checks, actualParticipants: n } };
}

/** Done when every box is ticked and the step's field (if any) is filled in. */
export function checklistStatus(step: ChecklistStep, update: StepUpdate): StepStatus {
  const field = CHECKLISTS[step].field;
  const fieldDone = !field || (update[field.key] !== null && update[field.key] !== undefined);
  if (update.checks.every(Boolean) && fieldDone) return "done";
  if (update.checks.some(Boolean) || (field && fieldDone)) return "in_progress";
  return "todo";
}

/** Saved checklist ticks from course_steps.data. */
export function savedChecks(step: ChecklistStep, data: unknown): boolean[] {
  const checks = (data as { checks?: unknown } | null)?.checks;
  return CHECKLISTS[step].items.map((_, i) => Array.isArray(checks) && checks[i] === true);
}
