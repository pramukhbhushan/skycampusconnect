// Audit log (plan-v3 `events`). Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
// Stub until A-1.2: every write calls logEvent; the body becomes an insert into `events`.

import type { EventType } from "@/lib/types";

export async function logEvent(courseId: string, type: EventType, payload: Record<string, unknown> = {}): Promise<void> {
  void courseId;
  void type;
  void payload;
}
