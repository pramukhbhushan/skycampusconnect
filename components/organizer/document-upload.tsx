"use client";
// Reusable PDF picker for organizer forms (proof of funds, signed agreement).
// Uploads straight to Supabase Storage, then records the file with a server action.
// Each attached file is also a hidden <input name={name} value={documentId}> so the
// surrounding form submits the ids. Owner: Engineer A (Aryan).

import { useId, useState } from "react";
import { recordDocument, discardUpload, removeDocument } from "@/app/organizer/courses/document-actions";
import { Upload } from "@/components/icons";
import { FileRow } from "@/components/ui";
import { MAX_PDFS, checkPickedFiles, storagePath, type DocumentKind } from "@/lib/organizer/documents";
import { createClient } from "@/lib/supabase/browser";
import type { UploadedDocument } from "@/lib/types";

export function DocumentUpload({
  courseId,
  kind,
  initial,
  name = "documentIds",
  label = "Upload a PDF",
  hint,
}: {
  courseId: string;
  kind: DocumentKind;
  initial: UploadedDocument[];
  name?: string;
  label?: string;
  hint?: string;
}) {
  const inputId = useId();
  const [docs, setDocs] = useState<UploadedDocument[]>(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function upload(files: File[]) {
    const problems = checkPickedFiles(files, docs.length);
    setErrors(problems);
    if (problems.length > 0 || files.length === 0) return;

    setBusy(true);
    const storage = createClient().storage.from("documents");
    const failed: string[] = [];
    for (const file of files) {
      const path = storagePath(courseId, file.name, crypto.randomUUID().replaceAll("-", "").slice(0, 16));
      const { error } = await storage.upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) {
        failed.push(`${file.name}: upload failed (${error.message})`);
        continue;
      }
      try {
        const doc = await recordDocument(courseId, path, file.name, kind);
        setDocs((prev) => [...prev, doc]);
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "couldn't be saved"}`);
        await discardUpload(courseId, path).catch(() => {});
      }
    }
    setErrors(failed);
    setBusy(false);
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await removeDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setErrors([]);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Couldn't remove the file"]);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {docs.map((d) => (
        <div key={d.id}>
          <input type="hidden" name={name} value={d.id} />
          <FileRow
            name={d.name}
            meta={`${d.size} · uploaded ${d.uploadedOn}`}
            action={
              <button
                type="button"
                onClick={() => remove(d.id)}
                disabled={busy}
                className="min-h-10 cursor-pointer rounded-[10px] border border-line bg-white px-3.5 text-sm font-semibold text-ink-soft"
              >
                Remove
              </button>
            }
          />
        </div>
      ))}

      {docs.length < MAX_PDFS && (
        <label
          htmlFor={inputId}
          className="relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-field bg-faint p-[26px] text-center"
        >
          <Upload size={26} className="text-brand" />
          <span className="text-[15px] font-semibold text-brand-dark">
            {busy ? "Uploading…" : docs.length ? "Add another PDF" : label}
          </span>
          {hint && <span className="text-[13px] text-muted">{hint}</span>}
          <input
            id={inputId}
            type="file"
            accept="application/pdf"
            multiple
            disabled={busy}
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = ""; // allow picking the same file again after an error
              void upload(files);
            }}
          />
        </label>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm font-semibold text-danger-text">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
