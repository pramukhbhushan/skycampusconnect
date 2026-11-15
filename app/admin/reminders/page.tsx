import type { Metadata } from "next";
import { adminUser } from "@/lib/data/admin";
import { organizers } from "@/lib/data/organizer";
import { reminderGroups, sentReminders } from "@/lib/data/reminders";
import { Reminders, type ReminderGroupView } from "./reminders";

export const metadata: Metadata = { title: "Email reminders" };

// TODO(backend): the sender is the signed-in IAHV admin (plan-v3 "Reminder emails").
// This sample address stands in until Google sign-in lands (A-0.5).
const SAMPLE_SENDER = { name: adminUser.name, email: adminUser.email };

export default function RemindersPage() {
  // Each reminder goes TO the course organizer's email, so attach it to every recipient.
  const groups: ReminderGroupView[] = reminderGroups.map((g) => ({
    ...g,
    recipients: g.recipients.map((r) => ({
      ...r,
      email: organizers.find((o) => o.name === r.organizer)?.email ?? "",
    })),
  }));

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Email reminders</h1>
        <p className="text-[15px] text-muted">
          Pick who needs a nudge, check the message, and send it. Each organizer gets their own email from you.
        </p>
      </div>
      <Reminders groups={groups} sender={SAMPLE_SENDER} sent={sentReminders} />
    </main>
  );
}
