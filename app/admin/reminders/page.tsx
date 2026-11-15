import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReminderTemplateKey } from "@/lib/admin/derive";
import { adminUser } from "@/lib/data/admin-user";
import { REMINDER_GROUPS, getRecipientsFor, getReminderGroups, getSentReminders, mergeValuesFor } from "@/lib/data/reminders";
import { getEmailTemplates } from "@/lib/data/settings";
import { emailMode } from "@/lib/email/client";
import { Reminders } from "./reminders";

export const metadata: Metadata = { title: "Email reminders" };

export default function RemindersPage({ searchParams }: PageProps<"/admin/reminders">) {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Email reminders</h1>
        <p className="text-[15px] text-muted">
          Pick who needs a nudge, check the message, and send it. Each organizer gets their own email from you.
        </p>
      </div>
      {/* Selected courses come from the URL (?courses=...), known only per request. */}
      <Suspense fallback={<div aria-busy="true" className="h-[520px] animate-pulse rounded-[20px] border border-line bg-white" />}>
        <Composer searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const KEYS = REMINDER_GROUPS.map((g) => g.id);

async function Composer({ searchParams }: Pick<PageProps<"/admin/reminders">, "searchParams">) {
  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const selectedIds = first(sp.courses).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);
  const templateParam = first(sp.template) as ReminderTemplateKey;

  const groups = getReminderGroups();
  const selected = selectedIds.length ? getRecipientsFor(selectedIds) : null;
  const templates = await getEmailTemplates();

  // Preview values for everyone who could be on the list.
  const everyone = [...Object.values(groups).flat(), ...(selected ?? [])];
  const values = Object.fromEntries(everyone.map((r) => [r.courseId, mergeValuesFor(r.courseId, adminUser)]));

  const initialTemplate: ReminderTemplateKey = KEYS.includes(templateParam)
    ? templateParam
    : (selected?.find((r) => r.suggested)?.suggested ?? KEYS.find((k) => groups[k].length) ?? "request_invoice");

  return (
    <Reminders
      groups={groups}
      groupLabels={REMINDER_GROUPS}
      selected={selected}
      templates={templates}
      initialTemplate={initialTemplate}
      values={values}
      sender={{ name: adminUser.name, email: adminUser.email }}
      sent={getSentReminders()}
      devMode={emailMode() === "dev"}
    />
  );
}
