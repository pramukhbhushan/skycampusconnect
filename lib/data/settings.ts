// Admin settings (plan-v3). Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Sample data until the backend lands; swap the bodies for Supabase queries.

import { DEFAULT_PRICING, type PricingConstants } from "@/lib/pricing";
import type { Role } from "@/lib/types";
import { adminUser } from "./admin";
import { organizers } from "./organizer";
import { reminderGroups } from "./reminders";

export type AppUser = { id: string; name: string; email: string; role: Role; campus: string | null };

export type EmailTemplate = { key: string; name: string; subject: string; body: string };

// TODO(backend, B-5.3): read the "pricing" row from the `settings` table.
export async function getPricing(): Promise<PricingConstants> {
  return DEFAULT_PRICING;
}

// TODO(backend): select from `profiles` (admins can read every profile under RLS).
export async function getUsers(): Promise<AppUser[]> {
  return [
    { id: "iahv-admin", name: adminUser.name, email: adminUser.email, role: "iahv_admin", campus: null },
    ...organizers.map((o) => ({ id: o.id, name: o.name, email: o.email, role: "organizer" as const, campus: o.campus })),
  ];
}

// TODO(backend, B-4.2/B-4.4): read from `email_templates`.
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return reminderGroups.map((g) => ({ key: g.id, ...g.template }));
}
