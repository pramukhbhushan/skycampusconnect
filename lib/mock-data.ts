// Sample data matching "SKY Campus Connect – App Design v1". Everything here is
// synthetic. Replace these exports with Supabase queries when the backend lands;
// the pages only depend on the function signatures at the bottom of this file.

import type {
  AdminCourseRow,
  Course,
  Organizer,
  OrganizerCourseCard,
  ReminderGroup,
  ReminderRule,
  SentReminder,
} from "./types";

export const organizers: Organizer[] = [
  { id: "maya", name: "Maya Chen", email: "mchen@umd.edu", initials: "MC", campus: "University of Maryland, College Park" },
  { id: "arjun", name: "Arjun Patel", email: "apatel@purdue.edu", initials: "AP", campus: "Purdue University" },
  { id: "sofia", name: "Sofia Ramirez", email: "sramirez@ucla.edu", initials: "SR", campus: "University of California, Los Angeles" },
  { id: "daniel", name: "Daniel Kim", email: "dkim@gwu.edu", initials: "DK", campus: "George Washington University" },
  { id: "hannah", name: "Hannah Lee", email: "hlee@rutgers.edu", initials: "HL", campus: "Rutgers, The State University of New Jersey" },
  { id: "priya", name: "Priya Shah", email: "pshah@utexas.edu", initials: "PS", campus: "The University of Texas at Austin" },
  { id: "ethan", name: "Ethan Wong", email: "ewong@utoronto.ca", initials: "EW", campus: "University of Toronto (CAD)" },
];

export const adminUser = { name: "IAHV Finance", initials: "IF" };

/** The signed-in organizer in the mockups. */
export const currentOrganizerId = "maya";

const base = {
  format: "in_person" as const,
  teachers: null,
  estParticipants: null,
  funders: [],
  journeyCourseId: null,
};

export const courses: Course[] = [
  {
    ...base,
    id: "umd-spring-2027",
    organizerId: "maya",
    name: "UMD Spring Retreat",
    type: "happiness",
    university: "University of Maryland, College Park",
    startDate: "2027-03-05",
    endDate: "2027-03-07",
    estParticipants: 14,
    funders: ["university"],
    journeyCourseId: "J-104582",
    steps: ["done", "done", "waiting", "todo", "todo", "todo", "todo", "todo"],
    funding: {
      status: "submitted",
      submittedOn: "Nov 12",
      approvedOn: "Nov 13",
      totalFunding: "$900.00",
      neededBy: "11/26/2026",
      studentsPayPart: false,
      agreement: "yes",
      documents: [{ id: "doc-1", name: "UMD_funding_approval_letter.pdf", size: "1.2 MB", uploadedOn: "Nov 12" }],
    },
    client: { fullName: "University of Maryland, College Park" },
  },
  {
    ...base,
    id: "umd-fall-2026",
    organizerId: "maya",
    name: "Fall Premium Retreat",
    type: "premium",
    university: "University of Maryland, College Park",
    startDate: "2026-11-06",
    endDate: "2026-11-08",
    estParticipants: 14,
    funders: ["students"],
    journeyCourseId: "J-103977",
    steps: ["done", "done", "skipped", "done", "done", "done", "waiting", "todo"],
    invoiceNumber: "INV-24817",
    client: { fullName: "University of Maryland, College Park" },
  },
  {
    ...base,
    id: "draft-new",
    organizerId: "maya",
    name: "New retreat (untitled)",
    type: null,
    university: null,
    startDate: null,
    endDate: null,
    steps: ["in_progress", "todo", "todo", "todo", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "purdue-winter-2027",
    organizerId: "arjun",
    name: "Purdue Winter Retreat",
    type: "happiness",
    university: "Purdue University",
    startDate: "2027-01-22",
    endDate: "2027-01-24",
    steps: ["done", "done", "skipped", "waiting", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "ucla-spring-2027",
    organizerId: "sofia",
    name: "UCLA Spring Retreat",
    type: "happiness",
    university: "University of California, Los Angeles",
    startDate: "2027-03-12",
    endDate: "2027-03-14",
    steps: ["done", "done", "done", "waiting", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "gwu-fall-2026",
    organizerId: "daniel",
    name: "GWU Fall Retreat",
    type: "happiness",
    university: "George Washington University",
    startDate: "2026-10-16",
    endDate: "2026-10-18",
    steps: ["done", "done", "done", "done", "done", "done", "done", "waiting"],
  },
  {
    ...base,
    id: "rutgers-fall-2026",
    organizerId: "hannah",
    name: "Rutgers Fall Retreat",
    type: "happiness",
    university: "Rutgers, The State University of New Jersey",
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    steps: ["done", "done", "done", "done", "done", "done", "done", "waiting"],
  },
  {
    ...base,
    id: "ut-austin-fall-2026",
    organizerId: "priya",
    name: "UT Austin Fall Retreat",
    type: "happiness",
    university: "The University of Texas at Austin",
    startDate: "2026-11-13",
    endDate: "2026-11-15",
    steps: ["done", "done", "skipped", "waiting", "in_progress", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "toronto-winter-2026",
    organizerId: "ethan",
    name: "Toronto Winter Retreat",
    type: "happiness",
    university: "University of Toronto (CAD)",
    startDate: "2026-12-04",
    endDate: "2026-12-06",
    steps: ["done", "in_progress", "todo", "todo", "todo", "todo", "todo", "todo"],
  },
];

const organizerCards: OrganizerCourseCard[] = [
  {
    courseId: "umd-spring-2027",
    statusLabel: "Waiting on IAHV",
    tone: "waiting",
    next: "IAHV Finance is reviewing your proof of funds. You can start the invoice request meanwhile.",
    cta: { label: "View funding request", href: "/organizer/courses/umd-spring-2027/funding" },
  },
  {
    courseId: "umd-fall-2026",
    statusLabel: "Action due",
    tone: "late",
    next: "Enter invoice #INV-24817 in Journey course accounting and submit for closure.",
    cta: { label: "Open course accounting", href: "/organizer/courses/umd-fall-2026/invoice" },
  },
  {
    courseId: "draft-new",
    statusLabel: "Draft",
    tone: "info",
    next: "Add your campus, dates and course type to unlock the rest of your steps.",
    cta: { label: "Continue setup", href: "/organizer/courses/new" },
  },
];

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

export const reminderGroups: ReminderGroup[] = [
  {
    id: "invoice",
    label: "Invoice not requested",
    recipients: [
      { organizer: "Priya Shah", course: "UT Austin Fall Retreat", campus: "The University of Texas at Austin", why: "Course started yesterday, no invoice request" },
    ],
    template: {
      name: "Request your invoice",
      subject: "Action needed: request the invoice for UT Austin Fall Retreat",
      body: "Hi Priya,\n\nYour UT Austin Fall Retreat started on Nov 13, and we don’t have an invoice request for it yet. You should have everything you need by the end of day one.\n\nIt only takes a few minutes, since your course and university details are already filled in:\n[Open Step 4 · Invoice request]\n\nThank you for everything you’re doing for SKY on your campus!\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "acct",
    label: "Accounting not submitted",
    recipients: [
      { organizer: "Maya Chen", course: "Fall Premium Retreat", campus: "University of Maryland, College Park", why: "Course ended 6 days ago" },
    ],
    template: {
      name: "Submit course accounting",
      subject: "Please close out Fall Premium Retreat in Journey",
      body: "Hi Maya,\n\nThank you for leading Fall Premium Retreat! The last step is to submit course accounting in Journey with your invoice number so the course can be closed.\n\nCopy this into the Expenses/Incomes description:\n“Invoice # INV-24817 for $1,400.00”\n\n[Open Step 7 · Course accounting]\n\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "overdue",
    label: "Payment overdue",
    recipients: [
      { organizer: "Hannah Lee", course: "Rutgers Fall Retreat", campus: "Rutgers, The State University of New Jersey", why: "Due Nov 1 · 13 days late" },
    ],
    template: {
      name: "Payment overdue",
      subject: "Payment for Rutgers Fall Retreat is past due",
      body: "Hi Hannah,\n\nThe invoice for Rutgers Fall Retreat was due on Nov 1 and we haven’t received payment yet.\n\nCould you check with the university for a new payment date and reply with it here? We’ll update the course so you won’t get another reminder.\n\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "payment",
    label: "Pending payment",
    recipients: [
      { organizer: "Daniel Kim", course: "GWU Fall Retreat", campus: "George Washington University", why: "Due Nov 30" },
    ],
    template: {
      name: "Payment coming up",
      subject: "Heads up: GWU Fall Retreat payment is due Nov 30",
      body: "Hi Daniel,\n\nJust a heads up that the invoice for GWU Fall Retreat is due on Nov 30. If the university has already paid, let us know and we’ll mark it as paid.\n\nSKY Campus Happiness · IAHV",
    },
  },
];

export const reminderRules: ReminderRule[] = [
  { id: "start", title: "Request your invoice", when: "On the first day of a course with no invoice request", enabled: true },
  { id: "end", title: "Invoice still missing", when: "When a course ends and there’s still no invoice request", enabled: true },
  { id: "acct", title: "Submit course accounting", when: "3 days after a course ends, if not submitted", enabled: true },
  { id: "overdue", title: "Payment overdue", when: "The day after the due date, to the organizer and the SKY Campus Desk", enabled: true },
];

export const sentReminders: SentReminder[] = [
  { id: "s1", title: "Payment overdue", target: "Rutgers Fall Retreat", when: "Nov 10 · automatic" },
  { id: "s2", title: "Request your invoice", target: "2 courses", when: "Nov 8 · sent by IAHV Finance" },
  { id: "s3", title: "Funding approved", target: "GWU Fall Retreat", when: "Oct 2 · automatic" },
];

// ---- Data access. Swap these bodies for Supabase queries. -------------------

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getOrganizer(id: string): Organizer | undefined {
  return organizers.find((o) => o.id === id);
}

export function getCurrentOrganizer(): Organizer {
  return getOrganizer(currentOrganizerId)!;
}

export function getOrganizerCourses(organizerId: string) {
  return organizerCards
    .map((card) => ({ card, course: getCourse(card.courseId)! }))
    .filter(({ course }) => course.organizerId === organizerId);
}

export function getAdminRows() {
  return adminRows.map((row) => {
    const course = getCourse(row.courseId)!;
    return { row, course, organizer: getOrganizer(course.organizerId)! };
  });
}

/** Earlier courses by the same organizer that aren't closed yet (blocks funding approval). */
export function getOpenPriorCourses(course: Course): Course[] {
  return courses.filter(
    (c) =>
      c.organizerId === course.organizerId &&
      c.id !== course.id &&
      c.endDate !== null &&
      course.startDate !== null &&
      c.endDate < course.startDate &&
      c.steps[7] !== "done",
  );
}
