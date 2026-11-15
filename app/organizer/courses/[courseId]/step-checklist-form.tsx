"use client";

import { useActionState } from "react";
import { Button, TextField } from "@/components/ui";
import { CHECKLISTS, type ChecklistStep } from "@/lib/organizer/step-checklists";
import { saveStepForm, type StepFormState } from "../actions";

/** Checklist for step 2, 5 or 6. Saves in place through saveStepForm. */
export function StepChecklistForm({
  courseId,
  step,
  checks,
  value,
}: {
  courseId: string;
  step: ChecklistStep;
  checks: boolean[];
  value: string;
}) {
  const [state, formAction, pending] = useActionState<StepFormState, FormData>(saveStepForm, {});
  const { items, field } = CHECKLISTS[step];
  const fieldError = field && state.errors?.[field.key];

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="stepNo" value={step} />
      {items.map((item, i) => (
        <label key={item} className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-line p-3.5">
          <input type="checkbox" name={`check${i}`} defaultChecked={checks[i]} className="mt-0.5 size-5 accent-brand" />
          <span className="text-[15px] font-semibold">{item}</span>
        </label>
      ))}
      {field && (
        <>
          <TextField
            id={`step${step}-value`}
            name="value"
            label={field.label}
            hint={field.hint}
            inputMode={field.numeric ? "numeric" : undefined}
            defaultValue={value}
            aria-invalid={!!fieldError}
          />
          {fieldError && <p role="alert" className="-mt-1 text-sm font-semibold text-danger-text">{fieldError}</p>}
        </>
      )}
      {state.errors?.form && <p role="alert" className="text-sm font-semibold text-danger-text">{state.errors.form}</p>}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending} className="min-h-11 px-5">
          {pending ? "Saving…" : "Save"}
        </Button>
        {state.saved && !pending && <span role="status" className="text-sm text-muted">Saved</span>}
      </div>
    </form>
  );
}
