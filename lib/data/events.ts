// Audit log (plan-v3 `events`). Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
// Every write (server action) calls logEvent right after it succeeds.
// Row-level security only lets you log as yourself, for a course you can access.

import type { Json } from "@/lib/db/database.types";
import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/lib/types";

export async function logEvent(courseId: string, type: EventType, payload: Record<string, unknown> = {}): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const actorId = data?.claims.sub;
  if (!actorId) throw new Error("logEvent: nobody is signed in");

  const { error } = await supabase
    .from("events")
    .insert({ course_id: courseId, actor_id: actorId, type, payload: payload as Json });
  if (error) throw new Error(`logEvent failed: ${error.message}`);
}
