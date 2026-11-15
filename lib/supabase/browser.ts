// Supabase client for Client Components (for example the "Continue with Google"
// button). Owner: Engineer A (Aryan) (sprint-planning.md 1.1).

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
