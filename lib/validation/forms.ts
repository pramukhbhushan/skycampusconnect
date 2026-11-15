// Zod schemas for every form in plan-v3 (sprint-planning.md B-0.3). Owner: Engineer B (Bhushan).
// Use the same schema in the browser (instant errors) and in server actions (the real check).
import { z } from "zod";
import {
  agreementStatus,
  courseFormat,
  courseType,
  email,
  fullInstitutionName,
  funder,
  futureOrTodayDate,
  isoDate,
  optionalText,
  participants,
  pdfFiles,
  positiveAmount,
} from "./common";

/** Step 1 · Course details. */
export const courseSchema = z
  .object({
    name: z.string().trim().min(1, { error: "Give the course a name" }).max(120),
    type: courseType,
    format: courseFormat,
    startDate: isoDate,
    endDate: isoDate,
    university: fullInstitutionName,
    teachers: optionalText,
    estParticipants: participants,
    funders: z.array(funder).min(1, { error: "Choose who is paying" }),
  })
  .refine((c) => c.endDate >= c.startDate, { error: "End date can't be before the start date", path: ["endDate"] });

/** Step 3 · Funding approval request. */
export const fundingRequestSchema = z
  .object({
    totalFunding: positiveAmount,
    estParticipants: participants,
    neededBy: futureOrTodayDate,
    studentsPayPart: z.boolean(),
    /** Student fee on Journey when students pay part; $0 otherwise. */
    studentFee: z.number().min(0).optional(),
    priorFundingNote: optionalText,
    agreement: agreementStatus,
    proofOfFunds: pdfFiles.min(1, { error: "Upload at least one proof-of-funds PDF" }),
  })
  .refine((f) => !f.studentsPayPart || (f.studentFee ?? 0) > 0, {
    error: "Enter the student fee",
    path: ["studentFee"],
  });

/** Who a quote or invoice goes to. */
export const clientSchema = z.object({
  fullName: fullInstitutionName,
  attn: z.string().trim().min(1, { error: "Who at the university is paying?" }),
  address: z.string().trim().min(1, { error: "Enter the billing address" }),
  email,
});

/** Step 4 · Quote request. */
export const quoteRequestSchema = z.object({
  client: clientSchema,
  participants,
  payByCard: z.boolean(),
  notes: optionalText,
});

/** Step 4 · Invoice request. The amount is recomputed on the server; this is a sanity check. */
export const invoiceRequestSchema = z.object({
  client: clientSchema,
  participants,
  payByCard: z.boolean(),
  apTerm: z.enum(["2w", "4w", "6w", "q"]),
  dueDate: futureOrTodayDate,
  amount: positiveAmount,
  quoteNumber: z.string().trim().optional(),
  poNumber: z.string().trim().max(60).optional(),
  /** Agreement PDF: an id of one already uploaded (reused from step 3) or a new one. */
  agreementDocumentIds: z.array(z.string().min(1)).min(1, { error: "Attach the signed agreement" }),
  notes: optionalText,
});

/** Admin reminder email (plan-v3 "Reminder emails"): one email per course, to its organizer. */
export const reminderEmailSchema = z.object({
  courseIds: z.array(z.string().min(1)).min(1, { error: "Pick at least one course" }),
  templateKey: z.string().min(1),
  subject: z.string().trim().min(1, { error: "Add a subject" }).max(200),
  body: z.string().trim().min(1, { error: "Write a message" }).max(10_000),
});

export type CourseInput = z.infer<typeof courseSchema>;
export type FundingRequestInput = z.infer<typeof fundingRequestSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type InvoiceRequestInput = z.infer<typeof invoiceRequestSchema>;
export type ReminderEmailInput = z.infer<typeof reminderEmailSchema>;
