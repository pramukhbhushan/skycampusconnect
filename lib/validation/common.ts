// Shared validation pieces (plan-v3 "Validation"). Owner: Engineer B (Bhushan).
import { z } from "zod";

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDFS = 5;

/** Today as yyyy-mm-dd in the server's local time zone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** yyyy-mm-dd. ISO strings compare correctly as plain strings. */
export const isoDate = z.iso.date({ error: "Use a date like 2027-03-05" });

/** A date on or after today (due dates, "needed by"). */
export const futureOrTodayDate = isoDate.refine((d) => d >= todayIso(), {
  error: "Pick today or a later date",
});

export const email = z.email({ error: "Enter a valid email address" });

/**
 * A university or client written out in full: "George Washington University", not "GW".
 * Rejects one-word names and names that are only an abbreviation (all capitals).
 */
export const fullInstitutionName = z
  .string()
  .trim()
  .min(1, { error: "Enter the full name" })
  .refine((v) => v.split(/\s+/).length >= 2 && !/^[A-Z&.\s]+$/.test(v), {
    error: "Spell out the full name, e.g. “George Washington University”, not “GW”",
  });

export const participants = z
  .int({ error: "Enter a whole number" })
  .min(1, { error: "At least 1 participant" })
  .max(500, { error: "That seems too high; check the number" });

export const positiveAmount = z.number({ error: "Enter an amount" }).positive({ error: "Must be more than $0" });

export const optionalText = z.string().trim().max(2000).optional();

/** An uploaded PDF, as described by the browser before upload. */
export const pdfFile = z.object({
  name: z.string().regex(/\.pdf$/i, { error: "Only PDF files" }),
  size: z.number().max(MAX_PDF_BYTES, { error: "Each PDF must be 10 MB or smaller" }),
  type: z.literal("application/pdf", { error: "Only PDF files" }),
});

export const pdfFiles = z.array(pdfFile).max(MAX_PDFS, { error: "Up to 5 PDFs" });

export const courseType = z.enum(["happiness", "premium"]);
export const courseFormat = z.enum(["in_person", "online"]);
export const funder = z.enum(["students", "university", "sponsor", "donor"]);
export const agreementStatus = z.enum(["yes", "in_progress", "no"]);
