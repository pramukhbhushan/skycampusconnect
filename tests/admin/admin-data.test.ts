import { beforeEach, describe, expect, it, vi } from "vitest";

// Data functions call next/server's connection() to opt out of prerendering; in unit tests
// there is no request, so make it a no-op.
vi.mock("next/server", () => ({ connection: async () => {} }));

const { NO_FILTERS, getAdminCourseDetail, getAdminDashboard, listAdminCourseIds } = await import("@/lib/data/admin");
const { changeInvoice, changeQuote, decideFunding, setUserRole, updateEmailTemplate, updatePricing } = await import("@/lib/data/admin-actions");
const { resetAdminStore } = await import("@/lib/data/admin-store");
const { getRecipientsFor, getReminderGroups, mergeValuesFor } = await import("@/lib/data/reminders");
const { getEmailTemplates, getPricing, getUsers } = await import("@/lib/data/settings");

const TODAY = "2026-11-15";
const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();
const row = (id: string) => getAdminDashboard(NO_FILTERS, TODAY).rows.find((r) => r.id === id)!;

beforeEach(() => resetAdminStore());

describe("getAdminDashboard", () => {
  it("puts every sample course in its queue for today", () => {
    const { rows, queueCounts } = getAdminDashboard(NO_FILTERS, TODAY);
    expect(rows).toHaveLength(8);
    expect(queueCounts).toMatchObject({ all: 8, funding: 1, quote: 1, invoice: 1, payment: 1, follow: 3, none: 1 });
  });

  it("filters by queue but keeps counts for every queue", () => {
    const { rows, queueCounts } = getAdminDashboard({ ...NO_FILTERS, queue: "follow" }, TODAY);
    expect(names(rows)).toEqual(["Fall Premium Retreat", "Rutgers Fall Retreat", "UT Austin Fall Retreat"]);
    expect(queueCounts.all).toBe(8);
  });

  it("filters by step, country, campus and search", () => {
    expect(names(getAdminDashboard({ ...NO_FILTERS, step: 4 }, TODAY).rows)).toEqual(["Purdue Winter Retreat", "UCLA Spring Retreat", "UT Austin Fall Retreat"]);
    expect(names(getAdminDashboard({ ...NO_FILTERS, country: "CA" }, TODAY).rows)).toEqual(["Toronto Winter Retreat"]);
    expect(names(getAdminDashboard({ ...NO_FILTERS, campus: "University of Maryland, College Park" }, TODAY).rows)).toEqual(["Fall Premium Retreat", "UMD Spring Retreat"]);
    expect(names(getAdminDashboard({ ...NO_FILTERS, q: "maya" }, TODAY).rows)).toEqual(["Fall Premium Retreat", "UMD Spring Retreat"]);
  });

  it("computes due and waiting labels from today's date", () => {
    expect(row("purdue-winter-2027")).toMatchObject({ dueLabel: "Waiting 3 business days", late: false });
    expect(row("ucla-spring-2027")).toMatchObject({ dueLabel: "Waiting 5 business days", late: true });
    expect(row("rutgers-fall-2026")).toMatchObject({ statusLabel: "Payment overdue", dueLabel: "Due Nov 1 · 14 days late" });
  });

  it("links reminders straight to the composer with the course and template picked", () => {
    expect(row("ut-austin-fall-2026").action.href).toBe("/admin/reminders?courses=ut-austin-fall-2026&template=request_invoice");
    expect(row("umd-spring-2027").action.href).toBe("/admin/courses/umd-spring-2027");
  });
});

describe("admin actions move courses between queues (B-3.1, B-5.1, B-6.1)", () => {
  it("issues an invoice number, then it waits for payment, then closes", () => {
    expect(changeInvoice("purdue-winter-2027", "issue", "IAHV Admin", "inv-24901")).toEqual({ ok: true, message: "Issued invoice INV-24901." });
    expect(row("purdue-winter-2027")).toMatchObject({ queue: "payment", statusLabel: "Pending payment" });
    expect(changeInvoice("purdue-winter-2027", "close", "IAHV Admin").ok).toBe(false);
    changeInvoice("purdue-winter-2027", "mark_paid", "IAHV Admin");
    changeInvoice("purdue-winter-2027", "close", "IAHV Admin");
    expect(row("purdue-winter-2027")).toMatchObject({ queue: "none", statusLabel: "Closed" });
  });

  it("refuses an invoice number another course already uses", () => {
    expect(changeInvoice("purdue-winter-2027", "issue", "IAHV Admin", "INV-24817")).toEqual({ ok: false, error: "Invoice INV-24817 is already used on another course." });
  });

  it("approves funding or sends it back with a note", async () => {
    expect(decideFunding("umd-spring-2027", "needs_info", "IAHV Admin").ok).toBe(false); // note required
    expect(decideFunding("umd-spring-2027", "needs_info", "IAHV Admin", "Attach the award letter").ok).toBe(true);
    expect(row("umd-spring-2027")).toMatchObject({ statusLabel: "Funding needs info" });
    expect(decideFunding("umd-spring-2027", "approve", "IAHV Admin").ok).toBe(true);
    expect(row("umd-spring-2027").queue).toBe("none");
    expect((await getAdminCourseDetail("umd-spring-2027", TODAY))!.activity[0].text).toBe("Approved the funding request");
  });

  it("issues and settles quotes", () => {
    expect(changeQuote("ucla-spring-2027", "issue", "IAHV Admin", "q-1042").ok).toBe(true);
    expect(row("ucla-spring-2027")).toMatchObject({ statusLabel: "Quote issued" });
    expect(changeQuote("ucla-spring-2027", "accept", "IAHV Admin").ok).toBe(true);
  });

  it("protects the last admin and your own access", async () => {
    expect(await setUserRole("iahv-admin", "organizer", "iahv-admin")).toMatchObject({ ok: false });
    expect(await setUserRole("maya", "iahv_admin", "iahv-admin")).toMatchObject({ ok: true });
    expect((await getUsers()).find((u) => u.id === "maya")!.role).toBe("iahv_admin");
  });

  it("saves email texts only with known fields, and saves pricing", async () => {
    expect(updateEmailTemplate({ key: "payment_overdue", subject: "Late: {{course_nmae}}", body: "x" })).toEqual({ ok: false, error: "Unknown field: {{course_nmae}}." });
    updateEmailTemplate({ key: "payment_overdue", subject: "Late payment: {{course_name}}", body: "Hi {{organizer_first_name}}" });
    expect((await getEmailTemplates()).find((t) => t.key === "payment_overdue")!.subject).toBe("Late payment: {{course_name}}");

    updatePricing({ basePrice: { happiness: 600, premium: 1200 }, includedStudents: 10, extraStudentPrice: 100, cardFeeRate: 0.03 });
    expect((await getPricing()).basePrice.happiness).toBe(600);
    expect((await getAdminCourseDetail("umd-spring-2027", TODAY))!.estimatedFee).toBe(1000);
  });
});

describe("course detail and reminders data", () => {
  it("returns the course, organizer, facts and activity", async () => {
    const d = (await getAdminCourseDetail("umd-spring-2027", TODAY))!;
    expect(d.course.name).toBe("UMD Spring Retreat");
    expect(d.organizer.email).toBe("mchen@umd.edu");
    expect(d.status.next).toEqual({ kind: "funding" });
    expect(d.estimatedFee).toBe(900);
  });

  it("has a detail page for every dashboard course, and none for drafts", async () => {
    for (const id of listAdminCourseIds()) expect(await getAdminCourseDetail(id, TODAY)).toBeDefined();
    expect(await getAdminCourseDetail("draft-new", TODAY)).toBeUndefined();
  });

  it("groups reminder recipients by what they need", () => {
    const g = getReminderGroups(TODAY);
    expect(g.request_invoice.map((r) => r.organizer)).toEqual(["Priya Shah"]);
    expect(g.submit_accounting.map((r) => r.email)).toEqual(["mchen@umd.edu"]);
    expect(g.payment_overdue.map((r) => r.course)).toEqual(["Rutgers Fall Retreat"]);
    expect(getRecipientsFor(["rutgers-fall-2026", "nope"], TODAY).map((r) => r.courseId)).toEqual(["rutgers-fall-2026"]);
  });

  it("fills merge fields from the course", () => {
    expect(mergeValuesFor("umd-fall-2026", { name: "IAHV Admin" }, "https://app.test")).toMatchObject({
      organizer_first_name: "Maya",
      invoice_number: "INV-24817",
      invoice_amount: "$1,400.00",
      due_date: "Dec 8",
      course_link: "https://app.test/organizer/courses/umd-fall-2026/invoice",
    });
  });
});
