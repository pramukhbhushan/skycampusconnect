import { describe, expect, it } from "vitest";
import { deriveAdminStatus, type CourseFacts } from "@/lib/admin/derive";
import { businessDaysBetween, dueLabel, endedLabel, startedLabel, todayIso, waitingLabel } from "@/lib/admin/time";
import { fundingTransition, invoiceActionsFor, invoiceTransition, quoteActionsFor, quoteTransition } from "@/lib/admin/transitions";

const TODAY = "2026-11-15"; // a Sunday

describe("business days and labels (B-3.2)", () => {
  it("counts weekdays after the start date", () => {
    expect(businessDaysBetween("2026-11-09", "2026-11-11")).toBe(2); // Mon -> Wed
    expect(businessDaysBetween("2026-11-10", TODAY)).toBe(3); // Tue -> Sun: Wed, Thu, Fri
    expect(businessDaysBetween("2026-11-06", TODAY)).toBe(5); // Fri -> Sun: Mon-Fri
    expect(businessDaysBetween(TODAY, TODAY)).toBe(0);
  });

  it("marks requests late after 4 business days and flags them after 10", () => {
    expect(waitingLabel("2026-11-10", TODAY)).toEqual({ label: "Waiting 3 business days", late: false, flagged: false });
    expect(waitingLabel("2026-11-06", TODAY)).toMatchObject({ late: true, flagged: false });
    expect(waitingLabel("2026-10-28", TODAY)).toMatchObject({ label: "Waiting 12 business days", flagged: true });
    expect(waitingLabel(TODAY, TODAY).label).toBe("Requested today");
  });

  it("labels due dates before and after they pass", () => {
    expect(dueLabel("2026-11-30", TODAY)).toEqual({ label: "Due Nov 30", late: false });
    expect(dueLabel("2026-11-01", TODAY)).toEqual({ label: "Due Nov 1 · 14 days late", late: true });
    expect(dueLabel("2026-11-14", TODAY).label).toBe("Due Nov 14 · 1 day late");
  });

  it("describes course start and end", () => {
    expect(startedLabel("2026-11-14", TODAY)).toBe("Course started yesterday");
    expect(endedLabel("2026-11-08", TODAY)).toBe("Course ended 7 days ago");
  });

  it("lets APP_TODAY pin the date for demos", () => {
    process.env.APP_TODAY = "2027-01-02";
    expect(todayIso()).toBe("2027-01-02");
    delete process.env.APP_TODAY;
    expect(todayIso(new Date(2026, 10, 15))).toBe("2026-11-15");
  });
});

describe("admin transitions (B-3.1, B-5.1, B-6.1)", () => {
  it("follows the invoice lifecycle", () => {
    expect(invoiceTransition("issue", "requested")).toEqual({ ok: true, to: "issued" });
    expect(invoiceTransition("mark_sent", "issued")).toEqual({ ok: true, to: "sent_to_client" });
    expect(invoiceTransition("mark_paid", "accounting_submitted")).toEqual({ ok: true, to: "paid" });
    expect(invoiceTransition("close", "paid")).toEqual({ ok: true, to: "closed" });
  });

  it("refuses out-of-order invoice changes with a readable reason", () => {
    expect(invoiceTransition("close", "issued")).toEqual({ ok: false, error: "This invoice is issued, so it can't be changed that way." });
    expect(invoiceTransition("issue", "paid").ok).toBe(false);
    expect(invoiceTransition("mark_paid", "closed").ok).toBe(false);
  });

  it("offers only the actions that make sense next", () => {
    expect(invoiceActionsFor("requested")).toEqual(["issue"]);
    expect(invoiceActionsFor("issued")).toEqual(["mark_sent", "mark_paid"]);
    expect(invoiceActionsFor("closed")).toEqual([]);
    expect(quoteActionsFor("issued")).toEqual(["accept", "revise", "expire"]);
  });

  it("handles funding and quote decisions", () => {
    expect(fundingTransition("approve", "submitted")).toEqual({ ok: true, to: "approved" });
    expect(fundingTransition("needs_info", "approved").ok).toBe(false);
    expect(quoteTransition("issue", "revised")).toEqual({ ok: true, to: "issued" });
  });
});

describe("deriveAdminStatus (B-1.1 rules)", () => {
  const blank: CourseFacts = { id: "c", hasType: true, startDate: "2027-03-05", endDate: "2027-03-07", funding: null, quote: null, invoice: null };
  const invoice = (over: Partial<NonNullable<CourseFacts["invoice"]>>) => ({
    status: "issued" as const, number: "INV-1", amount: 900, requestedOn: "2026-10-01", dueDate: "2026-12-01", accountingSubmitted: false, ...over,
  });

  it("puts a submitted funding request in the funding queue", () => {
    const s = deriveAdminStatus({ ...blank, funding: { status: "submitted", neededBy: "2026-11-26" } }, TODAY);
    expect(s).toMatchObject({ queue: "funding", statusLabel: "Funding approval", dueLabel: "Needed by Nov 26", late: false, next: { kind: "funding" } });
  });

  it("puts waiting quotes and invoices in their queues with the SLA age", () => {
    expect(deriveAdminStatus({ ...blank, quote: { status: "requested", number: null, requestedOn: "2026-11-06", amount: 1300 } }, TODAY))
      .toMatchObject({ queue: "quote", dueLabel: "Waiting 5 business days", late: true });
    expect(deriveAdminStatus({ ...blank, invoice: invoice({ status: "requested", number: null, requestedOn: "2026-11-10" }) }, TODAY))
      .toMatchObject({ queue: "invoice", dueLabel: "Waiting 3 business days", late: false, actionLabel: "Enter invoice #" });
  });

  it("flags overdue payments before anything else on an issued invoice", () => {
    const s = deriveAdminStatus({ ...blank, endDate: "2026-09-27", invoice: invoice({ dueDate: "2026-11-01", accountingSubmitted: true }) }, TODAY);
    expect(s).toMatchObject({ queue: "follow", statusLabel: "Payment overdue", next: { kind: "remind", template: "payment_overdue" } });
  });

  it("chases course accounting after the course ends", () => {
    const s = deriveAdminStatus({ ...blank, startDate: "2026-11-06", endDate: "2026-11-08", invoice: invoice({ dueDate: "2026-12-08" }) }, TODAY);
    expect(s).toMatchObject({ queue: "follow", statusLabel: "Accounting not submitted", dueLabel: "Course ended 7 days ago" });
  });

  it("chases a missing invoice once the course has started", () => {
    const s = deriveAdminStatus({ ...blank, startDate: "2026-11-13", endDate: "2026-11-15" }, TODAY);
    expect(s).toMatchObject({ queue: "follow", statusLabel: "Invoice not requested", next: { kind: "remind", template: "request_invoice" } });
  });

  it("moves an issued invoice to pending payment, then paid, then closed", () => {
    expect(deriveAdminStatus({ ...blank, invoice: invoice({ accountingSubmitted: true }) }, TODAY)).toMatchObject({ queue: "payment", dueLabel: "Due Dec 1" });
    expect(deriveAdminStatus({ ...blank, invoice: invoice({ status: "paid" }) }, TODAY)).toMatchObject({ queue: "none", statusLabel: "Paid", actionLabel: "Close course" });
    expect(deriveAdminStatus({ ...blank, invoice: invoice({ status: "closed" }) }, TODAY)).toMatchObject({ statusLabel: "Closed", next: { kind: "none" } });
  });

  it("leaves future courses with nothing pending on track", () => {
    expect(deriveAdminStatus(blank, TODAY)).toMatchObject({ queue: "none", statusLabel: "On track", tone: "ok" });
  });
});
