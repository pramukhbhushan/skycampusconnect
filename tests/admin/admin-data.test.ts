import { describe, expect, it } from "vitest";
import { NO_FILTERS, getAdminCourseDetail, getAdminDashboard, listAdminCourseIds } from "@/lib/data/admin";
import { getEmailTemplates, getUsers } from "@/lib/data/settings";

const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();

describe("getAdminDashboard", () => {
  it("lists every sample course with no filters", () => {
    const { rows, queueCounts } = getAdminDashboard();
    expect(rows).toHaveLength(8);
    expect(queueCounts).toMatchObject({ all: 8, funding: 1, quote: 1, invoice: 1, payment: 1, follow: 3, none: 1 });
  });

  it("filters by queue but keeps counts for every queue", () => {
    const { rows, queueCounts } = getAdminDashboard({ ...NO_FILTERS, queue: "follow" });
    expect(names(rows)).toEqual(["Fall Premium Retreat", "Rutgers Fall Retreat", "UT Austin Fall Retreat"]);
    expect(queueCounts.all).toBe(8);
  });

  it("filters by the step a course is on", () => {
    expect(names(getAdminDashboard({ ...NO_FILTERS, step: 4 }).rows)).toEqual([
      "Purdue Winter Retreat",
      "UCLA Spring Retreat",
      "UT Austin Fall Retreat",
    ]);
  });

  it("filters by country and campus, and counts follow those filters", () => {
    const ca = getAdminDashboard({ ...NO_FILTERS, country: "CA" });
    expect(names(ca.rows)).toEqual(["Toronto Winter Retreat"]);
    expect(ca.queueCounts).toMatchObject({ all: 1, none: 1, follow: 0 });

    const umd = getAdminDashboard({ ...NO_FILTERS, campus: "University of Maryland, College Park" });
    expect(names(umd.rows)).toEqual(["Fall Premium Retreat", "UMD Spring Retreat"]);
  });

  it("searches course, campus and organizer, ignoring case", () => {
    expect(names(getAdminDashboard({ ...NO_FILTERS, q: "RUTGERS" }).rows)).toEqual(["Rutgers Fall Retreat"]);
    expect(names(getAdminDashboard({ ...NO_FILTERS, q: "maya" }).rows)).toEqual(["Fall Premium Retreat", "UMD Spring Retreat"]);
    expect(getAdminDashboard({ ...NO_FILTERS, q: "nothing matches this" }).rows).toEqual([]);
  });

  it("always offers every campus in the campus filter", () => {
    expect(getAdminDashboard({ ...NO_FILTERS, country: "CA" }).campuses).toHaveLength(7);
  });
});

describe("getAdminCourseDetail", () => {
  it("returns the course, organizer, activity and estimated fee", () => {
    const d = getAdminCourseDetail("umd-spring-2027")!;
    expect(d.course.name).toBe("UMD Spring Retreat");
    expect(d.organizer.email).toBe("mchen@umd.edu");
    expect(d.row.statusLabel).toBe("Funding approval");
    expect(d.estimatedFee).toBe(900);
    expect(d.activity[0].text).toMatch(/funding request/);
  });

  it("returns nothing for drafts or unknown ids", () => {
    expect(getAdminCourseDetail("draft-new")).toBeUndefined();
    expect(getAdminCourseDetail("nope")).toBeUndefined();
  });

  it("has a detail page for every dashboard course", () => {
    expect(listAdminCourseIds()).toHaveLength(8);
    for (const id of listAdminCourseIds()) expect(getAdminCourseDetail(id)).toBeDefined();
  });
});

describe("settings data", () => {
  it("lists one admin and every organizer", async () => {
    const users = await getUsers();
    expect(users.filter((u) => u.role === "iahv_admin")).toHaveLength(1);
    expect(users.filter((u) => u.role === "organizer")).toHaveLength(7);
  });

  it("has a template for every reminder type", async () => {
    expect((await getEmailTemplates()).map((t) => t.name)).toEqual([
      "Request your invoice",
      "Submit course accounting",
      "Payment overdue",
      "Payment coming up",
    ]);
  });
});
