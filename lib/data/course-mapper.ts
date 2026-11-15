// Turns database rows into the `Course` shape the organizer pages use.
// Pure functions, no I/O, so they're easy to test. Owner: Engineer A (Aryan).

import type { SupabaseClient, QueryData } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { formatNumeric } from "@/lib/dates";
import type { AgreementStatus, Course, FundingRequest, StepStatus, UploadedDocument } from "@/lib/types";

/** One query returns a course with everything the organizer pages show. */
export const COURSE_SELECT = `*, campuses(name), clients(full_name, attn, address, email), course_steps(step_no, status), funding_requests(*, funding_request_documents(documents(id, file_name, size_bytes, created_at))), invoices(invoice_number, status, requested_at)` as const;

// Only used to derive the row type below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const courseQuery = (db: SupabaseClient<Database>) => db.from("courses").select(COURSE_SELECT);
export type CourseRow = QueryData<ReturnType<typeof courseQuery>>[number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Nov 12" from a timestamp or date. */
export function formatMonthDay(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "$900.00" */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "1.2 MB" / "340 KB" */
export function formatFileSize(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

export function initialsOf(name: string, email: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

// TODO(A-6.x): lib/types.ts AgreementStatus has no "not_at_this_time" yet (frozen file;
// announced change). Until then it shows as "no".
function toAgreement(status: Database["public"]["Enums"]["agreement_status"] | null): AgreementStatus | undefined {
  if (status === null) return undefined;
  return status === "not_at_this_time" ? "no" : status;
}

function toFunding(row: CourseRow): FundingRequest | undefined {
  const f = row.funding_requests;
  if (!f) return undefined;
  const documents: UploadedDocument[] = f.funding_request_documents.flatMap((link) => {
    const d = link.documents;
    return d ? [{ id: d.id, name: d.file_name, size: formatFileSize(d.size_bytes), uploadedOn: formatMonthDay(d.created_at) }] : [];
  });
  return {
    status: f.status,
    submittedOn: f.submitted_at ? formatMonthDay(f.submitted_at) : undefined,
    approvedOn: f.status === "approved" && f.reviewed_at ? formatMonthDay(f.reviewed_at) : undefined,
    totalFunding: f.total_funding === null ? "" : formatMoney(f.total_funding),
    neededBy: f.needed_by ? formatNumeric(f.needed_by) : "",
    studentsPayPart: f.student_fee > 0,
    agreement: toAgreement(row.agreement_status) ?? "yes",
    documents,
  };
}

export function toCourse(row: CourseRow): Course {
  const steps: StepStatus[] = Array.from({ length: 8 }, (_, i) => {
    const s = row.course_steps.find((cs) => cs.step_no === i + 1);
    return s ? s.status : "todo";
  });
  const campus = row.campuses;
  const client = row.clients;
  const numbered = row.invoices.filter((i) => i.invoice_number !== null);

  return {
    id: row.id,
    organizerId: row.organizer_id,
    name: row.name,
    type: row.course_type,
    format: row.format,
    university: campus?.name ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    teachers: row.teachers,
    estParticipants: row.est_participants,
    funders: row.funding_sources,
    journeyCourseId: row.journey_course_id,
    steps,
    funding: toFunding(row),
    client: client
      ? {
          fullName: client.full_name,
          attn: client.attn ?? undefined,
          address: client.address ?? undefined,
          email: client.email ?? undefined,
        }
      : undefined,
    invoiceNumber: numbered.length > 0 ? numbered[numbered.length - 1].invoice_number ?? undefined : undefined,
  };
}

/** Earlier courses by the same organizer that aren't closed yet (blocks funding approval). */
export function openPriorCourses(course: Course, all: Course[]): Course[] {
  return all.filter(
    (c) =>
      c.organizerId === course.organizerId &&
      c.id !== course.id &&
      c.endDate !== null &&
      course.startDate !== null &&
      c.endDate < course.startDate &&
      c.steps[7] !== "done",
  );
}

/**
 * Funding and invoice state of a course, for the "My courses" card text. Kept separate from
 * `Course` because lib/types.ts is frozen.
 */
export type CourseProgress = {
  funding: { status: "draft" | "submitted" | "approved" | "needs_info"; reviewNote: string | null; submittedAt: string | null } | null;
  invoice: { status: string; number: string | null; requestedAt: string } | null;
};

export function toProgress(row: CourseRow): CourseProgress {
  const f = row.funding_requests;
  const open = row.invoices.filter((i) => i.status !== "rejected").sort((a, b) => b.requested_at.localeCompare(a.requested_at));
  const inv = open[0];
  return {
    funding: f ? { status: f.status, reviewNote: f.review_note, submittedAt: f.submitted_at } : null,
    invoice: inv ? { status: inv.status, number: inv.invoice_number, requestedAt: inv.requested_at } : null,
  };
}
