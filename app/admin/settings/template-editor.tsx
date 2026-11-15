"use client";

import { useActionState, useState } from "react";
import { MERGE_FIELDS, unknownFields, type EmailTemplate } from "@/lib/email/templates";
import { templateAction } from "../actions";
import { FormResult } from "./form-result";

const fieldCls = "rounded-xl border border-field bg-white px-3.5 text-[15px] text-ink";

// B-4.4: edit a reminder's starting text. Unknown {{fields}} are caught before saving.
export function TemplateEditor({ template }: { template: EmailTemplate }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [state, action, pending] = useActionState(templateAction, null);
  const unknown = unknownFields(`${subject}\n${body}`);

  return (
    <div className="rounded-[14px] border border-line">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold">{template.name}</span>
          <span className="truncate text-sm text-muted">Subject: {template.subject}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-expanded={editing}
          className="min-h-10 cursor-pointer rounded-[10px] border border-field px-3.5 text-sm font-semibold text-brand-dark hover:bg-surface"
        >
          {editing ? "Close" : "Edit text"}
        </button>
      </div>
      {editing && (
        <form action={action} className="flex flex-col gap-3 border-t border-line-3 px-4 py-4">
          <input type="hidden" name="key" value={template.key} />
          <label htmlFor={`t-subject-${template.key}`} className="text-sm font-semibold">Subject</label>
          <input id={`t-subject-${template.key}`} name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${fieldCls} min-h-11`} />
          <label htmlFor={`t-body-${template.key}`} className="text-sm font-semibold">Message</label>
          <textarea id={`t-body-${template.key}`} name="body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} className={`${fieldCls} py-3 leading-[1.6]`} />
          <p className="text-[13px] text-muted">
            Fields: {Object.keys(MERGE_FIELDS).map((k) => `{{${k}}}`).join(" ")}
          </p>
          {unknown.length > 0 && (
            <p role="alert" className="text-sm font-semibold text-danger-fg">Unknown field: {unknown.map((u) => `{{${u}}}`).join(", ")}</p>
          )}
          <FormResult state={state} />
          <div className="flex gap-2">
            <button
              disabled={pending || unknown.length > 0}
              className="min-h-11 cursor-pointer rounded-xl bg-brand px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save text"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject(template.subject);
                setBody(template.body);
              }}
              className="min-h-11 cursor-pointer rounded-xl border border-field bg-white px-4 font-semibold text-ink"
            >
              Undo changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
