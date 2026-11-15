"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui";
import type { ReminderGroup, ReminderGroupId, ReminderRule, SentReminder } from "@/lib/types";

const panel = "flex min-w-0 flex-col rounded-[20px] border border-line bg-white p-6";

// TODO(backend): send through Resend from a server action, write `email_log`,
// and persist rule toggles to the reminder rules table.
export function Reminders({
  groups,
  rules: initialRules,
  sent,
}: {
  groups: ReminderGroup[];
  rules: ReminderRule[];
  sent: SentReminder[];
}) {
  const [filter, setFilter] = useState<ReminderGroupId>("invoice");
  const [rules, setRules] = useState(initialRules);
  const group = groups.find((g) => g.id === filter)!;
  const n = group.recipients.length;

  return (
    <>
      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="who-title" className={`${panel} flex-[1_1_380px] gap-[18px]`}>
          <h2 id="who-title" className="text-[19px] font-bold">1 · Who should get it?</h2>
          <div role="group" aria-label="Saved filters" className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Chip key={g.id} selected={g.id === filter} onClick={() => setFilter(g.id)} className="px-3.5 text-sm">
                {g.label} · {g.recipients.length}
              </Chip>
            ))}
          </div>
          <ul className="flex flex-col gap-2">
            {group.recipients.map((r) => (
              <li key={r.course}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line p-3.5">
                  <input type="checkbox" defaultChecked className="mt-0.5 size-[18px] accent-brand" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{r.organizer} · {r.course}</span>
                    <span className="text-sm text-muted">{r.campus}</span>
                    <span className="text-[13px] font-semibold text-danger-fg">{r.why}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="msg-title" className={`${panel} flex-[999_1_560px] gap-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 id="msg-title" className="text-[19px] font-bold">2 · Check the message</h2>
            <span className="text-sm text-muted">
              Previewing for <strong className="text-ink">{group.recipients[0]?.organizer}</strong>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="m-template" className="text-sm font-semibold">Template</label>
            <select id="m-template" key={group.id} className="min-h-[46px] rounded-xl border border-field bg-white px-3 text-[15px] text-ink">
              <option>{group.template.name}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="m-subject" className="text-sm font-semibold">Subject</label>
            <input
              id="m-subject"
              key={group.id}
              type="text"
              defaultValue={group.template.subject}
              className="min-h-[46px] rounded-xl border border-field px-3.5 text-[15px] text-ink"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Message</span>
            <div className="rounded-[14px] border border-line bg-faint px-[22px] py-5 text-[15px] leading-[1.65] whitespace-pre-line">
              {group.template.body}
            </div>
            <span className="text-[13px] text-muted">Names, courses and invoice details are filled in for each organizer.</span>
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button variant="secondary" className="px-[22px]">Send me a test</Button>
            <Button>Send to {n} organizer{n === 1 ? "" : "s"}</Button>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="auto-title" className={`${panel} flex-[1_1_420px] gap-3.5`}>
          <div className="flex flex-col gap-1">
            <h2 id="auto-title" className="text-[19px] font-bold">Automatic reminders</h2>
            <p className="text-sm text-muted">Sent for you, so nobody has to remember.</p>
          </div>
          {rules.map((r) => (
            <label key={r.id} className="flex cursor-pointer items-center justify-between gap-3.5 border-t border-line-3 pt-3.5">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{r.title}</span>
                <span className="text-[13px] text-muted">{r.when}</span>
              </span>
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={() => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)))}
                className="size-5 flex-none accent-brand"
              />
            </label>
          ))}
        </section>

        <section aria-labelledby="hist-title" className={`${panel} flex-[1_1_420px] gap-3.5`}>
          <h2 id="hist-title" className="text-[19px] font-bold">Recently sent</h2>
          <ul className="flex flex-col">
            {sent.map((s) => (
              <li key={s.id} className="flex justify-between gap-3 border-t border-line-3 py-3 text-sm">
                <span><strong>{s.title}</strong> · {s.target}</span>
                <span className="whitespace-nowrap text-muted">{s.when}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
