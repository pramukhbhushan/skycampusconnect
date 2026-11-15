import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseStepper } from "@/components/course-stepper";
import { Card, PdfBadge, StatusPill, cx } from "@/components/ui";
import { Suspense } from "react";
import { getAdminCourseDetail, listAdminCourseIds, remindHref } from "@/lib/data/admin";
import { getCourse } from "@/lib/data/courses";
import { formatDate, formatRange } from "@/lib/dates";
import { COURSE_TYPE_LABEL, money } from "@/lib/pricing";
import type { Funder } from "@/lib/types";
import { ActionPanel } from "./action-panel";

// Prerender the page shell (header, loading state) for each known course. The course
// itself renders per request inside <Suspense>, since it depends on today and admin changes.
export function generateStaticParams() {
  return listAdminCourseIds().map((courseId) => ({ courseId }));
}

export async function generateMetadata({ params }: PageProps<"/admin/courses/[courseId]">): Promise<Metadata> {
  return { title: getCourse((await params).courseId)?.name ?? "Course" };
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
  needs_info: "Sent back for more information",
};

const DOC_STATUS: Record<string, string> = {
  requested: "Requested, waiting on IAHV",
  issued: "Issued",
  sent_to_client: "Sent to the client",
  accounting_submitted: "In course accounting",
  paid: "Paid",
  closed: "Closed",
  rejected: "Rejected",
  accepted: "Accepted",
  revised: "Being revised",
  expired: "Expired",
};

// B-2.1 course view with B-3.1 / B-5.1 / B-6.1 actions and B-5.2 documents.
export default function AdminCoursePage({ params }: PageProps<"/admin/courses/[courseId]">) {
  // Status depends on today and on admin changes, so the course renders per request.
  return (
    <Suspense fallback={<div aria-busy="true" aria-label="Loading course" className="mx-auto mt-8 h-[640px] max-w-[1320px] animate-pulse rounded-[20px] bg-white" />}>
      <CourseDetail params={params} />
    </Suspense>
  );
}

async function CourseDetail({ params }: Pick<PageProps<"/admin/courses/[courseId]">, "params">) {
  const detail = await getAdminCourseDetail((await params).courseId);
  if (!detail) notFound();
  const { course, organizer, row, facts, status, activity, estimatedFee } = detail;
  const documents = course.funding?.documents ?? [];
  const reminderLink = remindHref([course.id], status.next.kind === "remind" ? status.next.template : undefined);

  const facts1: [string, string][] = [
    ["Course type", course.type ? COURSE_TYPE_LABEL[course.type] : "Not set"],
    ["Format", course.format === "online" ? "Online" : "In person"],
    ["Dates", formatRange(course.startDate, course.endDate)],
    ["University", course.university ?? "Not set"],
    ["Teachers", course.teachers ?? "Not added yet"],
    ["Estimated participants", course.estParticipants?.toString() ?? "—"],
    ["Paid by", course.funders.length ? course.funders.map((f) => FUNDER_LABEL[f]).join(", ") : "—"],
    ["Journey course ID", course.journeyCourseId ?? "Not posted yet"],
  ];

  const money1: [string, string][] = [
    ["Estimated course fee", estimatedFee !== null ? money(estimatedFee) : "—"],
    [
      "Funding request",
      facts.funding
        ? `${FUNDING_STATUS[facts.funding.status]}${course.funding ? ` · ${course.funding.totalFunding}` : ""}`
        : course.funders.length === 1 && course.funders[0] === "students"
          ? "Not needed (students pay)"
          : "Not submitted",
    ],
  ];
  if (facts.quote) money1.push(["Quote", `${facts.quote.number ?? "No number yet"} · ${DOC_STATUS[facts.quote.status]}`]);
  money1.push([
    "Invoice",
    facts.invoice
      ? `${facts.invoice.number ?? "No number yet"} · ${DOC_STATUS[facts.invoice.status]}${facts.invoice.amount ? ` · ${money(facts.invoice.amount)}` : ""}`
      : "Not requested",
  ]);
  if (facts.invoice?.dueDate) money1.push(["Due date", formatDate(facts.invoice.dueDate)]);

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
              <StatusPill tone={status.tone}>{status.statusLabel}</StatusPill>
              <span className={cx("text-sm", status.late ? "font-semibold text-danger-fg" : "text-muted")}>
                {status.dueLabel}
                {status.flagged && " · stuck over 10 business days"}
              </span>
            </div>
          </div>
          <CourseStepper steps={course.steps} />
        </div>
      </div>

      <main className="mx-auto flex max-w-[1320px] flex-wrap items-start gap-7 px-8 pt-8 pb-12">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <Card aria-labelledby="details-title">
            <h2 id="details-title" className="text-xl font-bold">Course details</h2>
            <FactList facts={facts1} />
          </Card>

          <Card aria-labelledby="money-title">
            <h2 id="money-title" className="text-xl font-bold">Funding &amp; invoice</h2>
            <FactList facts={money1} />
          </Card>

          <Card aria-labelledby="docs-title" className="gap-4">
            <h2 id="docs-title" className="text-xl font-bold">Documents</h2>
            {documents.length ? (
              <ul className="flex flex-col gap-2.5">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-4 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <PdfBadge />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold">{d.name}</span>
                        <span className="text-[13px] text-muted">Proof of funds · {d.size} · uploaded {d.uploadedOn}</span>
                      </span>
                    </span>
                    {/* TODO(backend, B-5.2): link to a short-lived signed URL from Supabase Storage. */}
                    <span className="text-[13px] text-muted">Opens once file storage is connected</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No documents uploaded yet.</p>
            )}
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
          <ActionPanel courseId={course.id} facts={facts} next={status.next} remindHref={reminderLink} />

          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-[22px]">
            <h2 className="text-[17px] font-bold">Organizer</h2>
            <FactList
              facts={[
                ["Name", organizer.name],
                ["Campus", organizer.campus],
              ]}
              stacked
            />
            <a href={`mailto:${organizer.email}`} className="text-sm font-semibold">{organizer.email}</a>
            <Link href={remindHref([course.id])} className="text-sm font-semibold">Email a reminder →</Link>
          </div>
        </aside>
      </main>
    </>
  );
}

function FactList({ facts, stacked }: { facts: [string, string][]; stacked?: boolean }) {
  return (
    <dl className={cx("text-sm", stacked ? "flex flex-col gap-2.5" : "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-5 gap-y-4")}>
      {facts.map(([k, v]) => (
        <div key={k}>
          <dt className="text-muted">{k}</dt>
          <dd className="mt-0.5 font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
