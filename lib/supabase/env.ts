// Supabase connection settings. Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
// Values live in .env.local (gitignored); .env.example lists the names.

// NEXT_PUBLIC_* values are inlined at build time, so each one must be read
// with a literal `process.env.NAME` (not through a variable).
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase settings. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return { url, anonKey };
}
