"use server";
// Sends reminder emails (B-4.3): one per course, To the organizer, From the admin.
// Only IAHV admins may send. TODO(backend): write each send to `email_log`.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { adminStore, logActivity } from "@/lib/data/admin-store";
import { getAdminMe } from "@/lib/data/admin-db";
import { getRecipientsFor, mergeValuesFor } from "@/lib/data/reminders";
import { getEmailTemplates } from "@/lib/data/settings";
import { sendEmail } from "@/lib/email/client";
import { MERGE_FIELDS, renderTemplate, unknownFields } from "@/lib/email/templates";
import { reminderEmailSchema } from "@/lib/validation";

export type SendState = { ok: true; message: string } | { ok: false; error: string } | null;

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "http"}://${host}` : "";
}

export async function sendRemindersAction(_: SendState, form: FormData): Promise<SendState> {
  const me = await getAdminMe();
  const adminUser = { name: me.name, email: me.email };
  const parsed = reminderEmailSchema.safeParse({
    courseIds: String(form.get("courseIds") ?? "").split(",").filter(Boolean),
    templateKey: form.get("templateKey"),
    subject: form.get("subject"),
    body: form.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the message." };
  const { courseIds, templateKey, subject, body } = parsed.data;

  const unknown = unknownFields(`${subject}\n${body}`);
  if (unknown.length) return { ok: false, error: `Unknown field: ${unknown.map((u) => `{{${u}}}`).join(", ")}. Fix the spelling or remove it.` };

  const recipients = await getRecipientsFor(courseIds);
  if (!recipients.length) return { ok: false, error: "Pick at least one course." };

  const base = await origin();
  const emails = await Promise.all(recipients.map(async (r) => {
    const values = await mergeValuesFor(r.courseId, adminUser, base);
    const s = renderTemplate(subject, values);
    const b = renderTemplate(body, values);
    return { r, subject: s.text, text: b.text, missing: [...new Set([...s.missing, ...b.missing])] };
  }));

  const blocked = emails.filter((e) => e.missing.length);
  if (blocked.length) {
    const first = blocked[0];
    return {
      ok: false,
      error: `${first.r.course} has no ${first.missing.map((m) => MERGE_FIELDS[m].toLowerCase()).join(" or ")} yet, so this message would have a gap. Untick it or pick a different template.`,
    };
  }

  const templateName = (await getEmailTemplates()).find((t) => t.key === templateKey)?.name ?? "Reminder";

  if (form.get("mode") === "test") {
    const e = emails[0];
    const sent = await sendEmail({ from: adminUser, to: adminUser, subject: `[Test] ${e.subject}`, text: e.text });
    return { ok: true, message: `Test sent to ${adminUser.email}${sent.mode === "dev" ? " (dev mode: written to the server log, not emailed)" : ""}.` };
  }

  let mode: "dev" | "resend" = "dev";
  for (const e of emails) {
    const sent = await sendEmail({ from: adminUser, to: { name: e.r.organizer, email: e.r.email }, subject: e.subject, text: e.text });
    mode = sent.mode;
    logActivity(e.r.courseId, adminUser.name, `Sent reminder: ${templateName}`);
  }
  adminStore.sent.unshift({
    id: `sent-${Date.now()}`,
    title: templateName,
    target: emails.length === 1 ? emails[0].r.course : `${emails.length} courses`,
    when: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sentBy: adminUser.name,
  });
  revalidatePath("/admin", "layout");

  const n = emails.length;
  return {
    ok: true,
    message: `Sent to ${n} organizer${n === 1 ? "" : "s"}${mode === "dev" ? " (dev mode: written to the server log, not emailed)" : ""}.`,
  };
}

/**
 * The admin opened a reminder in their own mail app (mailto:). We can't see whether they
 * press Send there, so this records that the email was drafted, for the course's activity
 * log and "Recently sent".
 */
export async function recordMailAppReminder(courseId: string, templateKey: string, course: string): Promise<void> {
  const me = await getAdminMe();
  const templateName = (await getEmailTemplates()).find((t) => t.key === templateKey)?.name ?? "Reminder";
  logActivity(courseId, me.name, `Opened reminder in mail app: ${templateName}`);
  adminStore.sent.unshift({
    id: `mail-${Date.now()}`,
    title: `${templateName} (mail app)`,
    target: course,
    when: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    sentBy: me.name,
  });
  revalidatePath("/admin", "layout");
}
