import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING, computeFee, money, type PricingConstants } from "@/lib/pricing";

describe("computeFee", () => {
  it("charges only the base price up to 10 students", () => {
    expect(computeFee("happiness", 10)).toEqual({
      base: 500,
      extraStudents: 0,
      extraAmount: 0,
      subtotal: 500,
      cardFee: 0,
      total: 500,
    });
    expect(computeFee("premium", 4).total).toBe(1000);
  });

  it("adds $100 for each student over 10", () => {
    const fee = computeFee("happiness", 14);
    expect(fee.extraStudents).toBe(4);
    expect(fee.extraAmount).toBe(400);
    expect(fee.total).toBe(900);
    expect(computeFee("premium", 14).total).toBe(1400);
  });

  it("never counts negative extra students", () => {
    expect(computeFee("happiness", 0).extraStudents).toBe(0);
  });

  it("adds a 3% card fee rounded to cents", () => {
    const fee = computeFee("happiness", 14, true);
    expect(fee.cardFee).toBe(27);
    expect(fee.total).toBe(927);
    // 1,100 * 3% = 33.00; 533 * 0.03 = 15.99 (checks rounding to cents)
    expect(computeFee("premium", 11, true).cardFee).toBe(33);
    const odd: PricingConstants = { ...DEFAULT_PRICING, basePrice: { happiness: 533, premium: 1000 } };
    expect(computeFee("happiness", 10, true, odd).cardFee).toBe(15.99);
  });

  it("uses pricing constants passed in (admin settings)", () => {
    const custom: PricingConstants = {
      basePrice: { happiness: 600, premium: 1200 },
      includedStudents: 12,
      extraStudentPrice: 50,
      cardFeeRate: 0.05,
    };
    const fee = computeFee("premium", 14, true, custom);
    expect(fee.subtotal).toBe(1300);
    expect(fee.cardFee).toBe(65);
    expect(fee.total).toBe(1365);
  });
});

describe("money", () => {
  it("formats with cents by default", () => {
    expect(money(900)).toBe("$900.00");
    expect(money(1427.5)).toBe("$1,427.50");
  });

  it("can drop cents", () => {
    expect(money(1400, false)).toBe("$1,400");
  });
});
