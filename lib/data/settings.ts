// Admin settings (plan-v3). Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Users come from Supabase; templates and pricing are still sample data + admin changes
// (admin-store.ts) until the backend lands.

import { connection } from "next/server";
import { DEFAULT_TEMPLATES, type EmailTemplate } from "@/lib/email/templates";
import { DEFAULT_PRICING, type PricingConstants } from "@/lib/pricing";
import { loadUsers, type AppUser } from "./admin-db";
import { adminStore } from "./admin-store";

export type { AppUser, EmailTemplate };

// TODO(backend, B-5.3): read the "pricing" row from the `settings` table.
export async function getPricing(): Promise<PricingConstants> {
  await connection(); // admin changes live in memory until the backend lands
  return adminStore.pricing ?? DEFAULT_PRICING;
}

/** Everyone who has signed in, from `profiles` (B-2.2). */
export async function getUsers(): Promise<AppUser[]> {
  return loadUsers();
}

// TODO(backend, B-4.4): read from `email_templates`.
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await connection(); // admin changes live in memory until the backend lands
  return DEFAULT_TEMPLATES.map((t) => ({ ...t, ...adminStore.templates.get(t.key) }));
}
