// PDF uploads (Storage bucket "documents", path "<course_id>/<id>-<file name>").
// Pure helpers shared by the upload component and the server actions. Owner: Engineer A (Aryan).

import { MAX_PDF_BYTES, MAX_PDFS, pdfFile } from "@/lib/validation";

export type DocumentKind = "proof_of_funds" | "agreement" | "other";

/** Keeps letters, digits, dot, dash and underscore; always ends in .pdf. */
export function safeFileName(name: string): string {
  const base = name.replace(/\.pdf$/i, "").normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^[_.]+|[_.]+$/g, "");
  return `${(base || "document").slice(0, 80)}.pdf`;
}

/** Where a new file goes: inside its course's folder, with a unique prefix. */
export function storagePath(courseId: string, fileName: string, uniqueId: string): string {
  return `${courseId}/${uniqueId}-${safeFileName(fileName)}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** True when `path` is a file we would have created for this course (no sub-folders, no tricks). */
export function isCoursePath(courseId: string, path: string): boolean {
  return new RegExp(`^${UUID}/[0-9a-zA-Z-]{8,64}-[\\w.-]+\\.pdf$`, "i").test(path) && path.startsWith(`${courseId}/`);
}

/** Checks files picked in the browser before uploading. Returns one message per problem. */
export function checkPickedFiles(files: { name: string; size: number; type: string }[], alreadyAttached: number): string[] {
  const errors: string[] = [];
  if (alreadyAttached + files.length > MAX_PDFS) errors.push(`Up to ${MAX_PDFS} PDFs. Remove one first.`);
  for (const f of files) {
    const r = pdfFile.safeParse(f);
    if (!r.success) errors.push(`${f.name}: ${r.error.issues[0]?.message ?? "not a valid PDF"}`);
  }
  return errors;
}

export { MAX_PDF_BYTES, MAX_PDFS };
