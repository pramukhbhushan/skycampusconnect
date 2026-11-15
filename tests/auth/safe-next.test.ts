import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/organizer")).toBe("/organizer");
    expect(safeNextPath("/admin/courses?x=1")).toBe("/admin/courses?x=1");
  });
  it("rejects empty values", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
  });
  it("rejects external and protocol-relative URLs", () => {
    expect(safeNextPath("https://evil.com")).toBeNull();
    expect(safeNextPath("//evil.com")).toBeNull();
    expect(safeNextPath("/\\evil.com")).toBeNull();
    expect(safeNextPath("organizer")).toBeNull();
  });
  it("rejects control characters", () => {
    expect(safeNextPath("/a\r\nSet-Cookie: x")).toBeNull();
  });
});
