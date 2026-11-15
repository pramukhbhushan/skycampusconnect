"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ArrowRight } from "@/components/icons";
import { Button, ButtonLink, Card, ChipGroup, TextField } from "@/components/ui";
import type { AgreementStatus } from "@/lib/types";
import { saveFundingForm, type FundingFormState } from "../../funding-actions";

const ROUTE_TEXT: Record<AgreementStatus, string> = {
  yes: "Agreement signed, so Step 4 will go straight to the invoice request.",
  no: "No agreement yet, so Step 4 starts with a quote request. The invoice unlocks once the agreement is signed.",
  in_progress: "Agreement in progress, so Step 4 starts with a quote request. The invoice unlocks once it is signed.",
};

export function StudentFeeChoice({ initialPaysPart, initialFee }: { initialPaysPart: boolean; initialFee: number }) {
  const [pay, setPay] = useState<"no" | "yes">(initialPaysPart ? "yes" : "no");
  return (
    <fieldset className="flex flex-col gap-3">
      <input type="hidden" name="studentsPayPart" value={pay} />
      <legend className="mb-2.5 text-sm font-semibold">Will students pay any part of the fee?</legend>
      <div className="flex flex-wrap items-center gap-2.5">
        <ChipGroup
          options={[
            { id: "no", label: "No" },
            { id: "yes", label: "Yes, partly" },
          ]}
          value={pay}
          onChange={setPay}
        />
        <span className="text-[15px] text-ink-soft">
          → Student fee on Journey: <strong>{pay === "no" ? "$0" : "set the amount"}</strong>
        </span>
      </div>
      {pay === "yes" && (
        <TextField
          id="f-student-fee"
          name="studentFee"
          inputMode="decimal"
          label="Student fee on Journey (per student, $)"
          defaultValue={initialFee > 0 ? String(initialFee) : ""}
          className="max-w-[260px]"
        />
      )}
    </fieldset>
  );
}

export function AgreementChoice({ initial }: { initial: AgreementStatus }) {
  const [agree, setAgree] = useState<AgreementStatus>(initial);
  return (
    <Card>
      <input type="hidden" name="agreement" value={agree} />
      <h2 className="text-xl font-bold">What happens after approval</h2>
      <fieldset>
        <legend className="mb-2.5 text-sm font-semibold">
          Has a formal agreement (contract, MOU, PO) been signed with the university?
        </legend>
        <div className="flex flex-wrap gap-2.5">
          <ChipGroup
            options={[
              { id: "yes", label: "Yes" },
              { id: "in_progress", label: "In progress" },
              { id: "no", label: "No" },
            ]}
            value={agree}
            onChange={setAgree}
          />
        </div>
      </fieldset>
      <p className="flex items-start gap-2.5 rounded-xl bg-tint px-3.5 py-3 text-[15px] leading-normal text-info-text">
        <ArrowRight className="mt-0.5 flex-none text-brand" />
        <span>{ROUTE_TEXT[agree]}</span>
      </p>
    </Card>
  );
}

const FIELD_LABEL: Record<string, string> = {
  totalFunding: "Total funding available",
  estParticipants: "Estimated participants",
  neededBy: "Needed by",
  studentFee: "Student fee",
  priorFundingNote: "Unused funding note",
  agreement: "Agreement",
  proofOfFunds: "Proof of funds",
};

/**
 * Wraps the step 3 page's fields in a form that posts to saveFundingForm.
 * `locked` (request is with IAHV or approved) disables every field and hides the buttons.
 */
export function FundingForm({ courseId, locked, children }: { courseId: string; locked: boolean; children: ReactNode }) {
  const [state, formAction, pending] = useActionState<FundingFormState, FormData>(saveFundingForm, {});
  const entries = Object.entries(state.errors ?? {});

  return (
    <form action={formAction} className="contents" noValidate>
      <input type="hidden" name="courseId" value={courseId} />
      {entries.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 rounded-xl border border-danger-text bg-white p-4 text-sm font-semibold text-danger-text">
          {entries.map(([key, message]) => (
            <li key={key}>{key === "form" ? message : `${FIELD_LABEL[key] ?? key}: ${message}`}</li>
          ))}
        </ul>
      )}
      <fieldset disabled={locked || pending} className="contents">
        {children}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3">
        <ButtonLink href={`/organizer/courses/${courseId}`} variant="secondary" className="px-[22px]">← All steps</ButtonLink>
        {!locked && (
          <div className="flex flex-wrap gap-3">
            <Button type="submit" name="intent" value="draft" variant="secondary" className="px-[22px]" disabled={pending}>
              Save draft
            </Button>
            <Button type="submit" name="intent" value="submit" disabled={pending}>
              {pending ? "Sending…" : "Submit to IAHV"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
