// Sample data until the backend lands. Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Swap the function bodies for Supabase queries; keep the signatures.

import type { AdminCourseRow } from "@/lib/types";
import { getCourse } from "./courses";
import { getOrganizer } from "./organizer";

export const adminUser = { name: "IAHV Finance", initials: "IF" };

const reminders = "/admin/reminders";
const adminRows: AdminCourseRow[] = [
  { courseId: "umd-spring-2027", queue: "funding", statusLabel: "Funding approval", tone: "waiting", dueLabel: "Needed by Nov 26", late: false, action: { label: "Review & approve", href: "/admin", primary: true } },
  { courseId: "purdue-winter-2027", queue: "invoice", statusLabel: "Invoice requested", tone: "waiting", dueLabel: "Waiting 3 business days", late: false, action: { label: "Enter invoice #", href: "/admin", primary: true } },
  { courseId: "ucla-spring-2027", queue: "quote", statusLabel: "Quote requested", tone: "waiting", dueLabel: "Waiting 5 business days", late: true, action: { label: "Enter quote #", href: "/admin", primary: true } },
  { courseId: "gwu-fall-2026", queue: "payment", statusLabel: "Pending payment", tone: "info", dueLabel: "Due Nov 30", late: false, action: { label: "Mark paid", href: "/admin", primary: false } },
  { courseId: "umd-fall-2026", queue: "follow", statusLabel: "Accounting not submitted", tone: "late", dueLabel: "Course ended 6 days ago", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "rutgers-fall-2026", queue: "follow", statusLabel: "Payment overdue", tone: "late", dueLabel: "Due Nov 1 · 13 days late", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "ut-austin-fall-2026", queue: "follow", statusLabel: "Invoice not requested", tone: "late", dueLabel: "Course started yesterday", late: true, action: { label: "Send reminder", href: reminders, primary: false } },
  { courseId: "toronto-winter-2026", queue: "none", statusLabel: "On track", tone: "ok", dueLabel: "—", late: false, action: { label: "Open", href: "/admin", primary: false } },
];

export function getAdminRows() {
  return adminRows.map((row) => {
    const course = getCourse(row.courseId)!;
    return { row, course, organizer: getOrganizer(course.organizerId)! };
  });
}
