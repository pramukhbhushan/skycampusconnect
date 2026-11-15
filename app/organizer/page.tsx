import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChatBubble, Plus } from "@/components/icons";
import { ProgressSegments, StatusPill } from "@/components/ui";
import { formatRange } from "@/lib/dates";
import { getCurrentOrganizer, getOrganizerCourses } from "@/lib/mock-data";
import { COURSE_TYPE_LABEL } from "@/lib/pricing";
import { STEP_NAMES, currentStep, describeSteps, doneCount } from "@/lib/steps";

export const metadata: Metadata = { title: "My courses" };

const chatChip =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-field bg-white px-4 text-[15px] font-semibold text-brand-dark no-underline";

const LEGEND = [
  { label: "Done", className: "bg-brand" },
  { label: "In progress", className: "bg-brand-light" },
  { label: "Waiting on IAHV / action due", className: "bg-amber" },
  { label: "To do", className: "bg-line-2" },
  { label: "Skipped", className: "bg-white border border-dashed border-skip" },
];

const GUIDES = [
  { title: "Finance guidelines for SKY Campus", desc: "Funding, quotes, invoices and pricing" },
  { title: "Course accounting walkthrough", desc: "Video: entering your invoice # in Journey" },
  { title: "Orientation call guide", desc: "Confirm students can commit to all 3 days" },
];

export default function OrganizerHome() {
  const me = getCurrentOrganizer();
  const myCourses = getOrganizerCourses(me.id);
  const firstName = me.name.split(" ")[0];

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-10 px-8 pt-10 pb-16">
      {/* Assistant */}
      <section aria-labelledby="talk-title" className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="flex flex-col gap-1.5 px-8 pt-8 pb-2">
          <h1 id="talk-title" className="text-[34px] font-bold tracking-[-0.01em]">
            Hi {firstName}, what are we working on today?
          </h1>
          <p className="text-base text-muted">
            Talk through your plans and I&apos;ll take you to the right step, with the forms already filled in where I can.
          </p>
        </div>
        <div className="flex flex-col gap-3.5 px-8 py-5">
          <div className="flex max-w-[820px] items-start gap-3">
            <span aria-hidden="true" className="flex size-[34px] flex-none items-center justify-center rounded-full bg-brand-bright text-white">
              <ChatBubble size={16} />
            </span>
            {/* TODO(backend): generate this summary from the organizer's open steps. */}
            <div className="rounded-[4px_16px_16px_16px] bg-tint px-[18px] py-3.5 text-base leading-[1.55]">
              Your <strong>UMD Spring Retreat</strong> is waiting on IAHV Finance to approve funding (sent 2 days ago, usually
              1–2 business days). Your <strong>Fall Premium Retreat</strong> ended last week: it still needs the invoice
              number entered in Journey so it can be closed.
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pl-[46px]">
            <Link href="/organizer/courses/new" className={chatChip}>
              <Plus size={16} />
              Plan a new retreat
            </Link>
            <Link href="/organizer/courses/umd-spring-2027/funding" className={chatChip}>Check my funding request</Link>
            <Link href="/organizer/courses/umd-spring-2027/invoice" className={chatChip}>Start my invoice request</Link>
            <a href="#help" className={chatChip}>How do I close a course?</a>
          </div>
        </div>
        <form className="flex gap-2.5 px-8 pt-[18px] pb-7">
          <label htmlFor="org-chat" className="sr-only">Message the course planning assistant</label>
          <input
            id="org-chat"
            type="text"
            placeholder="e.g. “I want to run a SKY retreat at Purdue in April for about 20 students”"
            className="min-h-[54px] min-w-0 flex-1 rounded-2xl border border-field bg-white px-5 text-base text-ink"
          />
          <button
            type="button"
            aria-label="Send message"
            className="flex size-[54px] flex-none cursor-pointer items-center justify-center rounded-2xl bg-brand text-white"
          >
            <ArrowRight size={20} />
          </button>
        </form>
      </section>

      {/* Courses */}
      <section aria-labelledby="courses-title" className="flex flex-col gap-[18px]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="courses-title" className="text-[26px] font-bold">My courses</h2>
            <p className="text-[15px] text-muted">Each bar shows the 8 steps, from campus requirements to closure.</p>
          </div>
          <Link
            href="/organizer/courses/new"
            className="inline-flex min-h-[46px] items-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-white no-underline hover:text-white"
          >
            <Plus size={16} strokeWidth={2.4} />
            Start a new course
          </Link>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-[18px]">
          {myCourses.map(({ course, card }) => {
            const step = currentStep(course.steps);
            return (
              <article key={course.id} className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-[13px] font-semibold text-muted">
                      {course.type ? `${COURSE_TYPE_LABEL[course.type]} · ${course.format === "online" ? "Online" : "In person"}` : "Draft"}
                    </span>
                    <h3 className="text-[19px] leading-[1.3] font-bold">{course.name}</h3>
                  </div>
                  <StatusPill tone={card.tone} className="flex-none">{card.statusLabel}</StatusPill>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  <div>
                    <dt className="text-muted">Campus</dt>
                    <dd className="mt-0.5 font-semibold">{course.university ?? "Not set yet"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Dates</dt>
                    <dd className="mt-0.5 font-semibold">{formatRange(course.startDate, course.endDate)}</dd>
                  </div>
                </dl>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-[13px] font-semibold">
                    <span>Step {step} of 8 · {step === 1 && !course.type ? "Course details" : STEP_NAMES[step - 1]}</span>
                    <span className="text-muted">{doneCount(course.steps)} done</span>
                  </div>
                  <ProgressSegments steps={course.steps} label={describeSteps(course.steps)} />
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-surface px-3.5 py-3">
                  <span className="text-xs font-bold tracking-[0.06em] text-muted uppercase">Next</span>
                  <span className="text-[15px] leading-[1.45]">{card.next}</span>
                </div>
                <Link
                  href={card.cta.href}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-field text-[15px] font-semibold text-brand-dark no-underline hover:bg-surface"
                >
                  {card.cta.label}
                </Link>
              </article>
            );
          })}
        </div>

        <div aria-label="Progress bar key" className="flex flex-wrap gap-[18px] text-[13px] text-ink-soft">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-3.5 rounded ${l.className}`} />
              {l.label}
            </span>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section id="help" aria-labelledby="help-title" className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <h2 id="help-title" className="sr-only">Guides</h2>
        {GUIDES.map((g) => (
          <a key={g.title} href="#help" className="flex flex-col gap-1 rounded-2xl border border-line bg-white px-5 py-[18px] text-ink no-underline hover:text-ink">
            <span className="text-base font-bold">{g.title}</span>
            <span className="text-sm text-muted">{g.desc}</span>
          </a>
        ))}
      </section>
    </main>
  );
}
