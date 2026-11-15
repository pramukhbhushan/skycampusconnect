import { describe, expect, it } from "vitest";
import { adminHref, filtersToQuery, hasFilters, parseAdminFilters } from "@/app/admin/filters";
import { NO_FILTERS } from "@/lib/data/admin";

describe("parseAdminFilters", () => {
  it("returns no filters for an empty URL", () => {
    expect(parseAdminFilters({})).toEqual(NO_FILTERS);
  });

  it("reads every filter", () => {
    expect(
      parseAdminFilters({ queue: "follow", campus: "Purdue University", step: "4", country: "ca", q: " retreat " }),
    ).toEqual({ queue: "follow", campus: "Purdue University", step: 4, country: "CA", q: "retreat" });
  });

  it("ignores invalid values instead of failing", () => {
    expect(parseAdminFilters({ queue: "bogus", step: "9", country: "MX" })).toEqual(NO_FILTERS);
    expect(parseAdminFilters({ step: "2.5" }).step).toBeNull();
    expect(parseAdminFilters({ step: "0" }).step).toBeNull();
  });

  it("uses the first value when a parameter repeats", () => {
    expect(parseAdminFilters({ queue: ["invoice", "quote"] }).queue).toBe("invoice");
  });

  it("caps very long search text", () => {
    expect(parseAdminFilters({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("filtersToQuery / adminHref", () => {
  it("omits defaults so the plain dashboard is /admin", () => {
    expect(filtersToQuery(NO_FILTERS)).toBe("");
    expect(adminHref(NO_FILTERS)).toBe("/admin");
  });

  it("round-trips through the URL", () => {
    const f = { queue: "payment" as const, campus: "University of Maryland, College Park", step: 8, country: "US" as const, q: "fall" };
    const parsed = parseAdminFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f))));
    expect(parsed).toEqual(f);
    expect(adminHref(f)).toBe("/admin?queue=payment&campus=University+of+Maryland%2C+College+Park&step=8&country=US&q=fall");
  });
});

describe("hasFilters", () => {
  it("doesn't count the queue as a filter to clear", () => {
    expect(hasFilters({ ...NO_FILTERS, queue: "follow" })).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, step: 3 })).toBe(true);
    expect(hasFilters({ ...NO_FILTERS, q: "   " })).toBe(false);
  });
});
