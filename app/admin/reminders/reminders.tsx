"use client";

import { useActionState, useState } from "react";
import { Chip, cx } from "@/components/ui";
import type { ReminderTemplateKey } from "@/lib/admin/derive";
import type { ReminderRecipient } from "@/lib/data/reminders";
import { MERGE_FIELDS, renderTemplate, unknownFields, type EmailTemplate, type MergeValues } from "@/lib/email/templates";
import { sendRemindersAction, type SendState } from "./actions";

const panel = "flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-6";
const fieldCls = "rounded-xl border border-field bg-white px-3.5 text-[15px] text-ink";

type Person = { name: string; email: string };
type Sent = { id: string; title: string; target: string; when: string; sentBy: string };
type Source = ReminderTemplateKey | "selected";

function Address({ label, person }: { label: string; person: Person }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
      <span className="w-12 flex-none text-sm font-semibold text-muted">{label}</span>
      <span>
        <strong>{person.name}</strong> <span className="text-muted">&lt;{person.email}&gt;</span>
      </span>
    </div>
  );
}

// B-4.3: plan-v3 "Reminder emails". Every email is sent by an IAHV admin from here;
// nothing is sent automatically.
export function Reminders({
  groups,
  groupLabels,
  selected,
  templates,
  initialTemplate,
  values,
  sender,
  sent,
  devMode,
}: {
  groups: Record<ReminderTemplateKey, ReminderRecipient[]>;
  groupLabels: { id: ReminderTemplateKey; label: string }[];
  selected: ReminderRecipient[] | null;
  templates: EmailTemplate[];
  initialTemplate: ReminderTemplateKey;
  values: Record<string, MergeValues>;
  sender: Person;
  sent: Sent[];
  devMode: boolean;
}) {
  const [source, setSource] = useState<Source>(selected ? "selected" : initialTemplate);
  const recipients = source === "selected" ? (selected ?? []) : groups[source];
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const chosen = recipients.filter((r) => !unchecked.has(r.courseId));

  const [templateKey, setTemplateKey] = useState<ReminderTemplateKey>(initialTemplate);
  const template = templates.find((t) => t.key === templateKey)!;
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = chosen.find((r) => r.courseId === previewId) ?? chosen[0];

  const [state, action, pending] = useActionState<SendState, FormData>(sendRemindersAction, null);

  const pickSource = (s: Source) => {
    setSource(s);
    setUnchecked(new Set());
    setPreviewId(null);
    if (s !== "selected") pickTemplate(s);
  };
  const pickTemplate = (key: ReminderTemplateKey) => {
    const t = templates.find((x) => x.key === key)!;
    setTemplateKey(key);
    setSubject(t.subject);
    setBody(t.body);
  };
  const toggle = (id: string) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rendered = (() => {
    if (!preview) return null;
    const v = values[preview.courseId] ?? {};
    const s = renderTemplate(subject, v);
    const b = renderTemplate(body, v);
    return { subject: s.text, body: b.text, missing: [...new Set([...s.missing, ...b.missing])] };
  })();
  const unknown = unknownFields(`${subject}\n${body}`);
  const n = chosen.length;

  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="who-title" className={`${panel} flex-[1_1_380px] gap-[18px]`}>
          <h2 id="who-title" className="text-[19px] font-bold">1 · Who should get it?</h2>
          <div role="group" aria-label="Saved filters" className="flex flex-wrap gap-2">
            {selected && (
              <Chip selected={source === "selected"} onClick={() => pickSource("selected")} className="px-3.5 text-sm">
                Picked on the dashboard · {selected.length}
              </Chip>
            )}
            {groupLabels.map((g) => (
              <Chip key={g.id} selected={source === g.id} onClick={() => pickSource(g.id)} className="px-3.5 text-sm">
                {g.label} · {groups[g.id].length}
              </Chip>
            ))}
          </div>
          {recipients.length === 0 ? (
            <p className="rounded-[14px] bg-surface px-4 py-6 text-center text-sm text-muted">No one in this group right now.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recipients.map((r) => (
                <li key={r.courseId}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line p-3.5">
                    <input
                      type="checkbox"
                      checked={!unchecked.has(r.courseId)}
                      onChange={() => toggle(r.courseId)}
                      aria-label={`Send to ${r.organizer} about ${r.course}`}
                      className="mt-0.5 size-[18px] accent-brand"
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{r.organizer} · {r.course}</span>
                      <span className="text-sm text-muted">{r.email} · {r.campus}</span>
                      <span className="text-[13px] font-semibold text-danger-fg">{r.why}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form action={action} aria-labelledby="msg-title" className={`${panel} flex-[999_1_560px] gap-[18px]`}>
          <input type="hidden" name="courseIds" value={chosen.map((r) => r.courseId).join(",")} />
          <input type="hidden" name="templateKey" value={templateKey} />
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 id="msg-title" className="text-[19px] font-bold">2 · Check the message</h2>
            {n > 1 && preview && (
              <label className="flex items-center gap-2 text-sm text-muted">
                Preview for
                <select
                  value={preview.courseId}
                  onChange={(e) => setPreviewId(e.target.value)}
                  className="min-h-9 rounded-lg border border-field bg-white px-2 text-sm text-ink"
                >
                  {chosen.map((r) => (
                    <option key={r.courseId} value={r.courseId}>{r.organizer}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {preview && (
            <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-surface px-4 py-3">
              <Address label="From" person={sender} />
              <Address label="To" person={{ name: preview.organizer, email: preview.email }} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="m-template" className="text-sm font-semibold">Template</label>
            <select
              id="m-template"
              value={templateKey}
              onChange={(e) => pickTemplate(e.target.value as ReminderTemplateKey)}
              className={`${fieldCls} min-h-[46px] px-3`}
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="m-subject" className="text-sm font-semibold">Subject</label>
            <input id="m-subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${fieldCls} min-h-[46px]`} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="m-body" className="text-sm font-semibold">Message</label>
            <textarea id="m-body" name="body" rows={9} value={body} onChange={(e) => setBody(e.target.value)} className={`${fieldCls} py-3 leading-[1.6]`} />
            <details className="text-[13px] text-muted">
              <summary className="cursor-pointer font-semibold text-brand">Fields you can use</summary>
              <ul className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-4 gap-y-1">
                {Object.entries(MERGE_FIELDS).map(([k, label]) => (
                  <li key={k}><code className="text-ink">{`{{${k}}}`}</code> {label}</li>
                ))}
              </ul>
            </details>
          </div>

          {unknown.length > 0 && (
            <p role="alert" className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm text-danger-text">
              Unknown field: {unknown.map((u) => `{{${u}}}`).join(", ")}
            </p>
          )}

          {rendered && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">What {preview!.organizer.split(" ")[0]} will get</span>
              <div className="rounded-[14px] border border-line bg-faint px-[22px] py-5 text-[15px] leading-[1.65]">
                <p className="mb-3 font-semibold">{rendered.subject}</p>
                <p className="whitespace-pre-line">{rendered.body}</p>
              </div>
              {rendered.missing.length > 0 && (
                <span className="text-[13px] font-semibold text-danger-fg">
                  Missing for this course: {rendered.missing.map((m) => MERGE_FIELDS[m]).join(", ")}
                </span>
              )}
            </div>
          )}

          {state && (
            <p role={state.ok ? "status" : "alert"} className={cx("rounded-xl px-3.5 py-2.5 text-sm", state.ok ? "bg-ok-bg text-ok-text" : "bg-danger-bg text-danger-text")}>
              {state.ok ? state.message : state.error}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {devMode && <span className="mr-auto text-[13px] text-muted">Dev mode: emails are logged, not sent.</span>}
            <button
              type="submit"
              name="mode"
              value="test"
              disabled={pending || n === 0}
              className="min-h-[50px] cursor-pointer rounded-xl border border-field bg-white px-[22px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send me a test
            </button>
            <button
              type="submit"
              name="mode"
              value="send"
              disabled={pending || n === 0 || unknown.length > 0}
              className="min-h-[50px] cursor-pointer rounded-xl bg-brand px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Sending…" : `Send to ${n} organizer${n === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>

      <section aria-labelledby="hist-title" className={`${panel} gap-3.5`}>
        <h2 id="hist-title" className="text-[19px] font-bold">Recently sent</h2>
        <ul className="flex flex-col">
          {sent.map((s) => (
            <li key={s.id} className="flex justify-between gap-3 border-t border-line-3 py-3 text-sm">
              <span><strong>{s.title}</strong> · {s.target}</span>
              <span className="whitespace-nowrap text-muted">{s.when} · sent by {s.sentBy}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
