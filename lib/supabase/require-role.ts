// Server-side role check. Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
//
// Call it first in every organizer or admin Server Component, Server Action and
// Route Handler. proxy.ts only redirects early; this is the check that protects data.
// Behind a <Suspense> boundary when called from a page (it reads cookies).

import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";
import { createClient } from "./server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export const HOME_BY_ROLE: Record<Role, string> = {
  organizer: "/organizer",
  iahv_admin: "/admin",
};

/**
 * Returns the signed-in user with the given role.
 * - Not signed in (or no profile yet): redirects to /login.
 * - Signed in with a different role: redirects to that role's own home.
 */
export async function requireRole(role: Role): Promise<CurrentUser> {
  const supabase = await createClient();

  // getClaims() verifies the session token; never trust getSession() on the server.
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/login");

  // Row-level security lets a user read only their own profile row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/login");

  const user: CurrentUser = {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role as Role,
  };
  if (user.role !== role) redirect(HOME_BY_ROLE[user.role]);
  return user;
}
