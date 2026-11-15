import { describe, expect, it } from "vitest";
import { checklistStatus, isChecklistStep, parseStepUpdate, savedChecks } from "@/lib/organizer/step-checklists";

describe("parseStepUpdate", () => {
  it("normalizes ticks to the step's item count", () => {
    const r = parseStepUpdate(5, { checks: [true, "yes", true, true] });
    expect(r).toEqual({ ok: true, update: { checks: [true, false, true] } });
  });

  it("validates the Journey course ID", () => {
    expect(parseStepUpdate(2, { checks: [], value: " J-104582 " })).toEqual({
      ok: true,
      update: { checks: [false, false], journeyCourseId: "J-104582" },
    });
    expect(parseStepUpdate(2, { checks: [], value: "not an id!" }).ok).toBe(false);
    expect(parseStepUpdate(2, { checks: [], value: "" })).toEqual({ ok: true, update: { checks: [false, false], journeyCourseId: null } });
  });

  it("validates the completed-student count", () => {
    expect(parseStepUpdate(6, { checks: [true], value: "12" })).toEqual({ ok: true, update: { checks: [true], actualParticipants: 12 } });
    expect(parseStepUpdate(6, { checks: [true], value: "1.5" }).ok).toBe(false);
    expect(parseStepUpdate(6, { checks: [true], value: "-1" }).ok).toBe(false);
  });
});

describe("checklistStatus", () => {
  it("is done only when every box is ticked and the field is filled", () => {
    expect(checklistStatus(2, { checks: [true, true], journeyCourseId: "J-1" })).toBe("done");
    expect(checklistStatus(2, { checks: [true, true], journeyCourseId: null })).toBe("in_progress");
    expect(checklistStatus(5, { checks: [true, true, true] })).toBe("done");
    expect(checklistStatus(5, { checks: [false, true, false] })).toBe("in_progress");
    expect(checklistStatus(5, { checks: [false, false, false] })).toBe("todo");
    expect(checklistStatus(6, { checks: [false], actualParticipants: 0 })).toBe("in_progress");
  });
});

describe("helpers", () => {
  it("knows which steps have checklists and reads saved ticks", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].filter(isChecklistStep)).toEqual([2, 5, 6]);
    expect(savedChecks(5, { checks: [true, false, true] })).toEqual([true, false, true]);
    expect(savedChecks(5, null)).toEqual([false, false, false]);
  });
});
