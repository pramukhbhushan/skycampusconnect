import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole, logEvent } = vi.hoisted(() => ({ requireRole: vi.fn(), logEvent: vi.fn() }));
const writes: { table: string; payload: unknown }[] = [];
let owned: unknown[] = [{ id: "c1" }];

// Every query resolves to { data: owned } once awaited, whatever the chain.
function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) q[m] = () => q;
  q.update = (payload: unknown) => (writes.push({ table, payload }), q);
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: owned, error: null }).then(ok);
  return q;
}

vi.mock("@/lib/supabase/require-role", () => ({ requireRole }));
vi.mock("@/lib/data/events", () => ({ logEvent }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: query }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { saveStepForm, updateStep } from "@/app/organizer/courses/actions";

beforeEach(() => {
  vi.clearAllMocks();
  writes.length = 0;
  owned = [{ id: "c1" }];
  requireRole.mockResolvedValue({ id: "u1", email: "m@x.edu", name: "Maya", role: "organizer" });
});

describe("updateStep", () => {
  it("saves the Journey ID and marks step 2 done when complete", async () => {
    await updateStep("c1", 2, { checks: [true, true], value: "J-104582" });
    expect(writes[0]).toEqual({ table: "courses", payload: { journey_course_id: "J-104582" } });
    expect(writes[1]).toMatchObject({ table: "course_steps", payload: { status: "done", data: { checks: [true, true] }, completed_by: "u1" } });
    expect(logEvent).toHaveBeenCalledWith("c1", "step.updated", { step: 2, status: "done" });
  });

  it("step 5 has no course field and is in progress when partly ticked", async () => {
    await updateStep("c1", 5, { checks: [true, false, false] });
    expect(writes).toEqual([
      expect.objectContaining({ table: "course_steps", payload: expect.objectContaining({ status: "in_progress", completed_at: null }) }),
    ]);
  });

  it("refuses steps without a checklist and courses that aren't yours", async () => {
    await expect(updateStep("c1", 3, {})).rejects.toThrow("no checklist");
    owned = [];
    await expect(updateStep("other", 5, { checks: [true, true, true] })).rejects.toThrow("Course not found");
    expect(writes.filter((w) => w.table === "course_steps")).toHaveLength(0);
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe("saveStepForm", () => {
  it("reads ticks by position and reports Saved", async () => {
    const fd = new FormData();
    fd.set("courseId", "c1");
    fd.set("stepNo", "5");
    fd.set("check0", "on");
    fd.set("check2", "on");
    await expect(saveStepForm({}, fd)).resolves.toEqual({ saved: true });
    expect(writes[0]).toMatchObject({ payload: { data: { checks: [true, false, true] } } });
  });

  it("returns a field error without saving", async () => {
    const fd = new FormData();
    fd.set("courseId", "c1");
    fd.set("stepNo", "6");
    fd.set("value", "lots");
    const r = await saveStepForm({}, fd);
    expect(r.errors?.actualParticipants).toBeTruthy();
    expect(writes).toHaveLength(0);
  });
});
