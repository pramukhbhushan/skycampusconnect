"use client";

import { useActionState, useState } from "react";
import { CourseHeader, StepLayout } from "@/components/course-stepper";
import { ArrowRight, InfoCircle } from "@/components/icons";
import { Button, ButtonLink, Card, Chip, Eyebrow, OptionCard, Segmented, SideCard, TextField } from "@/components/ui";
import { REQUIREMENTS, needsFundingApproval } from "@/lib/organizer/course-form";
import { BASE_PRICE, INCLUDED_STUDENTS, computeFee, money } from "@/lib/pricing";
import type { CourseFormat, CourseType, Funder, StepStatus } from "@/lib/types";
import { saveCourseForm, type CourseFormState } from "../actions";

export type CourseDetailsInput = {
  name: string;
  type: CourseType | null;
  format: CourseFormat;
  startDate: string; // yyyy-mm-dd or ""
  endDate: string;
  university: string;
  teachers: string;
  estParticipants: number | null;
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


function FieldError({ message }: { message?: string }) {
  return message ? <p role="alert" className="-mt-1 text-sm font-semibold text-danger-text">{message}</p> : null;
}

/** Step 1 form. Saves through saveCourseForm (creates the course, or updates `courseId`). */
export function CourseDetailsForm({
  courseId,
  initial,
  requirements,
}: {
  courseId?: string;
  initial: CourseDetailsInput;
  requirements: boolean[];
}) {
  const [state, formAction, pending] = useActionState<CourseFormState, FormData>(saveCourseForm, {});
  const errors = state.errors ?? {};
  const [type, setType] = useState<CourseType | null>(initial.type);
  const [format, setFormat] = useState(initial.format);
  const [funders, setFunders] = useState<Set<Funder>>(new Set(initial.funders));
  const [participants, setParticipants] = useState(initial.estParticipants ?? 0);

  const needsFunding = needsFundingApproval([...funders]);
  const fee = computeFee(type ?? "happiness", participants);
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
      <CourseHeader
        title={courseId ? initial.name || "Untitled retreat" : "New retreat"}
        steps={steps}
        aside={<span className="text-sm text-muted">{courseId ? "Draft saved" : "Not saved yet"}</span>}
      />

      <StepLayout
        aside={
          <>
            <SideCard title="Estimated course fee">
              <p className="text-[34px] font-bold text-brand-dark">{money(fee.subtotal, false)}</p>
              <p className="text-sm leading-normal text-muted">
                {money(BASE_PRICE[type ?? "happiness"], false)} base for {INCLUDED_STUDENTS} students + {fee.extraStudents} extra × $100.
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
        <form action={formAction} className="contents" noValidate>
          {courseId && <input type="hidden" name="courseId" value={courseId} />}
          {type && <input type="hidden" name="type" value={type} />}
          <input type="hidden" name="format" value={format} />
          {[...funders].map((f) => (
            <input key={f} type="hidden" name="funders" value={f} />
          ))}

          {errors.form && (
            <p role="alert" className="rounded-xl border border-danger-text bg-white p-4 text-sm font-semibold text-danger-text">
              {errors.form}
            </p>
          )}

          <Card className="gap-[22px]">
            <div className="flex flex-col gap-1">
              <Eyebrow>Step 1 of 8</Eyebrow>
              <h2 className="text-2xl font-bold">Tell us about your course</h2>
              <p className="text-[15px] text-muted">
                You&apos;ll only enter this once. It fills in your funding, quote and invoice forms later.
              </p>
            </div>

            <TextField id="c-name" name="name" label="Course name" defaultValue={initial.name} required aria-invalid={!!errors.name} />
            <FieldError message={errors.name} />

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
              <FieldError message={errors.type} />
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
              <TextField id="c-start" name="startDate" type="date" label="Start date" defaultValue={initial.startDate} aria-invalid={!!errors.startDate} />
              <TextField id="c-end" name="endDate" type="date" label="End date" defaultValue={initial.endDate} aria-invalid={!!errors.endDate} />
            </div>
            <FieldError message={errors.startDate ?? errors.endDate} />

            <TextField
              id="c-uni"
              name="university"
              aria-invalid={!!errors.university}
              label="University or college (full name)"
              defaultValue={initial.university}
              hint="Spell it out, e.g. “George Washington University”, not “GW”."
            />
            <FieldError message={errors.university} />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              <TextField id="c-teachers" name="teachers" label="Teacher(s)" placeholder="Names of SKY teachers" defaultValue={initial.teachers} />
              <TextField
                id="c-count"
                name="estParticipants"
                label="Estimated participants"
                aria-invalid={!!errors.estParticipants}
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
              />
            </div>
            <FieldError message={errors.estParticipants ?? errors.teachers} />

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-semibold">Who is paying for the course?</legend>
              <div className="flex flex-wrap gap-2.5">
                {FUNDERS.map((f) => (
                  <Chip key={f.id} selected={funders.has(f.id)} onClick={() => toggleFunder(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
              <FieldError message={errors.funders} />
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
              {REQUIREMENTS.map((r, i) => (
                <label key={r.title} className="flex cursor-pointer items-start gap-3.5 rounded-[14px] border border-line p-4">
                  <input type="checkbox" name={`requirement${i}`} defaultChecked={requirements[i] ?? false} className="mt-0.5 size-5 accent-brand" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold">{r.title}</span>
                    <span className="text-sm text-muted">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex flex-wrap justify-between gap-3">
            <Button type="submit" name="intent" value="draft" variant="secondary" className="px-[22px]" disabled={pending}>
              Save draft
            </Button>
            <Button type="submit" name="intent" value="continue" disabled={pending}>
              {pending ? "Saving…" : "Save & continue"} <ArrowRight />
            </Button>
          </div>
        </form>
      </StepLayout>
    </>
  );
}
