import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const insert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, from: () => ({ insert }) }),
}));

import { logEvent } from "@/lib/data/events";

beforeEach(() => {
  getClaims.mockReset();
  insert.mockReset();
});

describe("logEvent", () => {
  it("records the event as the signed-in user", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    insert.mockResolvedValue({ error: null });
    await logEvent("c1", "course.created", { name: "X" });
    expect(insert).toHaveBeenCalledWith({ course_id: "c1", actor_id: "u1", type: "course.created", payload: { name: "X" } });
  });

  it("defaults to an empty payload", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    insert.mockResolvedValue({ error: null });
    await logEvent("c1", "step.updated");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ payload: {} }));
  });

  it("refuses when nobody is signed in", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(logEvent("c1", "course.created")).rejects.toThrow("nobody is signed in");
    expect(insert).not.toHaveBeenCalled();
  });

  it("throws when the insert fails, so a lost audit entry is never silent", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    insert.mockResolvedValue({ error: { message: "denied" } });
    await expect(logEvent("c1", "course.created")).rejects.toThrow("denied");
  });
});
