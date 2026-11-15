import { describe, expect, it } from "vitest";
import type { CourseProgress } from "@/lib/data/course-mapper";
import { courseCard } from "@/lib/organizer/card";
import type { Course, StepStatus } from "@/lib/types";

const course = (steps: StepStatus[], over: Partial<Course> = {}): Course => ({
  id: "c1",
  organizerId: "u1",
  name: "UMD Spring Retreat",
  type: "happiness",
  format: "in_person",
  university: "UMD",
  startDate: "2027-03-05",
  endDate: "2027-03-07",
  teachers: null,
  estParticipants: 14,
  funders: ["university"],
  journeyCourseId: "J-1",
  steps,
  ...over,
});
const none: CourseProgress = { funding: null, invoice: null };
const D: StepStatus = "done";
const T: StepStatus = "todo";

describe("courseCard", () => {
  it("asks for more funding information first, quoting IAHV", () => {
    const c = courseCard(course([D, D, "in_progress", T, T, T, T, T]), {
      funding: { status: "needs_info", reviewNote: "Letter must show the amount", submittedAt: null },
      invoice: { status: "requested", number: null, requestedAt: "2026-11-10T00:00:00Z" },
    });
    expect(c).toMatchObject({ statusLabel: "Action due", tone: "late", cta: { href: "/organizer/courses/c1/funding" } });
    expect(c.next).toContain("Letter must show the amount");
  });

  it("waiting on funding suggests starting the invoice", () => {
    const c = courseCard(course([D, D, "waiting", T, T, T, T, T]), {
      funding: { status: "submitted", reviewNote: null, submittedAt: "2026-11-12T10:00:00Z" },
      invoice: null,
    });
    expect(c).toMatchObject({ statusLabel: "Waiting on IAHV", cta: { label: "Start invoice request" } });
    expect(c.next).toContain("Nov 12");
  });

  it("waiting on the invoice number", () => {
    const c = courseCard(course([D, D, "skipped", "waiting", T, T, T, T]), {
      funding: null,
      invoice: { status: "requested", number: null, requestedAt: "2026-11-10T00:00:00Z" },
    });
    expect(c).toMatchObject({ statusLabel: "Waiting on IAHV" });
    expect(c.next).toContain("Nov 10");
  });

  it("an issued invoice: forward it before the course, enter it in Journey after attendance", () => {
    const issued: CourseProgress = { funding: null, invoice: { status: "issued", number: "INV-24817", requestedAt: "2026-10-14T00:00:00Z" } };
    expect(courseCard(course([D, D, "skipped", D, T, T, T, T]), issued).next).toContain("forward it to the university");
    const after = courseCard(course([D, D, "skipped", D, D, D, "waiting", T]), issued);
    expect(after).toMatchObject({ statusLabel: "Action due", tone: "late", cta: { label: "Open course accounting" } });
    expect(after.next).toContain("INV-24817");
  });

  it("says what the next step needs", () => {
    expect(courseCard(course([D, T, T, T, T, T, T, T], { journeyCourseId: null }), none).next).toContain("add its course ID");
    expect(courseCard(course([D, D, T, T, T, T, T, T], { journeyCourseId: null }), none).cta.label).toBe("Add Journey ID");
    expect(courseCard(course([D, D, T, T, T, T, T, T]), none).cta.label).toBe("Request funding approval");
    expect(courseCard(course([D, D, "skipped", T, T, T, T, T]), none).cta.label).toBe("Request invoice");
    expect(courseCard(course([D, D, "skipped", D, T, T, T, T]), none).next).toContain("sign-ups");
  });

  it("handles drafts, closed courses and waiting for payment", () => {
    expect(courseCard(course([T, T, T, T, T, T, T, T], { type: null }), none).statusLabel).toBe("Draft");
    expect(courseCard(course([D, D, "skipped", D, D, D, D, D]), none).statusLabel).toBe("Closed");
    expect(
      courseCard(course([D, D, "skipped", D, D, D, D, "waiting"]), {
        funding: null,
        invoice: { status: "accounting_submitted", number: "INV-1", requestedAt: "2026-10-14T00:00:00Z" },
      }).next,
    ).toContain("payment");
  });
});
