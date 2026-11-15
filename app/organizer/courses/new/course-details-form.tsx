"use client";

import { useState } from "react";
import { CourseHeader, StepLayout } from "@/components/course-stepper";
import { ArrowRight, InfoCircle } from "@/components/icons";
import { ButtonLink, Card, Chip, Eyebrow, OptionCard, Segmented, SideCard, TextField } from "@/components/ui";
import { BASE_PRICE, INCLUDED_STUDENTS, computeFee, money } from "@/lib/pricing";
import type { CourseFormat, CourseType, Funder, StepStatus } from "@/lib/types";

export type CourseDetailsInput = {
  name: string;
  type: CourseType;
  format: CourseFormat;
  startDate: string;
  endDate: string;
  university: string;
  teachers: string;
  estParticipants: number;
  funders: Funder[];
};

const TYPES: { id: CourseType; label: string; desc: string }[] = [
  { id: "happiness", label: "SKY Happiness Retreat", desc: "$500 for up to 10 students, +$100 each after" },
  { id: "premium", label: "SKY Premium Retreat", desc: "SKY Happiness + Sahaj Samadhi. $1,000 for up to 10, +$100 each after" },
];

const FUNDERS: { id: Funder; label: string }[] = [
  { id: "students", label: "Students pay" },
  { id: "university", label: "University" },
  { id: "sponsor", label: "Corporate sponsor" },
  { id: "donor", label: "Individual donor" },
];

const REQUIREMENTS = [
  { title: "Event request submitted to my university", hint: "Some campuses need this 2+ weeks ahead (e.g. Purdue).", done: true },
  { title: "Room booked for all three days", hint: "Friday and Saturday sessions are required to complete the course.", done: false },
  { title: "Campus funding application submitted", hint: "Only if your school, a sponsor or donor is paying.", done: false },
];

// TODO(backend): persist with a server action (insert into `courses`, seed `course_steps`).
export function CourseDetailsForm({ initial }: { initial: CourseDetailsInput }) {
  const [type, setType] = useState(initial.type);
  const [format, setFormat] = useState(initial.format);
  const [funders, setFunders] = useState<Set<Funder>>(new Set(initial.funders));
  const [participants, setParticipants] = useState(initial.estParticipants);

  const needsFunding = funders.has("university") || funders.has("sponsor") || funders.has("donor");
  const fee = computeFee(type, participants);
  const steps: StepStatus[] = ["in_progress", "todo", needsFunding ? "todo" : "skipped", "todo", "todo", "todo", "todo", "todo"];

  const toggleFunder = (f: Funder) =>
    setFunders((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <>
      <CourseHeader title="New retreat" steps={steps} aside={<span className="text-sm text-muted">Draft · saved just now</span>} />

      <StepLayout
        aside={
          <>
            <SideCard title="Estimated course fee">
              <p className="text-[34px] font-bold text-brand-dark">{money(fee.subtotal, false)}</p>
              <p className="text-sm leading-normal text-muted">
                {money(BASE_PRICE[type], false)} base for {INCLUDED_STUDENTS} students + {fee.extraStudents} extra × $100.
                Updates when your sign-ups change.
              </p>
            </SideCard>
            <SideCard title="Need a hand?" tinted>
              <p className="text-sm leading-normal text-info-text">
                Ask the assistant anything about this step, like “what counts as proof of funding?”
              </p>
              <ButtonLink
                href="/organizer"
                variant="outline"
                className="min-h-11 self-start rounded-full border-0 px-4 text-sm"
              >
                Ask a question
              </ButtonLink>
            </SideCard>
          </>
        }
      >
        <form className="contents">
          <Card className="gap-[22px]">
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 1 of 8</Eyebrow>
              <h2 className="text-2xl font-bold">Tell us about your course</h2>
              <p className="text-[15px] text-muted">
                You&apos;ll only enter this once. It fills in your funding, quote and invoice forms later.
              </p>
            </div>

            <TextField id="c-name" label="Course name" defaultValue={initial.name} />

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-semibold">Course type</legend>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                {TYPES.map((t) => (
                  <OptionCard key={t.id} selected={t.id === type} onClick={() => setType(t.id)} className="min-h-[92px]">
                    <span className="text-base font-bold">{t.label}</span>
                    <span className="text-sm leading-[1.45] text-muted">{t.desc}</span>
                  </OptionCard>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">Format</legend>
                <Segmented
                  options={[
                    { id: "in_person", label: "In person" },
                    { id: "online", label: "Online" },
                  ]}
                  value={format}
                  onChange={setFormat}
                />
              </fieldset>
              <TextField id="c-start" label="Start date" defaultValue={initial.startDate} />
              <TextField id="c-end" label="End date" defaultValue={initial.endDate} />
            </div>

            <TextField
              id="c-uni"
              label="University or college (full name)"
              defaultValue={initial.university}
              hint="Spell it out, e.g. “George Washington University”, not “GW”."
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              <TextField id="c-teachers" label="Teacher(s)" placeholder="Names of SKY teachers" defaultValue={initial.teachers} />
              <TextField
                id="c-count"
                label="Estimated participants"
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
              />
            </div>

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-semibold">Who is paying for the course?</legend>
              <div className="flex flex-wrap gap-2.5">
                {FUNDERS.map((f) => (
                  <Chip key={f.id} selected={funders.has(f.id)} onClick={() => toggleFunder(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
              {needsFunding ? (
                <p className="mt-1.5 flex items-start gap-2.5 rounded-xl bg-tint px-3.5 py-3 text-sm leading-normal text-info-text">
                  <InfoCircle className="mt-px flex-none text-brand" />
                  <span>
                    Because someone other than students is paying, we&apos;ve added <strong>Step 3 · Funding approval</strong> to
                    your plan.
                  </span>
                </p>
              ) : (
                <p className="mt-1.5 rounded-xl bg-surface px-3.5 py-3 text-sm leading-normal text-ink-soft">
                  Students pay on Journey, so Step 3 · Funding approval will be skipped.
                </p>
              )}
            </fieldset>
          </Card>

          <Card className="gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-[22px] font-bold">Campus requirements</h2>
              <p className="text-[15px] text-muted">Every university has its own rules and deadlines. Tick these off as you go.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {REQUIREMENTS.map((r) => (
                <label key={r.title} className="flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-line p-4">
                  <input type="checkbox" defaultChecked={r.done} className="mt-0.5 size-5 accent-brand" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold">{r.title}</span>
                    <span className="text-sm text-muted">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap justify-between gap-3">
            <ButtonLink href="/organizer" variant="secondary" className="px-[22px]">Save draft</ButtonLink>
            <ButtonLink href="/organizer/courses/umd-spring-2027/funding">
              Save &amp; continue <ArrowRight />
            </ButtonLink>
          </div>
        </form>
      </StepLayout>
    </>
  );
}
