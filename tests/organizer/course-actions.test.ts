import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole, logEvent, rpc } = vi.hoisted(() => ({ requireRole: vi.fn(), logEvent: vi.fn(), rpc: vi.fn() }));
const calls: { table: string; op: string; payload?: unknown }[] = [];
let updateResult: { data: unknown; error: unknown } = { data: [{ id: "c1" }], error: null };

function table(name: string) {
  const chain = {
    select: () => chain,
    ilike: () => chain,
    limit: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: name === "campuses" ? { id: "campus-1" } : null, error: null }),
    single: async () => ({ data: { id: "campus-new" }, error: null }),
    insert: (payload: unknown) => (calls.push({ table: name, op: "insert", payload }), chain),
    update: (payload: unknown) => {
      calls.push({ table: name, op: "update", payload });
      const thenable = {
        eq: () => thenable,
        select: async () => updateResult,
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok),
      };
      return thenable;
    },
  };
  return chain;
}

vi.mock("@/lib/supabase/require-role", () => ({ requireRole }));
vi.mock("@/lib/data/events", () => ({ logEvent }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from: table }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { createCourse, saveCourseForm, updateCourse } from "@/app/organizer/courses/actions";

const input = {
  name: "UMD Spring Retreat",
  type: "happiness",
  format: "in_person",
  startDate: "2027-03-05",
  endDate: "2027-03-07",
  university: "University of Maryland, College Park",
  estParticipants: 14,
  funders: ["students"],
  requirements: [true, true, false],
};

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  updateResult = { data: [{ id: "c1" }], error: null };
  requireRole.mockResolvedValue({ id: "u1", email: "m@x.edu", name: "Maya", role: "organizer" });
  rpc.mockResolvedValue({ data: "new-id", error: null });
});

describe("createCourse", () => {
  it("creates the course with its campus and logs it", async () => {
    await expect(createCourse(input)).resolves.toBe("new-id");
    expect(requireRole).toHaveBeenCalledWith("organizer");
    expect(rpc).toHaveBeenCalledWith(
      "create_course",
      expect.objectContaining({ p_name: "UMD Spring Retreat", p_campus_id: "campus-1", p_funding_sources: ["students"] }),
    );
    // students only + requirements 1 and 2 ticked -> step 1 done
    expect(calls).toContainEqual(expect.objectContaining({ table: "course_steps", op: "update", payload: expect.objectContaining({ status: "done" }) }));
    expect(logEvent).toHaveBeenCalledWith("new-id", "course.created", { name: "UMD Spring Retreat", complete: true });
  });

  it("rejects invalid input before touching the database", async () => {
    await expect(createCourse({ ...input, university: "GW" })).rejects.toThrow(/Invalid course/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stops when the caller isn't an organizer", async () => {
    requireRole.mockRejectedValue(new Error("REDIRECT:/login"));
    await expect(createCourse(input)).rejects.toThrow("REDIRECT:/login");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("updateCourse", () => {
  it("throws when the course isn't the caller's", async () => {
    updateResult = { data: [], error: null };
    await expect(updateCourse("other", input)).rejects.toThrow("Course not found");
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("saves and logs", async () => {
    await updateCourse("c1", input);
    expect(logEvent).toHaveBeenCalledWith("c1", "course.updated", { complete: true });
  });
});

describe("saveCourseForm", () => {
  const form = (entries: [string, string][]) => {
    const fd = new FormData();
    for (const [k, v] of entries) fd.append(k, v);
    return fd;
  };

  it("returns field errors instead of saving", async () => {
    const r = await saveCourseForm({}, form([["intent", "continue"], ["name", "X"]]));
    expect(r.errors?.type).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("goes to the invoice step when only students pay", async () => {
    const fd = form([
      ["intent", "continue"], ["name", "UMD Spring Retreat"], ["type", "happiness"], ["format", "in_person"],
      ["startDate", "2027-03-05"], ["endDate", "2027-03-07"], ["university", "University of Maryland, College Park"],
      ["estParticipants", "14"], ["funders", "students"],
    ]);
    await expect(saveCourseForm({}, fd)).rejects.toThrow("REDIRECT:/organizer/courses/new-id/invoice");
  });

  it("a draft goes back home", async () => {
    await expect(saveCourseForm({}, form([["intent", "draft"], ["name", "Draft"]]))).rejects.toThrow("REDIRECT:/organizer");
  });
});
