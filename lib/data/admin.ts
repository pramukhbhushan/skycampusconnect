// Admin data. Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Sample facts + admin changes (admin-store.ts) until the backend lands. In B-1.1 the
// facts come from Supabase; the status rules (lib/admin/derive.ts) stay the same.

import { deriveAdminStatus, type AdminStatus, type CourseFacts } from "@/lib/admin/derive";
import { remindHref } from "@/lib/admin/links";
import { todayIso } from "@/lib/admin/time";
import { formatRange } from "@/lib/dates";
import { computeFee } from "@/lib/pricing";
import { connection } from "next/server";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import type { AdminQueue, Course, Organizer, StepStatus, Tone } from "@/lib/types";
import { adminStore, type StoredActivity } from "./admin-store";
import { courses, getCourse } from "./courses";
import { getOrganizer } from "./organizer";
import { getPricing } from "./settings";

export { adminUser } from "./admin-user";

import { NO_FILTERS, type AdminFilters, type Country } from "@/lib/admin/filters";
export { NO_FILTERS, type AdminFilters, type Country };

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

// ---- Sample facts (what Supabase will store) ------------------------------

type SampleFacts = Omit<CourseFacts, "id" | "hasType" | "startDate" | "endDate"> & { country: Country };

const sample: Record<string, SampleFacts> = {
  "umd-spring-2027": { country: "US", funding: { status: "submitted", neededBy: "2026-11-26" }, quote: null, invoice: null },
  "purdue-winter-2027": {
    country: "US", funding: null, quote: null,
    invoice: { status: "requested", number: null, amount: 900, requestedOn: "2026-11-10", dueDate: "2027-02-21", accountingSubmitted: false },
  },
  "ucla-spring-2027": {
    country: "US", funding: { status: "approved", neededBy: "2026-11-20" },
    quote: { status: "requested", number: null, requestedOn: "2026-11-06", amount: 1300 }, invoice: null,
  },
  "gwu-fall-2026": {
    country: "US", funding: { status: "approved", neededBy: "2026-09-30" }, quote: null,
    invoice: { status: "accounting_submitted", number: "INV-24790", amount: 700, requestedOn: "2026-09-28", dueDate: "2026-11-30", accountingSubmitted: true },
  },
  "umd-fall-2026": {
    country: "US", funding: null, quote: null,
    invoice: { status: "sent_to_client", number: "INV-24817", amount: 1400, requestedOn: "2026-10-14", dueDate: "2026-12-08", accountingSubmitted: false },
  },
  "rutgers-fall-2026": {
    country: "US", funding: { status: "approved", neededBy: "2026-09-01" }, quote: null,
    invoice: { status: "accounting_submitted", number: "INV-24755", amount: 1100, requestedOn: "2026-09-10", dueDate: "2026-11-01", accountingSubmitted: true },
  },
  "ut-austin-fall-2026": { country: "US", funding: null, quote: null, invoice: null },
  "toronto-winter-2026": { country: "CA", funding: null, quote: null, invoice: null },
};

/** Sample facts with every admin change applied. */
export function getCourseFacts(courseId: string): (CourseFacts & { country: Country }) | undefined {
  const s = sample[courseId];
  const course = getCourse(courseId);
  if (!s || !course) return undefined;
  const funding = adminStore.funding.get(courseId);
  const quote = adminStore.quotes.get(courseId);
  const invoice = adminStore.invoices.get(courseId);
  return {
    id: courseId,
    hasType: course.type !== null,
    startDate: course.startDate,
    endDate: course.endDate,
    country: s.country,
    funding: s.funding && { ...s.funding, ...(funding && { status: funding.status }) },
    quote: s.quote && { ...s.quote, ...quote },
    invoice: s.invoice && {
      ...s.invoice,
      ...invoice,
      accountingSubmitted: s.invoice.accountingSubmitted || invoice?.status === "accounting_submitted",
    },
  };
}

export { remindHref };

function toDashboardRow(courseId: string, today: string): AdminDashboardRow {
  const course = getCourse(courseId)!;
  const organizer = getOrganizer(course.organizerId)!;
  const facts = getCourseFacts(courseId)!;
  const status = deriveAdminStatus(facts, today);
  const step = currentStep(course.steps);
  return {
    courseId,
    id: courseId,
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
      href: status.next.kind === "remind" ? remindHref([courseId], status.next.template) : `/admin/courses/${courseId}`,
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
export function getAllAdminRows(today = todayIso()): AdminDashboardRow[] {
  return Object.keys(sample).map((id) => toDashboardRow(id, today));
}

// TODO(backend, B-1.1): load facts with one Supabase query (campus/country/search in the WHERE clause).
export function getAdminDashboard(filters: AdminFilters = NO_FILTERS, today = todayIso()): AdminDashboard {
  const all = getAllAdminRows(today);
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

// TODO(backend): read from the `events` table (written by logEvent, A-1.2), newest first.
const sampleActivity: Record<string, StoredActivity[]> = {
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
    { at: "Nov 10, 2026 · 8:55 AM", actor: "Arjun Patel", text: "Requested the invoice (14 participants, pay by check)" },
    { at: "Nov 4, 2026 · 5:10 PM", actor: "Arjun Patel", text: "Saved Journey course ID J-105310 (step 2)" },
  ],
};

export function listAdminCourseIds(): string[] {
  return Object.keys(sample);
}

export async function getAdminCourseDetail(courseId: string, today?: string): Promise<AdminCourseDetail | undefined> {
  await connection(); // reads admin changes and today's date, so never prerender it
  today ??= todayIso();
  const course = courses.find((c) => c.id === courseId);
  const facts = getCourseFacts(courseId);
  if (!course || !facts) return undefined;
  const organizer = getOrganizer(course.organizerId)!;
  const recorded = [...(adminStore.activity.get(courseId) ?? []), ...(sampleActivity[courseId] ?? [])];
  const activity = (recorded.length ? recorded : [{ at: "—", actor: organizer.name, text: "Created the course" }]).map((a, i) => ({
    ...a,
    id: `${courseId}-${i}`,
  }));
  const pricing = await getPricing();
  return {
    course,
    organizer,
    row: toDashboardRow(courseId, today),
    facts,
    status: deriveAdminStatus(facts, today),
    activity,
    estimatedFee: course.type && course.estParticipants ? computeFee(course.type, course.estParticipants, false, pricing).total : null,
  };
}
