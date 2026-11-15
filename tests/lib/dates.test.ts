import { describe, expect, it } from "vitest";
import { addDays, endOfNextQuarter, formatDate, formatNumeric, formatRange } from "@/lib/dates";

describe("formatDate / formatNumeric", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatDate("2027-03-05")).toBe("Mar 5, 2027");
    expect(formatDate("2026-12-31")).toBe("Dec 31, 2026");
    expect(formatNumeric("2027-03-05")).toBe("03/05/2027");
  });
});

describe("formatRange", () => {
  it("shortens a range within one month", () => {
    expect(formatRange("2027-03-05", "2027-03-07")).toBe("Mar 5–7, 2027");
  });

  it("shows both months when they differ", () => {
    expect(formatRange("2027-01-30", "2027-02-01")).toBe("Jan 30 – Feb 1, 2027");
  });

  it("shows both years when they differ", () => {
    expect(formatRange("2026-12-30", "2027-01-01")).toBe("Dec 30, 2026 – Jan 1, 2027");
  });

  it("says 'Not set yet' when a date is missing", () => {
    expect(formatRange(null, "2027-03-07")).toBe("Not set yet");
    expect(formatRange("2027-03-05", null)).toBe("Not set yet");
  });
});

describe("addDays", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2027-03-07", 14)).toBe("2027-03-21");
    expect(addDays("2027-03-07", 28)).toBe("2027-04-04");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
  });

  it("handles leap years", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("endOfNextQuarter", () => {
  it("returns the last day of the following quarter", () => {
    expect(endOfNextQuarter("2027-03-07")).toBe("2027-06-30");
    expect(endOfNextQuarter("2027-05-15")).toBe("2027-09-30");
    expect(endOfNextQuarter("2027-08-01")).toBe("2027-12-31");
  });

  it("rolls into the next year from Q4", () => {
    expect(endOfNextQuarter("2026-11-08")).toBe("2027-03-31");
  });
});
