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
  if (url === process.env.SHARED_SUPABASE_URL) throw new Error("E2E_SUPABASE_URL points at the shared dev project. Use the separate e2e project.");
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
