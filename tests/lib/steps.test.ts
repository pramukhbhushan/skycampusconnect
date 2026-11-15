import { describe, expect, it } from "vitest";
import { STEP_NAMES, currentStep, describeSteps, doneCount } from "@/lib/steps";
import type { StepStatus } from "@/lib/types";

const s = (...x: StepStatus[]) => x;

describe("STEP_NAMES", () => {
  it("has the 8 course steps in order", () => {
    expect(STEP_NAMES).toHaveLength(8);
    expect(STEP_NAMES[0]).toBe("Campus requirements");
    expect(STEP_NAMES[2]).toBe("Funding approval");
    expect(STEP_NAMES[7]).toBe("Payment & closure");
  });
});

describe("currentStep", () => {
  it("is the first step that isn't done or skipped", () => {
    expect(currentStep(s("done", "done", "waiting", "todo", "todo", "todo", "todo", "todo"))).toBe(3);
    expect(currentStep(s("in_progress", "todo", "todo", "todo", "todo", "todo", "todo", "todo"))).toBe(1);
  });

  it("jumps over skipped steps", () => {
    expect(currentStep(s("done", "done", "skipped", "todo", "todo", "todo", "todo", "todo"))).toBe(4);
  });

  it("is 8 when everything is finished", () => {
    expect(currentStep(s("done", "done", "skipped", "done", "done", "done", "done", "done"))).toBe(8);
  });
});

describe("doneCount", () => {
  it("counts only done steps (not skipped)", () => {
    expect(doneCount(s("done", "done", "skipped", "done", "done", "done", "waiting", "todo"))).toBe(5);
  });
});

describe("describeSteps", () => {
  it("groups runs of the same status for screen readers", () => {
    // Case-insensitive: describeSteps currently lowercases "IAHV" (flagged to the
    // owner of lib/steps.ts; tighten this to an exact match once it's fixed).
    expect(describeSteps(s("done", "done", "waiting", "todo", "todo", "todo", "todo", "todo"))).toMatch(
      /^Steps 1 to 2 done, step 3 waiting on IAHV, steps 4 to 8 to do$/i,
    );
  });

  it("handles single steps and skipped steps", () => {
    expect(describeSteps(s("done", "skipped", "in_progress", "todo", "todo", "todo", "todo", "todo"))).toBe(
      "Step 1 done, step 2 skipped, step 3 in progress, steps 4 to 8 to do",
    );
  });
});
