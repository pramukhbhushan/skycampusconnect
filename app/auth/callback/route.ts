// OAuth callback: Google -> Supabase -> here with ?code=. Exchanges the code for a
// session cookie, then sends the user to their home page. Owner: Engineer A (Aryan).

import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/server";
import { HOME_BY_ROLE } from "@/lib/supabase/require-role";
import type { Role } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const fail = () => NextResponse.redirect(`${origin}/login?error=auth`);
  if (!code) return fail();

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();

  const next = safeNextPath(searchParams.get("next"));
  if (next) return NextResponse.redirect(`${origin}${next}`);

  // No explicit target: go to the role's home. The profiles row is created by the
  // database trigger when the user is first created.
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  const { data: profile } = userId
    ? await supabase.from("profiles").select("role").eq("id", userId).single()
    : { data: null };
  const home = profile ? HOME_BY_ROLE[profile.role as Role] : "/organizer";
  return NextResponse.redirect(`${origin}${home}`);
}
