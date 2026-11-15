import type { Metadata } from "next";
import { reminderGroups, reminderRules, sentReminders } from "@/lib/mock-data";
import { Reminders } from "./reminders";

export const metadata: Metadata = { title: "Email reminders" };

export default function RemindersPage() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Email reminders</h1>
        <p className="text-[15px] text-muted">Pick who needs a nudge, check the message, and send it to everyone at once.</p>
      </div>
      <Reminders groups={reminderGroups} rules={reminderRules} sent={sentReminders} />
    </main>
  );
}
