// Admin data from Supabase (B-1.1). Owner: Engineer B (Bhushan).
// Every query runs as the signed-in IAHV admin; row-level security (is_iahv_admin())
// lets admins read every course. These read cookies: call them from code behind <Suspense>.

import { cache } from "react";
import type { SupabaseClient, QueryData } from "@supabase/supabase-js";
import type { CourseFacts } from "@/lib/admin/derive";
import type { Country } from "@/lib/admin/filters";
import type { Database } from "@/lib/db/database.types";
import { requireRole, type CurrentUser } from "@/lib/supabase/require-role";
import { createClient } from "@/lib/supabase/server";
import type { Course, Organizer, Role } from "@/lib/types";
import type { StoredActivity } from "./admin-store";
import { COURSE_SELECT, initialsOf, toCourse } from "./course-mapper";

/** The organizer-page course query, plus what the admin queues need. */
export const ADMIN_COURSE_SELECT =
  `${COURSE_SELECT}, organizer:profiles!courses_organizer_id_fkey(name, email), quotes(status, quote_number, amount, requested_at), invoice_rows:invoices(status, invoice_number, amount, requested_at, due_date, accounting_submitted_at)` as const;

// Only used to derive the row type below.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const adminQuery = (db: SupabaseClient<Database>) => db.from("courses").select(ADMIN_COURSE_SELECT);
export type AdminCourseRow = QueryData<ReturnType<typeof adminQuery>>[number];

/** One course as the admin pages see it, before any in-memory admin changes. */
export type AdminCourse = {
  course: Course;
  organizer: Organizer;
  country: Country;
  /** Funding, quote and invoice as stored in Supabase. */
  facts: Pick<CourseFacts, "funding" | "quote" | "invoice">;
};

const day = (iso: string) => iso.slice(0, 10);
const latest = <T extends { requested_at: string }>(rows: T[]): T | undefined =>
  rows.reduce<T | undefined>((a, b) => (!a || b.requested_at > a.requested_at ? b : a), undefined);

/** Database row -> admin course. Pure, so it's unit-tested without Supabase. */
export function toAdminCourse(row: AdminCourseRow): AdminCourse {
  const course = toCourse(row);
  const name = row.organizer?.name ?? "";
  const email = row.organizer?.email ?? "";
  const quote = latest(row.quotes);
  const invoice = latest(row.invoice_rows);
  const funding = row.funding_requests;
  return {
    course,
    organizer: {
      id: row.organizer_id,
      name: name || email,
      email,
      initials: initialsOf(name, email),
      campus: course.university ?? "",
    },
    country: row.country === "CA" ? "CA" : "US",
    facts: {
      funding: funding ? { status: funding.status, neededBy: funding.needed_by } : null,
      quote: quote
        ? { status: quote.status, number: quote.quote_number, requestedOn: day(quote.requested_at), amount: quote.amount }
        : null,
      invoice: invoice
        ? {
            status: invoice.status,
            number: invoice.invoice_number,
            amount: invoice.amount,
            requestedOn: day(invoice.requested_at),
            dueDate: invoice.due_date,
            accountingSubmitted: invoice.accounting_submitted_at !== null || invoice.status === "accounting_submitted",
          }
        : null,
    },
  };
}

/** Every course, soonest first (drafts without dates last). One query per request. */
export const loadAdminCourses = cache(async (): Promise<AdminCourse[]> => {
  await requireRole("iahv_admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(ADMIN_COURSE_SELECT)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return data.map(toAdminCourse);
});

/** The signed-in IAHV admin, checked once per request. */
export const getAdminMe = cache(async (): Promise<CurrentUser & { initials: string }> => {
  const me = await requireRole("iahv_admin");
  return { ...me, name: me.name || me.email, initials: initialsOf(me.name, me.email) };
});

const EVENT_TEXT: Record<string, string> = {
  "course.created": "Created the course",
  "course.updated": "Updated the course details",
  "funding.approved": "Approved the funding request",
  "funding.needs_info": "Asked for more funding information",
  "quote.issued": "Issued the quote",
  "quote.accepted": "Marked the quote accepted",
  "quote.revised": "Sent the quote back for revision",
  "quote.expired": "Marked the quote expired",
  "invoice.issued": "Issued the invoice",
  "invoice.sent": "Marked the invoice sent to the client",
  "invoice.paid": "Marked the invoice paid",
  "invoice.closed": "Closed the course",
};

type EventPayload = { step?: number; status?: string; number?: string; note?: string };

/** "Nov 12, 2026 · 10:14 AM" (same format as logActivity in admin-store.ts). */
export function formatEventTime(iso: string): string {
  return new Date(iso)
    .toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    .replace(/, (\d{1,2}:)/, " · $1");
}

export function describeEvent(type: string, payload: EventPayload): string {
  if (type === "step.updated" && payload.step) return `Updated step ${payload.step}${payload.status ? ` (${payload.status.replace(/_/g, " ")})` : ""}`;
  const text = EVENT_TEXT[type] ?? type;
  if (payload.number) return `${text} ${payload.number}`;
  if (payload.note) return `${text}: ${payload.note}`;
  return text;
}

/** The course's audit log from the `events` table, newest first. */
export async function loadCourseEvents(courseId: string): Promise<StoredActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("type, payload, at, actor:profiles!events_actor_id_fkey(name, email)")
    .eq("course_id", courseId)
    .order("at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load the activity log: ${error.message}`);
  return data.map((e) => {
    // One profile per event; the generated types call it a list, so accept either shape.
    const actor = (Array.isArray(e.actor) ? e.actor[0] : e.actor) as { name: string; email: string } | null | undefined;
    return {
      at: formatEventTime(e.at),
      actor: actor?.name || actor?.email || "System",
      text: describeEvent(e.type, (e.payload ?? {}) as EventPayload),
    };
  });
}

// ---- Users & roles (B-2.2) ------------------------------------------------------------

export type AppUser = { id: string; name: string; email: string; role: Role; campus: string | null };

/** Everyone who has signed in (RLS lets admins read every profile), admins first, then by name. */
export async function loadUsers(): Promise<AppUser[]> {
  await requireRole("iahv_admin");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, campus:campuses(name)")
    .order("role", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load users: ${error.message}`);
  return data.map((p) => {
    // One campus per profile; the generated types call it a list, so accept either shape.
    const campus = (Array.isArray(p.campus) ? p.campus[0] : p.campus) as { name: string } | null | undefined;
    return { id: p.id, name: p.name || p.email, email: p.email, role: p.role, campus: campus?.name ?? null };
  });
}

/**
 * Changes a role through set_user_role, which runs as the signed-in admin and refuses to
 * remove your own admin access or the last admin. Returns the database's reason on failure.
 */
export async function saveUserRole(userId: string, role: Role): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: userId, p_role: role });
  return { error: error ? error.message : null };
}
