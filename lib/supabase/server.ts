// Supabase client for Server Components, Server Actions and Route Handlers.
// Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
//
// It reads the signed-in user's session from cookies, so every query runs as that
// user and Postgres row-level security applies. Reading cookies() is request-time
// work: with cacheComponents on, call this from code that sits behind a <Suspense>
// boundary (see node_modules/next/dist/docs/01-app/02-guides/authentication-with-cache-components.md).
// Create one client per request; do not store it in a module-level variable.

import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  // cookies() first: during `next build` it marks the page as request-time and stops
  // prerendering here, so a build without Supabase settings (CI) doesn't throw below.
  const cookieStore = await cookies();
  // With partialPrefetching, cookies() resolves during prerendering (session data is
  // included in the prefetched shell), so it isn't a suspension point by itself. Supabase
  // then reads Date.now() (token expiry), which Next forbids while prerendering. io()
  // marks everything after it as request-time; outside prerendering it resolves at once.
  await io();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. That's fine: proxy.ts refreshes
          // the session cookie on every request, so this write can be skipped.
        }
      },
    },
  });
}
