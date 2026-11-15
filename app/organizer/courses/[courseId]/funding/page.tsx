import type { Metadata } from "next";
import Link from "next/link";
import { CourseHeader, StepLayout } from "@/components/course-stepper";
import { CheckCircle, Clock, InfoCircle, Warning } from "@/components/icons";
import { Callout, Card, Eyebrow, SideCard, TextArea, TextField } from "@/components/ui";
import { formatDate, formatNumeric } from "@/lib/dates";
import { DocumentUpload } from "@/components/organizer/document-upload";
import { getMe, getMyFundingRequest, listMyCourseDocuments, listMyOpenPriorCourses } from "@/lib/data/organizer-db";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import { courseSubtitle, loadCourse } from "../course-data";
import { AgreementChoice, FundingForm, StudentFeeChoice } from "./funding-choices";

export const metadata: Metadata = { title: "Funding approval" };

// Step 3 · Funding approval (only for school / sponsor / donor funded courses).
export default async function FundingPage({ params }: PageProps<"/organizer/courses/[courseId]/funding">) {
  const course = await loadCourse(params);
  const organizer = await getMe();
  const [openPrior, proofOfFunds, request] = await Promise.all([
    listMyOpenPriorCourses(course),
    listMyCourseDocuments(course.id, "proof_of_funds"),
    getMyFundingRequest(course.id),
  ]);
  const steps = course.steps.map((s, i) => (i === 2 && s === "todo" ? "in_progress" : s));
  const skipped = course.steps[2] === "skipped";
  const locked = skipped || request?.status === "submitted" || request?.status === "approved";
  const day = (iso: string | null) => (iso ? formatDate(iso.slice(0, 10)) : "");

  return (
    <>
      <CourseHeader title={course.name} subtitle={courseSubtitle(course)} steps={steps} />

      <StepLayout
        aside={
          <>
            <SideCard title="How approval works">
              <ol className="flex list-decimal flex-col gap-2.5 pl-5 text-sm leading-normal text-ink-soft">
                <li>You submit this request with your proof of funds.</li>
                <li>IAHV reviews it, usually in 1–2 business days.</li>
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
        <FundingForm courseId={course.id} locked={locked}>
          {skipped && (
            <Callout role="status" tone="info" icon={<InfoCircle size={22} />} title="No funding approval needed">
              <span>Students pay for this course on Journey, so this step is skipped. Go straight to Step 4.</span>
            </Callout>
          )}
          {request?.status === "submitted" && (
            <Callout role="status" tone="warn" icon={<Clock size={22} />} title={`Submitted ${day(request.submittedAt)} · waiting on IAHV`}>
              <span>Usually 1–2 business days. You can start your invoice request meanwhile.</span>
            </Callout>
          )}
          {request?.status === "approved" && (
            <Callout role="status" tone="ok" icon={<CheckCircle size={22} strokeWidth={2.2} />} title={`Approved by IAHV ${day(request.reviewedAt)}`}>
              <span>Your Journey student fee is updated. Continue with Step 4.</span>
            </Callout>
          )}
          {request?.status === "needs_info" && (
            <Callout role="status" tone="danger" icon={<Warning size={22} />} title="IAHV needs more information">
              <span>{request.reviewNote}</span>
              <span>Update the request below and submit it again.</span>
            </Callout>
          )}
          {!locked && !course.journeyCourseId && (
            <Callout tone="warn" icon={<Warning size={22} />} title="Add your Journey course ID">
              <span>You can submit now, but IAHV can only approve once the course is posted on Journey with its ID.</span>
              <Link href={`/organizer/courses/${course.id}#step-2`} className="font-semibold">
                Add it in Step 2
              </Link>
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
                <Link href={`/organizer/courses/${course.id}/details`} className="text-sm font-semibold">Edit</Link>
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
              <TextField
                id="f-amount"
                name="totalFunding"
                inputMode="decimal"
                label="Total funding available ($)"
                defaultValue={request?.totalFunding ?? ""}
              />
              <TextField id="f-count" name="estParticipants" inputMode="numeric" label="Estimated participants" defaultValue={course.estParticipants ?? ""} />
              <TextField id="f-needed" name="neededBy" type="date" label="Needed by" defaultValue={request?.neededBy ?? ""} />
            </div>
            <StudentFeeChoice initialPaysPart={(request?.studentFee ?? 0) > 0} initialFee={request?.studentFee ?? 0} />
            <TextArea
              id="f-prior"
              name="priorFundingNote"
              defaultValue={request?.priorFundingNote ?? ""}
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
            <DocumentUpload
              courseId={course.id}
              kind="proof_of_funds"
              name="proofOfFundsIds"
              initial={proofOfFunds}
              hint="Must show: funding organization, approved amount, that it's for a SKY Campus course, and written approval"
            />
          </Card>

          <AgreementChoice initial={course.funding?.agreement ?? "yes"} />
        </FundingForm>
      </StepLayout>
    </>
  );
}
