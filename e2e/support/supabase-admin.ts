// Test-project housekeeping with the service-role key. Used ONLY by e2e/auth.setup.ts,
// and only against the separate e2e Supabase project (never the shared dev project).
// Two jobs the app itself can't do: wipe the previous run, and make Kelsi the first admin.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { PERSONAS } from "./personas";

function admin() {
  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY in .env.e2e.local. See ProfileTests.md.");
  if (url === process.env.SHARED_SUPABASE_URL && process.env.E2E_ALLOW_SHARED !== "true") {
    throw new Error("E2E_SUPABASE_URL is the shared dev project. Set E2E_ALLOW_SHARED=true in .env.e2e.local if you mean it.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Deletes the test people (and their courses) from the last run, so each run starts clean. */
export async function wipeTestPeople(): Promise<void> {
  const db = admin();
  const emails = new Set(PERSONAS.map((p) => p.email));
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const ids = data.users.filter((u) => u.email && emails.has(u.email)).map((u) => u.id);
  if (!ids.length) return;

  // courses.organizer_id is ON DELETE RESTRICT, so courses go first (their steps,
  // requests, quotes and invoices cascade).
  const del = await db.from("courses").delete().in("organizer_id", ids);
  if (del.error) throw new Error(`delete courses: ${del.error.message}`);
  for (const id of ids) {
    const r = await db.auth.admin.deleteUser(id);
    if (r.error) throw new Error(`deleteUser: ${r.error.message}`);
  }
}

/** The first IAHV admin can't be made inside the app (only an admin can make an admin). */
export async function makeAdmin(email: string): Promise<void> {
  const db = admin();
  const { data, error } = await db.from("profiles").update({ role: "iahv_admin" }).eq("email", email).select("id");
  if (error) throw new Error(`makeAdmin: ${error.message}`);
  if (!data.length) throw new Error(`makeAdmin: no profile for ${email}. Did "Create account" work?`);
}

/**
 * The campus list is IAHV reference data (only admins edit it). Make sure each test campus
 * is listed with the right country, as an IAHV admin would, so Toronto courses are CA.
 */
export async function ensureCampuses(campuses: { name: string; country: "US" | "CA" }[]): Promise<void> {
  const db = admin();
  const { error } = await db.from("campuses").upsert(campuses, { onConflict: "name" });
  if (error) throw new Error(`ensureCampuses: ${error.message}`);
}

// ---- Admin action fixtures (e2e/admin.spec.ts) ----------------------------------------
// Organizers can't yet submit funding requests, quotes or invoices from the app (A-3.1,
// A-5.1, A-6.2), so the admin action tests get those rows directly. Remove this once the
// organizer forms save them, and create the fixtures through the UI instead.

export const FIXTURE_PREFIX = "AFX";

export type Fixture = { name: string; id: string };
export type AdminFixtures = { funding: Fixture; quote: Fixture; invoice: Fixture; overdue: Fixture };

async function profileId(db: ReturnType<typeof admin>, email: string): Promise<string> {
  const { data, error } = await db.from("profiles").select("id").eq("email", email).single();
  if (error) throw new Error(`No profile for ${email}: ${error.message}`);
  return data.id;
}

async function addCourse(db: ReturnType<typeof admin>, organizerId: string, campusName: string, name: string, funders: ("students" | "university")[]): Promise<string> {
  const campus = await db.from("campuses").select("id").eq("name", campusName).single();
  if (campus.error) throw new Error(`campus ${campusName}: ${campus.error.message}`);
  const { data, error } = await db
    .from("courses")
    .insert({
      organizer_id: organizerId,
      campus_id: campus.data.id,
      name,
      course_type: "happiness",
      start_date: "2027-05-07",
      end_date: "2027-05-09",
      est_participants: 12,
      funding_sources: funders,
    })
    .select("id")
    .single();
  if (error) throw new Error(`add course ${name}: ${error.message}`);
  const steps = Array.from({ length: 8 }, (_, i) => ({
    course_id: data.id,
    step_no: i + 1,
    status: (i === 0 ? "done" : i === 2 && !funders.includes("university") ? "skipped" : "todo") as "done" | "skipped" | "todo",
  }));
  const s = await db.from("course_steps").insert(steps);
  if (s.error) throw new Error(`add steps: ${s.error.message}`);
  return data.id;
}

/** Four courses, one per admin queue, owned by the given organizer. */
export async function seedAdminFixtures(organizerEmail: string, campusName: string): Promise<AdminFixtures> {
  const db = admin();
  await deleteAdminFixtures();
  const owner = await profileId(db, organizerEmail);
  const now = new Date().toISOString();

  const funding = { name: `${FIXTURE_PREFIX} Funding Retreat`, id: await addCourse(db, owner, campusName, `${FIXTURE_PREFIX} Funding Retreat`, ["university"]) };
  const f = await db.from("funding_requests").insert({ course_id: funding.id, total_funding: 700, needed_by: "2027-04-01", status: "submitted", submitted_at: now });
  if (f.error) throw new Error(`funding: ${f.error.message}`);

  const quote = { name: `${FIXTURE_PREFIX} Quote Retreat`, id: await addCourse(db, owner, campusName, `${FIXTURE_PREFIX} Quote Retreat`, ["students"]) };
  const q = await db.from("quotes").insert({ course_id: quote.id, amount: 700, status: "requested" });
  if (q.error) throw new Error(`quote: ${q.error.message}`);

  const invoice = { name: `${FIXTURE_PREFIX} Invoice Retreat`, id: await addCourse(db, owner, campusName, `${FIXTURE_PREFIX} Invoice Retreat`, ["students"]) };
  const i = await db.from("invoices").insert({ course_id: invoice.id, amount: 700, due_date: "2027-06-01", status: "requested" });
  if (i.error) throw new Error(`invoice: ${i.error.message}`);

  // Sent to the school, due date passed, not paid: shows as "Payment overdue".
  const overdue = { name: `${FIXTURE_PREFIX} Overdue Retreat`, id: await addCourse(db, owner, campusName, `${FIXTURE_PREFIX} Overdue Retreat`, ["students"]) };
  const o = await db.from("invoices").insert({
    course_id: overdue.id,
    amount: 700,
    due_date: "2026-01-15",
    status: "sent_to_client",
    invoice_number: `${FIXTURE_PREFIX}-INV-1`,
    issued_at: "2025-12-15T12:00:00Z",
    sent_at: "2025-12-16T12:00:00Z",
    requested_at: "2025-12-10T12:00:00Z",
  });
  if (o.error) throw new Error(`overdue invoice: ${o.error.message}`);

  return { funding, quote, invoice, overdue };
}

export async function deleteAdminFixtures(): Promise<void> {
  const db = admin();
  const { error } = await db.from("courses").delete().like("name", `${FIXTURE_PREFIX} %`);
  if (error) throw new Error(`delete fixtures: ${error.message}`);
}
