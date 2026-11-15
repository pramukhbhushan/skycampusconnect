import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { getAdminMe } from "@/lib/data/admin-db";
import { getEmailTemplates, getPricing, getUsers } from "@/lib/data/settings";
import { PricingForm } from "./pricing-form";
import { TemplateEditor } from "./template-editor";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Settings" };

// B-2.2 users & roles, B-4.4 reminder texts, B-5.3 pricing.
export default function SettingsPage() {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-[15px] text-muted">Who has access, what reminder emails say, and how courses are priced.</p>
        </div>
        <span className="rounded-full border border-dashed border-skip px-3 py-1.5 text-[13px] font-semibold text-muted">
          Sample data · changes last until the server restarts
        </span>
      </div>
      <Suspense fallback={<div aria-busy="true" className="h-[900px] animate-pulse rounded-[20px] border border-line bg-white" />}>
        <Sections />
      </Suspense>
    </main>
  );
}

async function Sections() {
  const [me, users, templates, pricing] = await Promise.all([getAdminMe(), getUsers(), getEmailTemplates(), getPricing()]);
  return (
    <>
      <Card aria-labelledby="users-title" className="gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="users-title" className="text-xl font-bold">Users &amp; roles</h2>
          <p className="text-sm text-muted">
            Everyone signs in with Google and starts as an organizer. Only an IAHV admin can make someone an admin.
          </p>
        </div>
        <UsersTable users={users} currentUserId={me.id} />
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
            <li key={t.key}>
              <TemplateEditor template={t} />
            </li>
          ))}
        </ul>
      </Card>

      <Card aria-labelledby="pricing-title" className="gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="pricing-title" className="text-xl font-bold">Pricing</h2>
          <p className="text-sm text-muted">Used everywhere the admin side works out a course fee.</p>
        </div>
        <PricingForm pricing={pricing} />
      </Card>
    </>
  );
}
