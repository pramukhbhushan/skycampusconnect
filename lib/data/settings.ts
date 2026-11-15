// Admin settings (plan-v3). Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Sample data + admin changes (admin-store.ts) until the backend lands.

import { connection } from "next/server";
import { DEFAULT_TEMPLATES, type EmailTemplate } from "@/lib/email/templates";
import { DEFAULT_PRICING, type PricingConstants } from "@/lib/pricing";
import type { Role } from "@/lib/types";
import { adminStore } from "./admin-store";
import { adminUser } from "./admin-user";
import { organizers } from "./organizer";

export type AppUser = { id: string; name: string; email: string; role: Role; campus: string | null };
export type { EmailTemplate };

// TODO(backend, B-5.3): read the "pricing" row from the `settings` table.
export async function getPricing(): Promise<PricingConstants> {
  await connection(); // admin changes live in memory until the backend lands
  return adminStore.pricing ?? DEFAULT_PRICING;
}

// TODO(backend): select from `profiles` (admins can read every profile under RLS).
export async function getUsers(): Promise<AppUser[]> {
  await connection(); // admin changes live in memory until the backend lands
  const people: AppUser[] = [
    { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: "iahv_admin", campus: null },
    ...organizers.map((o) => ({ id: o.id, name: o.name, email: o.email, role: "organizer" as const, campus: o.campus })),
  ];
  return people.map((p) => ({ ...p, role: adminStore.roles.get(p.id) ?? p.role }));
}

// TODO(backend, B-4.4): read from `email_templates`.
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await connection(); // admin changes live in memory until the backend lands
  return DEFAULT_TEMPLATES.map((t) => ({ ...t, ...adminStore.templates.get(t.key) }));
}
