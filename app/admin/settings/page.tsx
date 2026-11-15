import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { getEmailTemplates, getPricing, getUsers } from "@/lib/data/settings";
import { COURSE_TYPE_LABEL, computeFee, money } from "@/lib/pricing";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Settings" };

const editLater = "inline-flex min-h-10 cursor-not-allowed items-center rounded-[10px] border border-line px-3.5 text-sm font-semibold text-muted";

// B-2.2: settings shell. Each section shows real structure on sample data and is
// wired up in its own sprint (roles: when sign-in lands; emails: B-4.4; pricing: B-5.3).
export default async function SettingsPage() {
  const [users, templates, pricing] = await Promise.all([getUsers(), getEmailTemplates(), getPricing()]);
  const example = computeFee("happiness", 14, false, pricing);

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-[15px] text-muted">Who has access, what reminder emails say, and how courses are priced.</p>
        </div>
        <span className="rounded-full border border-dashed border-skip px-3 py-1.5 text-[13px] font-semibold text-muted">
          Sample data · changes aren&apos;t saved yet
        </span>
      </div>

      <Card aria-labelledby="users-title" className="gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="users-title" className="text-xl font-bold">Users &amp; roles</h2>
          <p className="text-sm text-muted">
            Everyone signs in with Google and starts as an organizer. Only an IAHV admin can make someone an admin.
          </p>
        </div>
        <UsersTable users={users} />
      </Card>

      <Card aria-labelledby="emails-title" className="gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="emails-title" className="text-xl font-bold">Reminder email texts</h2>
          <p className="text-sm text-muted">
            The starting text for each reminder. Admins can still edit a message before sending it.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {templates.map((t) => (
            <li key={t.key} className="rounded-[14px] border border-line">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{t.name}</span>
                    <span className="truncate text-sm text-muted">Subject: {t.subject}</span>
                  </span>
                  <span className="text-sm font-semibold text-brand group-open:hidden">Preview</span>
                  <span className="hidden text-sm font-semibold text-brand group-open:inline">Hide</span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line-3 px-4 py-4">
                  <p className="text-[15px] leading-[1.65] whitespace-pre-line">{t.body}</p>
                  <button type="button" disabled className={`${editLater} self-start`}>
                    Edit text (coming in Sprint 4)
                  </button>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <Card aria-labelledby="pricing-title" className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="pricing-title" className="text-xl font-bold">Pricing</h2>
            <p className="text-sm text-muted">Used everywhere the app works out a course fee.</p>
          </div>
          <button type="button" disabled className={editLater}>Edit pricing (coming in Sprint 5)</button>
        </div>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-5 gap-y-4 text-sm">
          {(["happiness", "premium"] as const).map((type) => (
            <div key={type}>
              <dt className="text-muted">{COURSE_TYPE_LABEL[type]}</dt>
              <dd className="mt-0.5 text-lg font-bold">{money(pricing.basePrice[type], false)}</dd>
            </div>
          ))}
          <div>
            <dt className="text-muted">Students included in the base price</dt>
            <dd className="mt-0.5 text-lg font-bold">{pricing.includedStudents}</dd>
          </div>
          <div>
            <dt className="text-muted">Each extra student</dt>
            <dd className="mt-0.5 text-lg font-bold">{money(pricing.extraStudentPrice, false)}</dd>
          </div>
          <div>
            <dt className="text-muted">Card payment fee</dt>
            <dd className="mt-0.5 text-lg font-bold">{(pricing.cardFeeRate * 100).toFixed(0)}%</dd>
          </div>
        </dl>
        <p className="rounded-xl bg-tint px-3.5 py-3 text-sm text-info-text">
          Example: a SKY Happiness Retreat with 14 students costs {money(example.total)} ({money(example.base, false)} base +{" "}
          {example.extraStudents} extra × {money(pricing.extraStudentPrice, false)}).
        </p>
      </Card>
    </main>
  );
}
