import { describe, expect, it } from "vitest";
import {
  courseSchema,
  fullInstitutionName,
  fundingRequestSchema,
  invoiceRequestSchema,
  quoteRequestSchema,
  reminderEmailSchema,
  todayIso,
} from "@/lib/validation";

const FUTURE = "2099-01-15";
const PAST = "2000-01-15";
const pdf = (over: Partial<{ name: string; size: number; type: string }> = {}) => ({
  name: "UMD_funding_approval_letter.pdf",
  size: 1_200_000,
  type: "application/pdf",
  ...over,
});
/** Field paths that failed, e.g. ["endDate"]. */
const errors = (r: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => i.path.join("."));

const validCourse = {
  name: "UMD Spring Retreat",
  type: "happiness",
  format: "in_person",
  startDate: "2027-03-05",
  endDate: "2027-03-07",
  university: "University of Maryland, College Park",
  estParticipants: 14,
  funders: ["university"],
};

const client = {
  fullName: "University of Maryland, College Park",
  attn: "Office of Student Affairs",
  address: "7999 Regents Dr, College Park, MD 20742",
  email: "ap@umd.edu",
};

describe("fullInstitutionName", () => {
  it.each(["University of Maryland, College Park", "George Washington University", "Purdue University"])(
    "accepts %s",
    (name) => expect(fullInstitutionName.safeParse(name).success).toBe(true),
  );

  it.each(["GW", "UMD", "UCLA", "Purdue", "U OF M", ""])("rejects %j", (name) =>
    expect(fullInstitutionName.safeParse(name).success).toBe(false),
  );
});

describe("todayIso", () => {
  it("formats a local date as yyyy-mm-dd", () => {
    expect(todayIso(new Date(2027, 2, 5))).toBe("2027-03-05");
  });
});

describe("courseSchema (step 1)", () => {
  it("accepts a complete course", () => {
    expect(courseSchema.safeParse(validCourse).success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    expect(errors(courseSchema.safeParse({ ...validCourse, endDate: "2027-03-04" }))).toEqual(["endDate"]);
  });

  it("allows a one-day course", () => {
    expect(courseSchema.safeParse({ ...validCourse, endDate: "2027-03-05" }).success).toBe(true);
  });

  it("rejects an abbreviated university, no payer, and a non-whole participant count", () => {
    const r = courseSchema.safeParse({ ...validCourse, university: "UMD", funders: [], estParticipants: 12.5 });
    expect(errors(r).sort()).toEqual(["estParticipants", "funders", "university"]);
  });

  it("rejects dates in the wrong format", () => {
    expect(errors(courseSchema.safeParse({ ...validCourse, startDate: "03/05/2027" }))).toContain("startDate");
  });
});

describe("fundingRequestSchema (step 3)", () => {
  const valid = {
    totalFunding: 900,
    estParticipants: 14,
    neededBy: FUTURE,
    studentsPayPart: false,
    agreement: "yes",
    proofOfFunds: [pdf()],
  };

  it("accepts a complete request", () => {
    expect(fundingRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("needs at least one proof-of-funds PDF, at most 5", () => {
    expect(errors(fundingRequestSchema.safeParse({ ...valid, proofOfFunds: [] }))).toEqual(["proofOfFunds"]);
    expect(errors(fundingRequestSchema.safeParse({ ...valid, proofOfFunds: Array(6).fill(pdf()) }))).toEqual([
      "proofOfFunds",
    ]);
  });

  it("rejects files over 10 MB or that aren't PDFs", () => {
    expect(errors(fundingRequestSchema.safeParse({ ...valid, proofOfFunds: [pdf({ size: 10 * 1024 * 1024 + 1 })] })))
      .toEqual(["proofOfFunds.0.size"]);
    const notPdf = fundingRequestSchema.safeParse({ ...valid, proofOfFunds: [pdf({ name: "letter.docx", type: "application/msword" })] });
    expect(errors(notPdf).sort()).toEqual(["proofOfFunds.0.name", "proofOfFunds.0.type"]);
  });

  it("rejects a needed-by date in the past, but accepts today", () => {
    expect(errors(fundingRequestSchema.safeParse({ ...valid, neededBy: PAST }))).toEqual(["neededBy"]);
    expect(fundingRequestSchema.safeParse({ ...valid, neededBy: todayIso() }).success).toBe(true);
  });

  it("rejects $0 funding", () => {
    expect(errors(fundingRequestSchema.safeParse({ ...valid, totalFunding: 0 }))).toEqual(["totalFunding"]);
  });

  it("needs a student fee when students pay part", () => {
    expect(errors(fundingRequestSchema.safeParse({ ...valid, studentsPayPart: true }))).toEqual(["studentFee"]);
    expect(fundingRequestSchema.safeParse({ ...valid, studentsPayPart: true, studentFee: 50 }).success).toBe(true);
  });
});

describe("quoteRequestSchema (step 4)", () => {
  it("accepts a complete quote request", () => {
    expect(quoteRequestSchema.safeParse({ client, participants: 14, payByCard: false }).success).toBe(true);
  });

  it("checks the client's full name and email", () => {
    const r = quoteRequestSchema.safeParse({ client: { ...client, fullName: "UMD", email: "ap-at-umd" }, participants: 14, payByCard: false });
    expect(errors(r).sort()).toEqual(["client.email", "client.fullName"]);
  });
});

describe("invoiceRequestSchema (step 4)", () => {
  const valid = {
    client,
    participants: 14,
    payByCard: false,
    apTerm: "4w",
    dueDate: FUTURE,
    amount: 900,
    agreementDocumentIds: ["doc-1"],
  };

  it("accepts a complete invoice request", () => {
    expect(invoiceRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("needs the signed agreement", () => {
    expect(errors(invoiceRequestSchema.safeParse({ ...valid, agreementDocumentIds: [] }))).toEqual(["agreementDocumentIds"]);
  });

  it("rejects a past due date, a $0 amount and an unknown payment term", () => {
    const r = invoiceRequestSchema.safeParse({ ...valid, dueDate: PAST, amount: 0, apTerm: "8w" });
    expect(errors(r).sort()).toEqual(["amount", "apTerm", "dueDate"]);
  });
});

describe("reminderEmailSchema (admin)", () => {
  const valid = { courseIds: ["ut-austin-fall-2026"], templateKey: "request_invoice", subject: "Action needed", body: "Hi Priya," };

  it("accepts a reminder to at least one course", () => {
    expect(reminderEmailSchema.safeParse(valid).success).toBe(true);
  });

  it("needs a course, a subject and a message", () => {
    const r = reminderEmailSchema.safeParse({ ...valid, courseIds: [], subject: "  ", body: "" });
    expect(errors(r).sort()).toEqual(["body", "courseIds", "subject"]);
  });
});
