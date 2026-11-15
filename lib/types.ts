// Domain types shared by the UI. They mirror the Supabase schema in plan-v2.md
// so that swapping lib/mock-data.ts for real queries is a drop-in change.

export type Role = "organizer" | "admin";

export type CourseType = "happiness" | "premium";
export type CourseFormat = "in_person" | "online";
export type Funder = "students" | "university" | "sponsor" | "donor";
export type AgreementStatus = "yes" | "in_progress" | "no";

/** Status of one of the 8 course steps. */
export type StepStatus =
  | "done"
  | "in_progress"
  | "waiting" // waiting on IAHV, or an organizer action is due
  | "todo"
  | "skipped";

export type Tone = "waiting" | "late" | "ok" | "info";

export type Organizer = {
  id: string;
  name: string;
  email: string;
  initials: string;
  campus: string;
};

export type FundingRequest = {
  status: "draft" | "submitted" | "approved" | "needs_info";
  submittedOn?: string;
  approvedOn?: string;
  totalFunding: string;
  neededBy: string;
  studentsPayPart: boolean;
  agreement: AgreementStatus;
  documents: UploadedDocument[];
};

export type UploadedDocument = {
  id: string;
  name: string;
  size: string;
  uploadedOn: string;
};

export type Client = {
  fullName: string;
  attn?: string;
  address?: string;
  email?: string;
};

export type Course = {
  id: string;
  organizerId: string;
  name: string;
  type: CourseType | null; // null while still a draft
  format: CourseFormat;
  university: string | null;
  startDate: string | null; // ISO yyyy-mm-dd
  endDate: string | null;
  teachers: string | null;
  estParticipants: number | null;
  funders: Funder[];
  journeyCourseId: string | null;
  steps: StepStatus[]; // always length 8
  funding?: FundingRequest;
  client?: Client;
  invoiceNumber?: string;
};

/** Presentation fields the organizer home shows for each course. */
export type OrganizerCourseCard = {
  courseId: string;
  statusLabel: string;
  tone: Tone;
  next: string;
  cta: { label: string; href: string };
};

export type AdminQueue =
  | "funding"
  | "quote"
  | "invoice"
  | "payment"
  | "follow"
  | "none";

/** Presentation fields the admin dashboard shows for each course. */
export type AdminCourseRow = {
  courseId: string;
  queue: AdminQueue;
  statusLabel: string;
  tone: Tone;
  dueLabel: string;
  late: boolean;
  action: { label: string; href: string; primary: boolean };
};

export type ReminderGroupId = "invoice" | "acct" | "overdue" | "payment";

export type ReminderGroup = {
  id: ReminderGroupId;
  label: string;
  recipients: {
    organizer: string;
    course: string;
    campus: string;
    why: string;
  }[];
  template: { name: string; subject: string; body: string };
};

export type ReminderRule = {
  id: string;
  title: string;
  when: string;
  enabled: boolean;
};

export type SentReminder = {
  id: string;
  title: string;
  target: string;
  when: string;
};
