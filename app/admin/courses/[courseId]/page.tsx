import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseStepper } from "@/components/course-stepper";
import { Card, StatusPill, cx } from "@/components/ui";
import { getAdminCourseDetail, listAdminCourseIds } from "@/lib/data/admin";
import { formatDate, formatRange } from "@/lib/dates";
import { COURSE_TYPE_LABEL, money } from "@/lib/pricing";
import type { Funder } from "@/lib/types";

// Prerender every sample course; the real version reads by id from Supabase.
export function generateStaticParams() {
  return listAdminCourseIds().map((courseId) => ({ courseId }));
}

export async function generateMetadata({ params }: PageProps<"/admin/courses/[courseId]">): Promise<Metadata> {
  const detail = getAdminCourseDetail((await params).courseId);
  return { title: detail?.course.name ?? "Course" };
}

const FUNDER_LABEL: Record<Funder, string> = {
  students: "Students",
  university: "University",
  sponsor: "Corporate sponsor",
  donor: "Individual donor",
};

const FUNDING_STATUS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted, waiting on IAHV",
  approved: "Approved",
  needs_info: "Needs more information",
};

// B-2.1: read-only course view for IAHV admins. Actions arrive in Sprints 3-6.
export default async function AdminCoursePage({ params }: PageProps<"/admin/courses/[courseId]">) {
  const detail = getAdminCourseDetail((await params).courseId);
  if (!detail) notFound();
  const { course, organizer, row, activity, estimatedFee } = detail;
  const isReminder = row.action.href === "/admin/reminders";

  const facts: [string, string][] = [
    ["Course type", course.type ? COURSE_TYPE_LABEL[course.type] : "Not set"],
    ["Format", course.format === "online" ? "Online" : "In person"],
    ["Dates", formatRange(course.startDate, course.endDate)],
    ["University", course.university ?? "Not set"],
    ["Teachers", course.teachers ?? "Not added yet"],
    ["Estimated participants", course.estParticipants?.toString() ?? "—"],
    ["Paid by", course.funders.length ? course.funders.map((f) => FUNDER_LABEL[f]).join(", ") : "—"],
    ["Journey course ID", course.journeyCourseId ?? "Not posted yet"],
  ];

  return (
    <>
      <div className="border-b border-line-2 bg-white">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-[22px] px-8 pt-6 pb-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Link href="/admin" className="text-sm font-semibold no-underline">← All courses</Link>
              <h1 className="text-[28px] font-bold">{course.name}</h1>
              <span className="text-sm text-muted">
                {row.campus} · {row.dates} · Organizer {organizer.name}
              </span>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusPill tone={row.tone}>{row.statusLabel}</StatusPill>
              <span className={cx("text-sm", row.late ? "font-semibold text-danger-fg" : "text-muted")}>{row.dueLabel}</span>
            </div>
          </div>
          <CourseStepper steps={course.steps} />
        </div>
      </div>

      <main className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-7 px-8 pt-8 pb-12">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <Card aria-labelledby="details-title">
            <h2 id="details-title" className="text-xl font-bold">Course details</h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4 text-sm">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="mt-0.5 font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card aria-labelledby="money-title">
            <h2 id="money-title" className="text-xl font-bold">Funding &amp; invoice</h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4 text-sm">
              <div>
                <dt className="text-muted">Estimated course fee</dt>
                <dd className="mt-0.5 font-semibold">{estimatedFee !== null ? money(estimatedFee) : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Funding request</dt>
                <dd className="mt-0.5 font-semibold">
                  {course.funding
                    ? `${FUNDING_STATUS[course.funding.status]} · ${course.funding.totalFunding}`
                    : course.funders.includes("students") && course.funders.length === 1
                      ? "Not needed (students pay)"
                      : "Not submitted"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Invoice number</dt>
                <dd className="mt-0.5 font-semibold">{course.invoiceNumber ?? "Not issued yet"}</dd>
              </div>
              {course.funding?.documents.length ? (
                <div>
                  <dt className="text-muted">Proof of funds</dt>
                  <dd className="mt-0.5 font-semibold">{course.funding.documents.map((d) => d.name).join(", ")}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card aria-labelledby="activity-title">
            <h2 id="activity-title" className="text-xl font-bold">Activity</h2>
            <ol className="flex flex-col">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line-3 py-3 text-sm first:border-t-0 first:pt-0">
                  <span>
                    <strong>{a.actor}</strong> {a.text.charAt(0).toLowerCase() + a.text.slice(1)}
                  </span>
                  <span className="whitespace-nowrap text-muted">{a.at}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[22px]">
            <h2 className="text-[17px] font-bold">Next action</h2>
            {isReminder ? (
              <Link
                href="/admin/reminders"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 font-semibold text-white no-underline hover:text-white"
              >
                {row.action.label}
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-brand/50 px-4 font-semibold text-white"
                >
                  {row.action.label}
                </button>
                <p className="text-[13px] text-muted">
                  Approving and entering quote or invoice numbers arrive with the funding, invoice and quote sprints.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[22px]">
            <h2 className="text-[17px] font-bold">Organizer</h2>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="font-semibold">{organizer.name}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="font-semibold">
                  <a href={`mailto:${organizer.email}`}>{organizer.email}</a>
                </dd>
              </div>
              <div>
                <dt className="text-muted">Campus</dt>
                <dd className="font-semibold">{organizer.campus}</dd>
              </div>
            </dl>
            <Link href="/admin/reminders" className="text-sm font-semibold">Email a reminder →</Link>
          </div>

          {course.startDate && (
            <p className="px-1 text-[13px] text-muted">
              Course starts {formatDate(course.startDate)}
              {course.endDate && course.endDate !== course.startDate ? ` and ends ${formatDate(course.endDate)}` : ""}.
            </p>
          )}
        </aside>
      </main>
    </>
  );
}
