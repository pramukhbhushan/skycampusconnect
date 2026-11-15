import { beforeEach, describe, expect, it, vi } from "vitest";
import { readInvoiceForm, suggestedDue } from "@/lib/organizer/invoice";

const { requireRole, logEvent, rpc, getLivePricing } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  logEvent: vi.fn(),
  rpc: vi.fn(),
  getLivePricing: vi.fn(),
}));
const writes: { table: string; op: string; payload: unknown }[] = [];
let ownClient: { id: string } | null = null;
let courseRow: { course_type: string | null } | null = { course_type: "happiness" };

function query(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "ilike", "limit"]) q[m] = () => q;
  q.maybeSingle = async () => ({ data: table === "courses" ? courseRow : ownClient, error: null });
  q.insert = (payload: unknown) => (writes.push({ table, op: "insert", payload }), q);
  q.update = (payload: unknown) => (writes.push({ table, op: "update", payload }), q);
  q.single = async () => ({ data: { id: "client-new" }, error: null });
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok);
  return q;
}

vi.mock("@/lib/supabase/require-role", () => ({ requireRole }));
vi.mock("@/lib/data/events", () => ({ logEvent }));
vi.mock("@/lib/data/organizer-db", () => ({ getLivePricing }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: query, rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { requestInvoice, saveInvoiceForm } from "@/app/organizer/courses/invoice-actions";
import { DEFAULT_PRICING } from "@/lib/pricing";

const valid = {
  client: { fullName: "University of Maryland, College Park", attn: "Accounts Payable", address: "1 Campus Dr", email: "ap@example.test" },
  participants: 14,
  payByCard: false,
  apTerm: "4w",
  dueDate: "2099-01-01",
  amount: 900,
  agreementDocumentIds: ["doc-1"],
};

beforeEach(() => {
  vi.clearAllMocks();
  writes.length = 0;
  ownClient = null;
  courseRow = { course_type: "happiness" };
  requireRole.mockResolvedValue({ id: "u1", email: "m@x.edu", name: "Maya", role: "organizer" });
  getLivePricing.mockResolvedValue(DEFAULT_PRICING);
  rpc.mockResolvedValue({ data: "inv-1", error: null });
});

describe("suggestedDue", () => {
  it("counts from the course end, but never before today", () => {
    expect(suggestedDue("2027-03-07", "4w", "2026-11-15")).toBe("2027-04-04");
    expect(suggestedDue("2027-03-07", "q", "2026-11-15")).toBe("2027-06-30");
    expect(suggestedDue("2026-01-01", "2w", "2026-11-15")).toBe("2026-11-29");
  });
});

describe("readInvoiceForm", () => {
  it("builds the schema shape and de-duplicates attached files", () => {
    const fd = new FormData();
    fd.set("clientName", " UMD ");
    fd.set("participants", "12");
    fd.set("payByCard", "on");
    fd.set("amount", "1236");
    fd.append("agreementDocumentIds", "a");
    fd.append("agreementDocumentIds", "a");
    fd.append("agreementDocumentIds", "b");
    expect(readInvoiceForm(fd)).toMatchObject({
      client: { fullName: "UMD" },
      participants: 12,
      payByCard: true,
      amount: 1236,
      agreementDocumentIds: ["a", "b"],
    });
  });
});

describe("requestInvoice", () => {
  it("creates the organizer's own client and sends the request", async () => {
    await expect(requestInvoice("c1", valid)).resolves.toBe("inv-1");
    expect(writes[0]).toMatchObject({ table: "clients", op: "insert", payload: { created_by: "u1", attn: "Accounts Payable" } });
    expect(rpc).toHaveBeenCalledWith(
      "request_invoice",
      expect.objectContaining({ p_course_id: "c1", p_client_id: "client-new", p_participants: 14, p_document_ids: ["doc-1"] }),
    );
    expect(logEvent).toHaveBeenCalledWith("c1", "invoice.requested", { invoiceId: "inv-1", amount: 900, participants: 14 });
  });

  it("reuses and refreshes a client the organizer created before", async () => {
    ownClient = { id: "client-old" };
    await requestInvoice("c1", valid);
    expect(writes[0]).toMatchObject({ table: "clients", op: "update" });
    expect(rpc).toHaveBeenCalledWith("request_invoice", expect.objectContaining({ p_client_id: "client-old" }));
  });

  it("refuses a stale amount, another person's course, and a draft course", async () => {
    await expect(requestInvoice("c1", { ...valid, amount: 800 })).rejects.toThrow(/Pricing changed/);
    courseRow = null;
    await expect(requestInvoice("c1", valid)).rejects.toThrow("Course not found");
    courseRow = { course_type: null };
    await expect(requestInvoice("c1", valid)).rejects.toThrow(/step 1/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("passes database refusals through", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "An invoice was already requested for this course" } });
    await expect(requestInvoice("c1", valid)).rejects.toThrow("already requested");
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe("saveInvoiceForm", () => {
  it("doesn't submit quotes yet, and reports field errors by path", async () => {
    const quote = new FormData();
    quote.set("mode", "quote");
    expect((await saveInvoiceForm({}, quote)).errors?.form).toMatch(/Quote requests/);

    const fd = new FormData();
    fd.set("mode", "invoice");
    fd.set("courseId", "c1");
    const r = await saveInvoiceForm({}, fd);
    expect(r.errors?.["client.email"]).toBeTruthy();
    expect(r.errors?.agreementDocumentIds).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});

import { journeyAccountingText } from "@/lib/organizer/invoice";
import { submitAccounting, submitAccountingForm } from "@/app/organizer/courses/invoice-actions";

describe("journeyAccountingText", () => {
  it("names who it's billed to and the due date, or who paid and when", () => {
    const inv = { number: "INV-24817", amount: 1400, clientName: "University of Maryland, College Park", dueDate: "2026-12-08", paidAt: null };
    expect(journeyAccountingText(inv)).toBe("Invoice # INV-24817 for $1,400.00 billed to University of Maryland, College Park, due 12/08/2026.");
    expect(journeyAccountingText({ ...inv, paidAt: "2026-12-01T15:00:00Z" })).toBe(
      "Invoice # INV-24817 for $1,400.00 paid by University of Maryland, College Park on 12/01/2026.",
    );
    expect(journeyAccountingText({ number: "INV-1", amount: null, clientName: null, dueDate: null, paidAt: null })).toBe("Invoice # INV-1.");
  });
});

describe("submitAccounting", () => {
  it("submits through the database and logs it", async () => {
    rpc.mockResolvedValue({ data: "inv-1", error: null });
    await submitAccounting("c1");
    expect(rpc).toHaveBeenCalledWith("submit_accounting", { p_course_id: "c1" });
    expect(logEvent).toHaveBeenCalledWith("c1", "accounting.submitted", { invoiceId: "inv-1" });
  });

  it("shows the database's reason when it can't submit yet", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Record attendance (step 6) first" } });
    const fd = new FormData();
    fd.set("courseId", "c1");
    expect(await submitAccountingForm({}, fd)).toEqual({ error: "Record attendance (step 6) first" });
    expect(logEvent).not.toHaveBeenCalled();
  });
});
