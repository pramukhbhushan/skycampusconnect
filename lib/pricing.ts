import type { CourseType } from "./types";

// Pricing constants from docs/forms. Move to an admin-editable settings table later.
export const BASE_PRICE: Record<CourseType, number> = { happiness: 500, premium: 1000 };
export const INCLUDED_STUDENTS = 10;
export const EXTRA_STUDENT_PRICE = 100;
export const CARD_FEE_RATE = 0.03;

export const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  happiness: "SKY Happiness Retreat",
  premium: "SKY Premium Retreat",
};

export type FeeBreakdown = {
  base: number;
  extraStudents: number;
  extraAmount: number;
  subtotal: number;
  cardFee: number;
  total: number;
};

/** Pricing inputs. Admins will edit these in Settings (B-5.3, `getPricing()`). */
export type PricingConstants = {
  basePrice: Record<CourseType, number>;
  includedStudents: number;
  extraStudentPrice: number;
  cardFeeRate: number;
};

export const DEFAULT_PRICING: PricingConstants = {
  basePrice: BASE_PRICE,
  includedStudents: INCLUDED_STUDENTS,
  extraStudentPrice: EXTRA_STUDENT_PRICE,
  cardFeeRate: CARD_FEE_RATE,
};

export function computeFee(
  type: CourseType,
  participants: number,
  payByCard = false,
  pricing: PricingConstants = DEFAULT_PRICING,
): FeeBreakdown {
  const base = pricing.basePrice[type];
  const extraStudents = Math.max(0, participants - pricing.includedStudents);
  const extraAmount = extraStudents * pricing.extraStudentPrice;
  const subtotal = base + extraAmount;
  const cardFee = payByCard ? Math.round(subtotal * pricing.cardFeeRate * 100) / 100 : 0;
  return { base, extraStudents, extraAmount, subtotal, cardFee, total: subtotal + cardFee };
}

export function money(n: number, cents = true): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    })
  );
}
