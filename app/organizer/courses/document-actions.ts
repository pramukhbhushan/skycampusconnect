"use server";
// Recording and removing uploaded PDFs. Owner: Engineer A (Aryan).
// The browser uploads the file straight to Storage (server actions are limited to 1 MB);
// these actions then check it against Storage itself and record it in `documents`.

import { formatFileSize, formatMonthDay } from "@/lib/data/course-mapper";
import { MAX_PDF_BYTES, MAX_PDFS, isCoursePath, type DocumentKind } from "@/lib/organizer/documents";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/require-role";
import type { UploadedDocument } from "@/lib/types";

const KINDS: DocumentKind[] = ["proof_of_funds", "agreement", "other"];

/** Records a PDF that was just uploaded to `path` for one of the caller's courses. */
export async function recordDocument(courseId: string, path: string, fileName: string, kind: DocumentKind): Promise<UploadedDocument> {
  const me = await requireRole("organizer");
  if (!KINDS.includes(kind)) throw new Error("Unknown document type");
  if (!isCoursePath(courseId, path)) throw new Error("That file isn't in this course's folder");
  const db = await createClient();

  const { data: course } = await db.from("courses").select("id").eq("id", courseId).eq("organizer_id", me.id).maybeSingle();
  if (!course) throw new Error("Course not found");

  // Trust Storage, not the browser, for what was uploaded.
  const { data: info, error: infoError } = await db.storage.from("documents").info(path);
  if (infoError || !info) throw new Error("The upload didn't arrive. Please try again.");
  const size = info.size ?? 0;
  if (info.contentType && info.contentType !== "application/pdf") throw new Error("Only PDF files");
  if (size <= 0 || size > MAX_PDF_BYTES) throw new Error("Each PDF must be 10 MB or smaller");

  const { count } = await db.from("documents").select("id", { count: "exact", head: true }).eq("course_id", courseId).eq("kind", kind);
  if ((count ?? 0) >= MAX_PDFS) throw new Error(`Up to ${MAX_PDFS} PDFs`);

  const name = fileName.trim().slice(0, 200) || "document.pdf";
  const { data, error } = await db
    .from("documents")
    .insert({ course_id: courseId, kind, storage_path: path, file_name: name, size_bytes: size, uploaded_by: me.id })
    .select("id, file_name, size_bytes, created_at")
    .single();
  if (error) throw new Error(`Could not save the file: ${error.message}`);
  return { id: data.id, name: data.file_name, size: formatFileSize(data.size_bytes), uploadedOn: formatMonthDay(data.created_at) };
}

/** Removes one of the caller's PDFs, unless it's attached to a funding request or invoice. */
export async function removeDocument(documentId: string): Promise<void> {
  const me = await requireRole("organizer");
  const db = await createClient();

  const { data: doc } = await db
    .from("documents")
    .select("id, storage_path, courses!inner(organizer_id)")
    .eq("id", documentId)
    .eq("courses.organizer_id", me.id)
    .maybeSingle();
  if (!doc) throw new Error("File not found");

  const [funding, invoice] = await Promise.all([
    db.from("funding_request_documents").select("document_id", { count: "exact", head: true }).eq("document_id", documentId),
    db.from("invoice_documents").select("document_id", { count: "exact", head: true }).eq("document_id", documentId),
  ]);
  if ((funding.count ?? 0) > 0 || (invoice.count ?? 0) > 0) {
    throw new Error("This file is attached to a request you've sent to IAHV, so it can't be removed.");
  }

  const { error } = await db.from("documents").delete().eq("id", documentId);
  if (error) throw new Error(`Could not remove the file: ${error.message}`);
  // The row is gone either way; a leftover object only costs storage.
  await db.storage.from("documents").remove([doc.storage_path]);
}

/** Cleans up an upload that couldn't be recorded. Only for paths in the caller's own course. */
export async function discardUpload(courseId: string, path: string): Promise<void> {
  const me = await requireRole("organizer");
  if (!isCoursePath(courseId, path)) return;
  const db = await createClient();
  const { data: course } = await db.from("courses").select("id").eq("id", courseId).eq("organizer_id", me.id).maybeSingle();
  if (!course) return;
  const { data: recorded } = await db.from("documents").select("id").eq("storage_path", path).maybeSingle();
  if (!recorded) await db.storage.from("documents").remove([path]);
}
