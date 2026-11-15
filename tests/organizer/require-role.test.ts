import { beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const single = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
  }),
}));

// redirect() throws in Next; mimic that so code after it never runs.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { requireRole } from "@/lib/supabase/require-role";

const profile = (role: string) => ({ data: { id: "u1", email: "a@b.edu", name: "A", role } });

beforeEach(() => {
  getClaims.mockReset();
  single.mockReset();
});

describe("requireRole", () => {
  it("sends signed-out visitors to /login", async () => {
    getClaims.mockResolvedValue({ data: null });
    await expect(requireRole("organizer")).rejects.toThrow("REDIRECT:/login");
  });

  it("sends users without a profile row to /login", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    single.mockResolvedValue({ data: null });
    await expect(requireRole("organizer")).rejects.toThrow("REDIRECT:/login");
  });

  it("returns the user when the role matches", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    single.mockResolvedValue(profile("organizer"));
    await expect(requireRole("organizer")).resolves.toEqual({
      id: "u1",
      email: "a@b.edu",
      name: "A",
      role: "organizer",
    });
  });

  it("sends an organizer who opens an admin page to /organizer", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    single.mockResolvedValue(profile("organizer"));
    await expect(requireRole("iahv_admin")).rejects.toThrow("REDIRECT:/organizer");
  });

  it("sends an admin who opens an organizer page to /admin", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } } });
    single.mockResolvedValue(profile("iahv_admin"));
    await expect(requireRole("organizer")).rejects.toThrow("REDIRECT:/admin");
  });
});
