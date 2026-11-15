import { describe, expect, it } from "vitest";
import { needsFundingApproval, parseCourse, readCourseForm, step1Status } from "@/lib/organizer/course-form";

const full = {
  name: "UMD Spring Retreat",
  type: "happiness",
  format: "in_person",
  startDate: "2027-03-05",
  endDate: "2027-03-07",
  university: "University of Maryland, College Park",
  teachers: undefined,
  estParticipants: 14,
  funders: ["university"],
  requirements: [true, true, false],
};

describe("readCourseForm", () => {
  it("reads the form fields, payers and checklist", () => {
    const fd = new FormData();
    fd.set("name", "  My retreat ");
    fd.set("estParticipants", "12");
    fd.append("funders", "students");
    fd.append("funders", "donor");
    fd.set("requirement1", "on");
    fd.set("teachers", "");
    const raw = readCourseForm(fd);
    expect(raw).toMatchObject({ name: "My retreat", estParticipants: 12, funders: ["students", "donor"], teachers: undefined });
    expect(raw.requirements).toEqual([false, true, false]);
  });
});

describe("parseCourse", () => {
  it("accepts a complete course", () => {
    const r = parseCourse(full, "continue");
    expect(r).toMatchObject({ ok: true, complete: true, requirements: [true, true, false] });
  });

  it("continue needs every field", () => {
    const r = parseCourse({ ...full, type: undefined }, "continue");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.type).toBeTruthy();
  });

  it("rejects end before start", () => {
    const r = parseCourse({ ...full, endDate: "2027-03-01" }, "continue");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.endDate).toMatch(/before the start/);
  });

  it("a draft needs only a name", () => {
    const r = parseCourse({ name: "Draft", funders: [] }, "draft");
    expect(r).toEqual({ ok: true, data: { name: "Draft" }, complete: false, requirements: [] });
  });

  it("a draft still rejects bad values that were filled in", () => {
    const r = parseCourse({ name: "Draft", university: "GW", funders: [] }, "draft");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.university).toMatch(/full name/);
  });

  it("a draft without a name is rejected", () => {
    expect(parseCourse({ name: "", funders: [] }, "draft").ok).toBe(false);
  });
});

describe("step rules", () => {
  it("funding approval is needed unless only students pay", () => {
    expect(needsFundingApproval(["students"])).toBe(false);
    expect(needsFundingApproval(["students", "university"])).toBe(true);
    expect(needsFundingApproval([])).toBe(false);
  });

  it("step 1 is done once details are complete and the requirements that apply are ticked", () => {
    expect(step1Status(true, ["students"], [true, true, false])).toBe("done");
    expect(step1Status(true, ["university"], [true, true, false])).toBe("in_progress");
    expect(step1Status(true, ["university"], [true, true, true])).toBe("done");
    expect(step1Status(false, ["students"], [true, true, true])).toBe("in_progress");
  });
});
