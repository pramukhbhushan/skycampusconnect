// Admin settings (plan-v3). Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Stub until B-5.3: pricing constants come from the `settings` table.

import { DEFAULT_PRICING, type PricingConstants } from "@/lib/pricing";

export async function getPricing(): Promise<PricingConstants> {
  return DEFAULT_PRICING;
}
