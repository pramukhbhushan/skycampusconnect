// Sample data until the backend lands. Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Swap the function bodies for Supabase queries; keep the signatures.

import { formatRange } from "@/lib/dates";
import { computeFee } from "@/lib/pricing";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import type { AdminCourseRow, AdminQueue, Course, Organizer, StepStatus } from "@/lib/types";
import { courses, getCourse } from "./courses";
import { getOrganizer } from "./organizer";

export const adminUser = { name: "IAHV Admin", initials: "IA", email: "admin@iahv.org" };

export type Country = "US" | "CA";

/** Dashboard filters, as read from the URL (see app/admin/filters.ts). */
export type AdminFilters = {
  queue: AdminQueue | "all";
  campus: string | null;
  step: number | null; // 1-8: the step the course is on
  country: Country | null;
  q: string; // search: course, campus or organizer
};

export const NO_FILTERS: AdminFilters = { queue: "all", campus: null, step: null, country: null, q: "" };

/** One row of the admin dashboard table. */
export type AdminDashboardRow = AdminCourseRow & {
  id: string;
  name: string;
  campus: string;
  country: Country;
  organizer: string;
  dates: string;
  steps: StepStatus[];
  step: number;
  stepName: string;
};

export type AdminDashboard = {
  rows: AdminDashboardRow[];
  /** Courses per queue, counted after campus/step/country/search but before the queue filter. */
  queueCounts: Record<AdminQueue | "all", number>;
  /** Every campus with a course, for the campus filter. */
  campuses: string[];
};

const detail = (id: string) => `/admin/courses/${id}`;
const reminders = "/admin/reminders";

type SampleRow = AdminCourseRow & { country: Country };

const adminRows: SampleRow[] = [
  { courseId: "umd-spring-2027", country: "US", queue: "funding", statusLabel: "Funding approval", tone: "waiting", dueLabel: "Needed by Nov 26", late: false, action: { label: "Review & approve", href: detail("umd-spring-2027"), primary: true } },
  { courseId: "purdue-winter-2027", country: "US", queue: "invoice", statusLabel: "Invoice requested", tone: "waiting", dueLabel: "Waiting 3 business days", late: false, action: { label: "Enter invoice #", href: detail("purdue-winter-2027"), primary: true } },
  { courseId: "ucla-spring-2027", country: "US", queue: "quote", statusLabel: "Quote requested", tone: "waiting", dueLabel: "Waiting 5 business days", late: true, action: { label: "Enter quote #", href: detail("ucla-spring-2027"), primary: true } },
  { courseId: "gwu-fall-2026", country: "US", queue: "payment", statusLabel: "Pending payment", tone: "info", dueLabel: "Due Nov 30", late: false, action: { label: "Mark paid", href: detail("gwu-fall-2026"), primary: false } },
  { courseId: "umd-fall-2026", country: "US", queue: "follow", statusLabel: "Accounting not submitted", tone: "late", dueLabel: "Course ended 6 days ago", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "rutgers-fall-2026", country: "US", queue: "follow", statusLabel: "Payment overdue", tone: "late", dueLabel: "Due Nov 1 · 13 days late", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "ut-austin-fall-2026", country: "US", queue: "follow", statusLabel: "Invoice not requested", tone: "late", dueLabel: "Course started yesterday", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "toronto-winter-2026", country: "CA", queue: "none", statusLabel: "On track", tone: "ok", dueLabel: "—", late: false, action: { label: "Open", href: detail("toronto-winter-2026"), primary: false } },
];

function toDashboardRow(row: SampleRow): AdminDashboardRow {
  const course = getCourse(row.courseId)!;
  const organizer = getOrganizer(course.organizerId)!;
  const step = currentStep(course.steps);
  return {
    ...row,
    id: course.id,
    name: course.name,
    campus: course.university ?? "—",
    organizer: organizer.name,
    dates: formatRange(course.startDate, course.endDate),
    steps: course.steps,
    step,
    stepName: STEP_NAMES[step - 1] === "Sign-ups & orientation" ? "Sign-ups" : STEP_NAMES[step - 1],
  };
}

function matches(row: AdminDashboardRow, f: AdminFilters): boolean {
  if (f.campus && row.campus !== f.campus) return false;
  if (f.step && row.step !== f.step) return false;
  if (f.country && row.country !== f.country) return false;
  const q = f.q.trim().toLowerCase();
  return !q || [row.name, row.campus, row.organizer].some((v) => v.toLowerCase().includes(q));
}

// TODO(backend, B-1.1): one Supabase query with these filters in the WHERE clause.
export function getAdminDashboard(filters: AdminFilters = NO_FILTERS): AdminDashboard {
  const all = adminRows.map(toDashboardRow);
  const filtered = all.filter((r) => matches(r, filters));

  const queueCounts: AdminDashboard["queueCounts"] = { all: filtered.length, funding: 0, quote: 0, invoice: 0, payment: 0, follow: 0, none: 0 };
  for (const r of filtered) queueCounts[r.queue]++;

  return {
    rows: filters.queue === "all" ? filtered : filtered.filter((r) => r.queue === filters.queue),
    queueCounts,
    campuses: [...new Set(all.map((r) => r.campus))].sort(),
  };
}

// ---- Course detail (/admin/courses/[courseId]) -----------------------------

export type ActivityEntry = { id: string; at: string; actor: string; text: string };

export type AdminCourseDetail = {
  course: Course;
  organizer: Organizer;
  row: AdminDashboardRow;
  activity: ActivityEntry[];
  estimatedFee: number | null;
};

// TODO(backend): read from the `events` table (written by logEvent, A-1.2), newest first.
const sampleActivity: Record<string, Omit<ActivityEntry, "id">[]> = {
  "umd-spring-2027": [
    { at: "Nov 12, 2026 · 10:14 AM", actor: "Maya Chen", text: "Submitted the funding request with UMD_funding_approval_letter.pdf" },
    { at: "Nov 10, 2026 · 4:02 PM", actor: "Maya Chen", text: "Saved Journey course ID J-104582 (step 2)" },
    { at: "Nov 3, 2026 · 9:30 AM", actor: "Maya Chen", text: "Finished campus requirements (step 1)" },
    { at: "Oct 28, 2026 · 2:45 PM", actor: "Maya Chen", text: "Created the course" },
  ],
  "umd-fall-2026": [
    { at: "Nov 10, 2026 · 9:00 AM", actor: "IAHV Admin", text: "Sent reminder: Submit course accounting" },
    { at: "Nov 8, 2026 · 6:15 PM", actor: "Maya Chen", text: "Recorded attendance for 14 students (step 6)" },
    { at: "Oct 20, 2026 · 11:20 AM", actor: "IAHV Admin", text: "Issued invoice INV-24817 for $1,400.00" },
    { at: "Oct 14, 2026 · 3:05 PM", actor: "Maya Chen", text: "Requested the invoice" },
  ],
  "rutgers-fall-2026": [
    { at: "Nov 10, 2026 · 9:00 AM", actor: "IAHV Admin", text: "Sent reminder: Payment overdue" },
    { at: "Nov 1, 2026 · 12:00 AM", actor: "System", text: "Invoice due date passed without payment" },
    { at: "Sep 30, 2026 · 1:40 PM", actor: "Hannah Lee", text: "Submitted course accounting (step 7)" },
  ],
  "purdue-winter-2027": [
    { at: "Nov 11, 2026 · 8:55 AM", actor: "Arjun Patel", text: "Requested the invoice (14 participants, pay by check)" },
    { at: "Nov 4, 2026 · 5:10 PM", actor: "Arjun Patel", text: "Saved Journey course ID J-105310 (step 2)" },
  ],
};

export function listAdminCourseIds(): string[] {
  return adminRows.map((r) => r.courseId);
}

export function getAdminCourseDetail(courseId: string): AdminCourseDetail | undefined {
  const sample = adminRows.find((r) => r.courseId === courseId);
  const course = courses.find((c) => c.id === courseId);
  if (!sample || !course) return undefined;
  const organizer = getOrganizer(course.organizerId)!;
  const activity = (sampleActivity[courseId] ?? [{ at: "—", actor: organizer.name, text: "Created the course" }]).map(
    (a, i) => ({ ...a, id: `${courseId}-${i}` }),
  );
  return {
    course,
    organizer,
    row: toDashboardRow(sample),
    activity,
    estimatedFee: course.type && course.estParticipants ? computeFee(course.type, course.estParticipants).total : null,
  };
}

