// Admin data. Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Courses and their funding/quote/invoice facts come from Supabase (B-1.1, admin-db.ts).
// Admin changes (admin-store.ts) are still applied on top in memory until B-3.1/B-5.1/B-6.1
// call the Postgres transition functions. The status rules (lib/admin/derive.ts) don't change.

import { deriveAdminStatus, type AdminStatus, type CourseFacts } from "@/lib/admin/derive";
import { remindHref } from "@/lib/admin/links";
import { todayIso } from "@/lib/admin/time";
import { formatRange } from "@/lib/dates";
import { computeFee } from "@/lib/pricing";
import { connection } from "next/server";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import type { AdminQueue, Course, Organizer, StepStatus, Tone } from "@/lib/types";
import { loadAdminCourses, loadCourseEvents, type AdminCourse } from "./admin-db";
import { adminStore, type StoredActivity } from "./admin-store";
import { getPricing } from "./settings";

import { NO_FILTERS, type AdminFilters, type Country } from "@/lib/admin/filters";
export { NO_FILTERS, type AdminFilters, type Country };
export { remindHref };

/** One row of the admin dashboard table. */
export type AdminDashboardRow = {
  courseId: string;
  id: string;
  name: string;
  campus: string;
  country: Country;
  organizer: string;
  organizerEmail: string;
  dates: string;
  steps: StepStatus[];
  step: number;
  stepName: string;
  queue: AdminQueue;
  statusLabel: string;
  tone: Tone;
  dueLabel: string;
  late: boolean;
  flagged: boolean;
  action: { label: string; href: string; primary: boolean };
};

export type AdminDashboard = {
  rows: AdminDashboardRow[];
  /** Courses per queue, counted after campus/step/country/search but before the queue filter. */
  queueCounts: Record<AdminQueue | "all", number>;
  /** Every campus with a course, for the campus filter. */
  campuses: string[];
};

/** One course with its organizer, or undefined if there's no such course. */
export async function getAdminCourse(courseId: string): Promise<AdminCourse | undefined> {
  return (await loadAdminCourses()).find((c) => c.course.id === courseId);
}

/** Stored facts with every in-memory admin change applied. */
export function factsOf({ course, country, facts: s }: AdminCourse): CourseFacts & { country: Country } {
  const funding = adminStore.funding.get(course.id);
  const quote = adminStore.quotes.get(course.id);
  const invoice = adminStore.invoices.get(course.id);
  return {
    id: course.id,
    hasType: course.type !== null,
    startDate: course.startDate,
    endDate: course.endDate,
    country,
    funding: s.funding && { ...s.funding, ...(funding && { status: funding.status }) },
    quote: s.quote && { ...s.quote, ...quote },
    invoice: s.invoice && {
      ...s.invoice,
      ...invoice,
      accountingSubmitted: s.invoice.accountingSubmitted || invoice?.status === "accounting_submitted",
    },
  };
}

/** Facts for every course, from one load (server actions don't get React's per-request cache). */
export async function getAllCourseFacts(): Promise<(CourseFacts & { country: Country })[]> {
  return (await loadAdminCourses()).map(factsOf);
}

export async function getCourseFacts(courseId: string): Promise<(CourseFacts & { country: Country }) | undefined> {
  const c = await getAdminCourse(courseId);
  return c && factsOf(c);
}

function toDashboardRow(c: AdminCourse, today: string): AdminDashboardRow {
  const { course, organizer } = c;
  const facts = factsOf(c);
  const status = deriveAdminStatus(facts, today);
  const step = currentStep(course.steps);
  return {
    courseId: course.id,
    id: course.id,
    name: course.name,
    campus: course.university ?? "—",
    country: facts.country,
    organizer: organizer.name,
    organizerEmail: organizer.email,
    dates: formatRange(course.startDate, course.endDate),
    steps: course.steps,
    step,
    stepName: STEP_NAMES[step - 1] === "Sign-ups & orientation" ? "Sign-ups" : STEP_NAMES[step - 1],
    queue: status.queue,
    statusLabel: status.statusLabel,
    tone: status.tone,
    dueLabel: status.dueLabel,
    late: status.late,
    flagged: status.flagged,
    action: {
      label: status.actionLabel,
      href: status.next.kind === "remind" ? remindHref([course.id], status.next.template) : `/admin/courses/${course.id}`,
      primary: status.next.kind === "funding" || status.next.kind === "quote" || (status.next.kind === "invoice" && status.queue === "invoice"),
    },
  };
}

function matches(row: AdminDashboardRow, f: AdminFilters): boolean {
  if (f.campus && row.campus !== f.campus) return false;
  if (f.step && row.step !== f.step) return false;
  if (f.country && row.country !== f.country) return false;
  const q = f.q.trim().toLowerCase();
  return !q || [row.name, row.campus, row.organizer].some((v) => v.toLowerCase().includes(q));
}

/** Every course on the dashboard, with status worked out for today. */
export async function getAllAdminRows(today?: string): Promise<AdminDashboardRow[]> {
  await connection(); // statuses depend on today's date, so never prerender them
  const day = today ?? todayIso();
  return (await loadAdminCourses()).map((c) => toDashboardRow(c, day));
}

// Filtering happens here, not in SQL: the queue and "late" depend on today's date and the
// in-memory admin changes. Fine at SKY's scale (tens of courses per term).
export async function getAdminDashboard(filters: AdminFilters = NO_FILTERS, today?: string): Promise<AdminDashboard> {
  const all = await getAllAdminRows(today);
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

export type ActivityEntry = StoredActivity & { id: string };

export type AdminCourseDetail = {
  course: Course;
  organizer: Organizer;
  row: AdminDashboardRow;
  facts: CourseFacts;
  status: AdminStatus;
  activity: ActivityEntry[];
  estimatedFee: number | null;
};

export async function getAdminCourseDetail(courseId: string, today?: string): Promise<AdminCourseDetail | undefined> {
  await connection(); // reads admin changes and today's date, so never prerender it
  today ??= todayIso();
  const c = await getAdminCourse(courseId);
  if (!c) return undefined;
  const { course, organizer } = c;
  const facts = factsOf(c);
  // In-memory admin changes first (newest), then the stored audit log.
  const recorded = [...(adminStore.activity.get(courseId) ?? []), ...(await loadCourseEvents(courseId))];
  const activity = (recorded.length ? recorded : [{ at: "—", actor: organizer.name, text: "Created the course" }]).map((a, i) => ({
    ...a,
    id: `${courseId}-${i}`,
  }));
  const pricing = await getPricing();
  return {
    course,
    organizer,
    row: toDashboardRow(c, today),
    facts,
    status: deriveAdminStatus(facts, today),
    activity,
    estimatedFee: course.type && course.estParticipants ? computeFee(course.type, course.estParticipants, false, pricing).total : null,
  };
}
