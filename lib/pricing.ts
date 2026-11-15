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

export function computeFee(
  type: CourseType,
  participants: number,
  payByCard = false,
): FeeBreakdown {
  const base = BASE_PRICE[type];
  const extraStudents = Math.max(0, participants - INCLUDED_STUDENTS);
  const extraAmount = extraStudents * EXTRA_STUDENT_PRICE;
  const subtotal = base + extraAmount;
  const cardFee = payByCard ? Math.round(subtotal * CARD_FEE_RATE * 100) / 100 : 0;
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
