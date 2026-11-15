import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  formatMoney,
  formatMonthDay,
  initialsOf,
  openPriorCourses,
  toCourse,
  type CourseRow,
} from "@/lib/data/course-mapper";
import { courseCard } from "@/lib/organizer/card";
import type { Course } from "@/lib/types";

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: "c1",
    organizer_id: "u1",
    name: "UMD Spring Retreat",
    course_type: "happiness",
    format: "in_person",
    start_date: "2027-03-05",
    end_date: "2027-03-07",
    teachers: null,
    est_participants: 14,
    funding_sources: ["university"],
    journey_course_id: "J-1",
    agreement_status: "yes",
    campuses: { name: "University of Maryland, College Park" },
    clients: { full_name: "UMD", attn: null, address: null, email: null },
    course_steps: [
      { step_no: 2, status: "done" },
      { step_no: 1, status: "done" },
    ],
    funding_requests: null,
    invoices: [],
    ...over,
  }) as unknown as CourseRow;

describe("formatting", () => {
  it("formats dates, money, sizes and initials", () => {
    expect(formatMonthDay("2026-11-12T15:00:00Z")).toBe("Nov 12");
    expect(formatMonthDay("2026-11-12")).toBe("Nov 12");
    expect(formatMoney(900)).toBe("$900.00");
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatFileSize(1_200_000)).toBe("1.2 MB");
    expect(formatFileSize(340_000)).toBe("340 KB");
    expect(initialsOf("Maya Chen", "m@x.edu")).toBe("MC");
    expect(initialsOf("", "maya@x.edu")).toBe("M");
  });
});

describe("toCourse", () => {
  it("always returns 8 steps in order, defaulting missing ones to todo", () => {
    const c = toCourse(row());
    expect(c.steps).toEqual(["done", "done", "todo", "todo", "todo", "todo", "todo", "todo"]);
  });

  it("maps campus, client and basic fields", () => {
    const c = toCourse(row());
    expect(c.university).toBe("University of Maryland, College Park");
    expect(c.client).toEqual({ fullName: "UMD", attn: undefined, address: undefined, email: undefined });
    expect(c.funders).toEqual(["university"]);
    expect(c.funding).toBeUndefined();
  });

  it("maps a funding request with its documents", () => {
    const c = toCourse(
      row({
        funding_requests: {
          status: "approved",
          submitted_at: "2026-11-12T10:00:00Z",
          reviewed_at: "2026-11-13T10:00:00Z",
          total_funding: 900,
          needed_by: "2026-11-26",
          student_fee: 0,
          funding_request_documents: [
            { documents: { id: "d1", file_name: "letter.pdf", size_bytes: 1_200_000, created_at: "2026-11-12T10:00:00Z" } },
          ],
        },
      }),
    );
    expect(c.funding).toMatchObject({
      status: "approved",
      submittedOn: "Nov 12",
      approvedOn: "Nov 13",
      totalFunding: "$900.00",
      neededBy: "11/26/2026",
      studentsPayPart: false,
      agreement: "yes",
    });
    expect(c.funding?.documents).toEqual([{ id: "d1", name: "letter.pdf", size: "1.2 MB", uploadedOn: "Nov 12" }]);
  });

  it("treats a drafted course as having no type and picks the latest invoice number", () => {
    const c = toCourse(row({ course_type: null, invoices: [{ invoice_number: null }, { invoice_number: "INV-1" }] }));
    expect(c.type).toBeNull();
    expect(c.invoiceNumber).toBe("INV-1");
  });
});

describe("openPriorCourses", () => {
  const mk = (id: string, start: string, end: string, last: Course["steps"][7]): Course => ({
    ...toCourse(row({ id, start_date: start, end_date: end })),
    steps: ["done", "done", "done", "done", "done", "done", "done", last],
  });
  it("lists earlier unclosed courses by the same organizer only", () => {
    const current = mk("now", "2027-03-05", "2027-03-07", "todo");
    const open = mk("a", "2026-09-01", "2026-09-03", "waiting");
    const closed = mk("b", "2026-08-01", "2026-08-03", "done");
    const later = mk("c", "2027-06-01", "2027-06-03", "todo");
    expect(openPriorCourses(current, [current, open, closed, later]).map((c) => c.id)).toEqual(["a"]);
  });
});

describe("courseCard", () => {
  it("describes drafts, waiting steps and closed courses", () => {
    expect(courseCard(toCourse(row({ course_type: null }))).statusLabel).toBe("Draft");
    const waiting = toCourse(row({ course_steps: [1, 2].map((n) => ({ step_no: n, status: "done" })).concat([{ step_no: 3, status: "waiting" }]) }));
    expect(courseCard(waiting, { funding: { status: "submitted", reviewNote: null, submittedAt: null }, invoice: null })).toMatchObject({
      statusLabel: "Waiting on IAHV",
      tone: "waiting",
    });
    const closed = toCourse(row({ course_steps: Array.from({ length: 8 }, (_, i) => ({ step_no: i + 1, status: "done" })) }));
    expect(courseCard(closed).statusLabel).toBe("Closed");
  });
});
