// B-1.1: database rows -> what the admin pages show. No Supabase needed: the mapper is pure.
import { describe, expect, it, vi } from "vitest";

// admin-db.ts imports the Supabase server client (cookies); the mapper doesn't use it.
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/require-role", () => ({ requireRole: async () => ({}) }));

const { describeEvent, toAdminCourse } = await import("@/lib/data/admin-db");
type Row = Parameters<typeof toAdminCourse>[0];

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: "c1",
    organizer_id: "u1",
    name: "E2E UMD Retreat",
    course_type: "happiness",
    format: "in_person",
    start_date: "2027-03-05",
    end_date: "2027-03-07",
    teachers: null,
    est_participants: 14,
    funding_sources: ["university"],
    journey_course_id: null,
    agreement_status: null,
    country: "US",
    campuses: { name: "University of Maryland, College Park" },
    clients: null,
    course_steps: [
      { step_no: 1, status: "in_progress" },
      { step_no: 3, status: "todo" },
    ],
    funding_requests: null,
    invoices: [],
    organizer: { name: "Alex Rivera", email: "alex@example.test" },
    quotes: [],
    invoice_rows: [],
    ...over,
  }) as unknown as Row;

describe("toAdminCourse", () => {
  it("maps the course, campus and organizer", () => {
    const c = toAdminCourse(row());
    expect(c.course).toMatchObject({ id: "c1", name: "E2E UMD Retreat", university: "University of Maryland, College Park" });
    expect(c.course.steps).toEqual(["in_progress", "todo", "todo", "todo", "todo", "todo", "todo", "todo"]);
    expect(c.organizer).toEqual({
      id: "u1",
      name: "Alex Rivera",
      email: "alex@example.test",
      initials: "AR",
      campus: "University of Maryland, College Park",
    });
    expect(c.country).toBe("US");
    expect(c.facts).toEqual({ funding: null, quote: null, invoice: null });
  });

  it("keeps drafts (no type, no dates) and Canadian courses", () => {
    const c = toAdminCourse(row({ course_type: null, start_date: null, end_date: null, country: "CA", campuses: null }));
    expect(c.course.type).toBeNull();
    expect(c.course.university).toBeNull();
    expect(c.country).toBe("CA");
  });

  it("falls back to the email when the organizer has no name", () => {
    expect(toAdminCourse(row({ organizer: { name: "", email: "sam@example.test" } })).organizer).toMatchObject({ name: "sam@example.test", initials: "S" });
  });

  it("uses the funding request and the latest quote and invoice", () => {
    const c = toAdminCourse(
      row({
        funding_requests: { status: "submitted", needed_by: "2026-12-01", funding_request_documents: [], student_fee: 0, total_funding: 900 },
        quotes: [
          { status: "revised", quote_number: "Q-1", amount: 900, requested_at: "2026-10-01T10:00:00Z" },
          { status: "requested", quote_number: null, amount: 1000, requested_at: "2026-11-01T10:00:00Z" },
        ],
        invoice_rows: [
          { status: "sent_to_client", invoice_number: "INV-1", amount: 1000, requested_at: "2026-11-02T09:00:00Z", due_date: "2026-12-15", accounting_submitted_at: null },
        ],
      }),
    );
    expect(c.facts.funding).toEqual({ status: "submitted", neededBy: "2026-12-01" });
    expect(c.facts.quote).toEqual({ status: "requested", number: null, requestedOn: "2026-11-01", amount: 1000 });
    expect(c.facts.invoice).toEqual({
      status: "sent_to_client",
      number: "INV-1",
      amount: 1000,
      requestedOn: "2026-11-02",
      dueDate: "2026-12-15",
      accountingSubmitted: false,
    });
  });
});

describe("describeEvent", () => {
  it("turns event types into activity text", () => {
    expect(describeEvent("course.created", {})).toBe("Created the course");
    expect(describeEvent("step.updated", { step: 2, status: "done" })).toBe("Updated step 2 (done)");
    expect(describeEvent("invoice.issued", { number: "INV-9" })).toBe("Issued the invoice INV-9");
    expect(describeEvent("funding.needs_info", { note: "Add the letter" })).toBe("Asked for more funding information: Add the letter");
    expect(describeEvent("something.new", {})).toBe("something.new");
  });
});
