import { afterEach, describe, expect, it, vi } from "vitest";
import { csvCell, toCsv } from "@/lib/admin/csv";
import { emailMode, sendEmail } from "@/lib/email/client";
import { DEFAULT_TEMPLATES, MERGE_FIELDS, renderTemplate, unknownFields } from "@/lib/email/templates";

describe("email templates (B-4.2)", () => {
  it("fills every field it knows", () => {
    const { text, missing } = renderTemplate("Hi {{organizer_first_name}}, {{ course_name }} is due {{due_date}}.", {
      organizer_first_name: "Maya",
      course_name: "Fall Premium Retreat",
      due_date: "Dec 8",
    });
    expect(text).toBe("Hi Maya, Fall Premium Retreat is due Dec 8.");
    expect(missing).toEqual([]);
  });

  it("marks and reports fields with no value instead of leaving a blank", () => {
    const { text, missing } = renderTemplate("Invoice # {{invoice_number}}", {});
    expect(text).toBe("Invoice # [Invoice number]");
    expect(missing).toEqual(["invoice_number"]);
  });

  it("catches misspelled fields", () => {
    expect(unknownFields("Hi {{organizer_first_name}} about {{course_nmae}} and {{course_nmae}}")).toEqual(["course_nmae"]);
    expect(unknownFields("No fields here")).toEqual([]);
  });

  it("ships a template for every reminder type, using only known fields", () => {
    expect(DEFAULT_TEMPLATES.map((t) => t.key)).toEqual(["request_invoice", "submit_accounting", "payment_overdue", "payment_coming_up", "funding_needs_info"]);
    for (const t of DEFAULT_TEMPLATES) expect(unknownFields(`${t.subject}\n${t.body}`)).toEqual([]);
    expect(Object.keys(MERGE_FIELDS)).toContain("admin_name");
  });
});

describe("sending email (B-4.1)", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    vi.restoreAllMocks();
  });

  it("logs instead of sending when there's no Resend key", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    expect(emailMode()).toBe("dev");
    const result = await sendEmail({
      from: { name: "IAHV Admin", email: "admin@iahv.org" },
      to: { name: "Maya Chen", email: "mchen@umd.edu" },
      subject: "Please close out Fall Premium Retreat",
      text: "Hi Maya",
    });
    expect(result.mode).toBe("dev");
    expect(log.mock.calls[0][0]).toContain("From: IAHV Admin <admin@iahv.org> To: Maya Chen <mchen@umd.edu>");
  });

  it("uses Resend when a key is set", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(emailMode()).toBe("resend");
  });
});

describe("CSV export (B-7.1)", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("University of Maryland, College Park")).toBe('"University of Maryland, College Park"');
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell(null)).toBe("");
  });

  it("stops spreadsheets running cell text as a formula", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
  });

  it("builds rows with Windows line endings", () => {
    expect(toCsv(["A", "B"], [["1", "x,y"]])).toBe('A,B\r\n1,"x,y"\r\n');
  });
});
