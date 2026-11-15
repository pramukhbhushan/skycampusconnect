// Reminder email data (B-4.3). Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Recipients come from the same status rules as the dashboard, so "who needs a nudge"
// is always current. Courses come from Supabase (B-1.1).

import type { ReminderTemplateKey } from "@/lib/admin/derive";
import { shortDate, todayIso } from "@/lib/admin/time";
import { formatDate, formatRange } from "@/lib/dates";
import type { MergeValues } from "@/lib/email/templates";
import { money } from "@/lib/pricing";
import { getAdminCourse, getAllAdminRows, getCourseFacts, type AdminDashboardRow } from "./admin";
import { adminStore } from "./admin-store";

export type ReminderRecipient = {
  courseId: string;
  course: string;
  organizer: string;
  email: string;
  campus: string;
  why: string;
  suggested: ReminderTemplateKey | null;
};

export type ReminderGroupId = Exclude<ReminderTemplateKey, never>;

/** The saved filters on the reminders page, each with the template it usually needs. */
export const REMINDER_GROUPS: { id: ReminderTemplateKey; label: string }[] = [
  { id: "request_invoice", label: "Invoice not requested" },
  { id: "submit_accounting", label: "Accounting not submitted" },
  { id: "payment_overdue", label: "Payment overdue" },
  { id: "payment_coming_up", label: "Pending payment" },
  { id: "funding_needs_info", label: "Funding needs info" },
];

function suggestedTemplate(row: AdminDashboardRow): ReminderTemplateKey | null {
  if (row.statusLabel === "Invoice not requested") return "request_invoice";
  if (row.statusLabel === "Accounting not submitted") return "submit_accounting";
  if (row.statusLabel === "Payment overdue") return "payment_overdue";
  if (row.statusLabel === "Pending payment") return "payment_coming_up";
  if (row.statusLabel === "Funding needs info") return "funding_needs_info";
  return null;
}

const toRecipient = (row: AdminDashboardRow): ReminderRecipient => ({
  courseId: row.id,
  course: row.name,
  organizer: row.organizer,
  email: row.organizerEmail,
  campus: row.campus,
  why: row.dueLabel === "—" ? row.statusLabel : `${row.statusLabel} · ${row.dueLabel}`,
  suggested: suggestedTemplate(row),
});

export async function getReminderGroups(today = todayIso()): Promise<Record<ReminderTemplateKey, ReminderRecipient[]>> {
  const out = Object.fromEntries(REMINDER_GROUPS.map((g) => [g.id, [] as ReminderRecipient[]])) as Record<ReminderTemplateKey, ReminderRecipient[]>;
  for (const row of await getAllAdminRows(today)) {
    const key = suggestedTemplate(row);
    if (key) out[key].push(toRecipient(row));
  }
  return out;
}

/** Specific courses picked on the dashboard (?courses=a,b). Unknown ids are skipped. */
export async function getRecipientsFor(courseIds: string[], today = todayIso()): Promise<ReminderRecipient[]> {
  const rows = await getAllAdminRows(today);
  return courseIds.flatMap((id) => {
    const row = rows.find((r) => r.id === id);
    return row ? [toRecipient(row)] : [];
  });
}

/** Values for a template's {{fields}} for one course. */
export async function mergeValuesFor(courseId: string, admin: { name: string }, origin = ""): Promise<MergeValues> {
  const found = await getAdminCourse(courseId);
  const facts = await getCourseFacts(courseId);
  if (!found) return { admin_name: admin.name };
  const { course, organizer } = found;
  const invoice = facts?.invoice;
  return {
    organizer_first_name: organizer?.name.split(" ")[0],
    organizer_name: organizer?.name,
    course_name: course.name,
    course_dates: formatRange(course.startDate, course.endDate),
    course_start: course.startDate ? formatDate(course.startDate) : undefined,
    university: course.university ?? undefined,
    invoice_number: invoice?.number ?? undefined,
    invoice_amount: invoice?.amount != null ? money(invoice.amount) : undefined,
    due_date: invoice?.dueDate ? shortDate(invoice.dueDate) : undefined,
    course_link: `${origin}/organizer/courses/${courseId}/invoice`,
    admin_name: admin.name,
  };
}

const sampleSent = [
  { id: "s1", title: "Payment overdue", target: "Rutgers Fall Retreat", when: "Nov 10", sentBy: "IAHV Admin" },
  { id: "s2", title: "Request your invoice", target: "2 courses", when: "Nov 8", sentBy: "IAHV Admin" },
  { id: "s3", title: "Funding approved", target: "GWU Fall Retreat", when: "Oct 2", sentBy: "IAHV Admin" },
];

// TODO(backend): read from `email_log`, newest first.
export function getSentReminders() {
  return [...adminStore.sent, ...sampleSent];
}
