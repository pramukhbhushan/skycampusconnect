// What IAHV admins change, kept in server memory until the backend lands.
// Owner: Engineer B. Each write below becomes a Supabase call (an RPC from
// supabase/migrations/*_b_admin_transitions.sql) once A-0.3 provides the client;
// until then changes last until the dev server restarts.
import type { PricingConstants } from "@/lib/pricing";
import type { Role } from "@/lib/types";
import type { FundingStatus, InvoiceStatus, QuoteStatus } from "@/lib/admin/transitions";

export type StoredActivity = { at: string; actor: string; text: string };
export type StoredReminder = { id: string; title: string; target: string; when: string; sentBy: string };

type AdminStore = {
  funding: Map<string, { status: FundingStatus; note?: string }>;
  quotes: Map<string, { status: QuoteStatus; number: string | null }>;
  invoices: Map<string, { status: InvoiceStatus; number: string | null }>;
  activity: Map<string, StoredActivity[]>;
  sent: StoredReminder[];
  templates: Map<string, { subject: string; body: string }>;
  pricing: PricingConstants | null;
  roles: Map<string, Role>;
};

const fresh = (): AdminStore => ({
  funding: new Map(),
  quotes: new Map(),
  invoices: new Map(),
  activity: new Map(),
  sent: [],
  templates: new Map(),
  pricing: null,
  roles: new Map(),
});

// Kept on globalThis so it survives hot reloads in development.
const g = globalThis as typeof globalThis & { __skyAdminStore?: AdminStore };
export const adminStore: AdminStore = (g.__skyAdminStore ??= fresh());

/** Forget every change (used by tests and the dev reset route). */
export function resetAdminStore() {
  Object.assign(adminStore, fresh());
}

export function logActivity(courseId: string, actor: string, text: string, now = new Date()) {
  const at = now.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).replace(/, (\d{1,2}:)/, " · $1");
  const list = adminStore.activity.get(courseId) ?? [];
  adminStore.activity.set(courseId, [{ at, actor, text }, ...list]);
}
