import type { Metadata } from "next";
import Link from "next/link";
import { CourseHeader, StepLayout } from "@/components/course-stepper";
import { Clock, Upload, Warning } from "@/components/icons";
import { Callout, Card, Eyebrow, FileRow, SideCard, TextArea, TextField } from "@/components/ui";
import { formatNumeric } from "@/lib/dates";
import { getOpenPriorCourses } from "@/lib/data/courses";
import { getOrganizer } from "@/lib/data/organizer";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import { courseStaticParams, courseSubtitle, loadCourse } from "../course-data";
import { AgreementChoice, FundingFooter, StudentFeeChoice } from "./funding-choices";

export const metadata: Metadata = { title: "Funding approval" };

export const generateStaticParams = courseStaticParams;

// Step 3 · Funding approval (only for school / sponsor / donor funded courses).
export default async function FundingPage({ params }: PageProps<"/organizer/courses/[courseId]/funding">) {
  const course = await loadCourse(params);
  const organizer = getOrganizer(course.organizerId)!;
  const funding = course.funding;
  const openPrior = getOpenPriorCourses(course);
  const steps = course.steps.map((s, i) => (i === 2 && s === "todo" ? "in_progress" : s));

  return (
    <>
      <CourseHeader title={course.name} subtitle={courseSubtitle(course)} steps={steps} />

      <StepLayout
        aside={
          <>
            <SideCard title="How approval works">
              <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-normal text-ink-soft">
                <li>You submit this request with your proof of funds.</li>
                <li>IAHV Finance reviews it, usually in 1–2 business days.</li>
                <li>Once approved, your Journey student fee is updated and Step 4 opens.</li>
              </ol>
            </SideCard>
            <SideCard title="Good proof of funds" tinted>
              <p className="text-sm leading-normal text-info-text">
                Award or approval letters, an admin email confirming approval, grant letters, or sponsor and donor
                commitments, with the dollar amount on them.
              </p>
            </SideCard>
          </>
        }
      >
        <form className="contents">
          {funding?.status === "submitted" && (
            <Callout role="status" tone="warn" icon={<Clock size={22} />} title={`Submitted ${funding.submittedOn} · waiting on IAHV Finance`}>
              <span>Usually 1–2 business days. We&apos;ll email you when it&apos;s approved, and Step 4 unlocks automatically.</span>
            </Callout>
          )}

          {openPrior.length > 0 && (
            <Callout
              tone="danger"
              icon={<Warning size={22} />}
              title={`${openPrior.length} earlier course${openPrior.length === 1 ? " isn't" : "s aren't"} closed yet`}
            >
              <span>
                IAHV can only approve funding once your previous courses are closed on Journey.{" "}
                {openPrior.map((c) => (
                  <span key={c.id}>
                    <strong>{c.name}</strong> is on Step {currentStep(c.steps)} · {STEP_NAMES[currentStep(c.steps) - 1]}.
                  </span>
                ))}
              </span>
              <Link href="/organizer" className="font-semibold text-danger-text hover:text-danger-text">
                Finish closing {openPrior[0].name}
              </Link>
            </Callout>
          )}

          <Card>
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 3 of 8</Eyebrow>
              <h2 className="text-2xl font-bold">Request funding approval</h2>
              <p className="text-[15px] leading-normal text-muted">
                Your university is paying, so IAHV needs proof of funds to set the student fee on Journey (usually $0).
              </p>
            </div>
            <div className="overflow-hidden rounded-[14px] border border-line">
              <div className="flex items-center justify-between gap-2.5 bg-surface px-4 py-3">
                <span className="text-sm font-bold">Filled in from your course</span>
                <Link href="/organizer/courses/new" className="text-sm font-semibold">Edit</Link>
              </div>
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-5 gap-y-3.5 p-4 text-sm">
                {[
                  ["Requestor", `${organizer.name} · ${organizer.email}`],
                  ["Teacher(s)", course.teachers ?? "[Teacher names]"],
                  ["Journey course ID", course.journeyCourseId ?? "Not posted yet"],
                  ["Course type · format", `${course.type === "premium" ? "SKY Premium" : "SKY Happiness"} · ${course.format === "online" ? "Online" : "In person"}`],
                  ["Start date", course.startDate ? formatNumeric(course.startDate) : "—"],
                  ["University", course.university ?? "—"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="mt-0.5 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold">Funding details</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <TextField id="f-amount" label="Total funding available" defaultValue={funding?.totalFunding ?? ""} />
              <TextField id="f-count" label="Estimated participants" defaultValue={course.estParticipants ?? ""} />
              <TextField id="f-needed" label="Needed by" defaultValue={funding?.neededBy ?? ""} />
            </div>
            <StudentFeeChoice initialPaysPart={funding?.studentsPayPart ?? false} />
            <TextArea
              id="f-prior"
              label="Unused funding from an earlier invoice"
              optional="optional"
              placeholder="Invoice #, how much is left, and how much to use for this course"
            />
          </Card>

          <Card className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Proof of funds</h2>
              <p className="text-[15px] text-muted">Up to 5 PDFs, 10 MB each. It&apos;s saved once and reused for your invoice.</p>
            </div>
            {funding?.documents.map((d) => (
              <FileRow
                key={d.id}
                name={d.name}
                meta={`${d.size} · uploaded ${d.uploadedOn}`}
                action={
                  <button
                    type="button"
                    className="min-h-10 cursor-pointer rounded-[10px] border border-line bg-white px-3.5 text-sm font-semibold text-ink-soft"
                  >
                    Remove
                  </button>
                }
              />
            ))}
            {/* TODO(backend): upload to Supabase Storage and insert into `documents`. */}
            <label
              htmlFor="f-upload"
              className="relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-field bg-faint p-[26px] text-center"
            >
              <Upload size={26} className="text-brand" />
              <span className="text-[15px] font-semibold text-brand-dark">
                {funding?.documents.length ? "Add another PDF" : "Upload a PDF"}
              </span>
              <span className="text-[13px] text-muted">
                Must show: funding organization, approved amount, that it&apos;s for a SKY Campus course, and written approval
              </span>
              <input id="f-upload" type="file" accept="application/pdf" className="sr-only" />
            </label>
          </Card>

          <AgreementChoice initial={funding?.agreement ?? "yes"} />

          <FundingFooter courseId={course.id} />
        </form>
      </StepLayout>
    </>
  );
}
