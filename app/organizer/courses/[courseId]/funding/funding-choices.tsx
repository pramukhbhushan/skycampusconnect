"use client";

import { useState } from "react";
import { ArrowRight } from "@/components/icons";
import { ButtonLink, Card, ChipGroup } from "@/components/ui";
import type { AgreementStatus } from "@/lib/types";

const ROUTE_TEXT: Record<AgreementStatus, string> = {
  yes: "Agreement signed, so Step 4 will go straight to the invoice request.",
  no: "No agreement yet, so Step 4 starts with a quote request. The invoice unlocks once the agreement is signed.",
  in_progress: "Agreement in progress, so Step 4 starts with a quote request. The invoice unlocks once it is signed.",
};

export function StudentFeeChoice({ initialPaysPart }: { initialPaysPart: boolean }) {
  const [pay, setPay] = useState<"no" | "yes">(initialPaysPart ? "yes" : "no");
  return (
    <fieldset>
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
    </fieldset>
  );
}

export function AgreementChoice({ initial }: { initial: AgreementStatus }) {
  const [agree, setAgree] = useState<AgreementStatus>(initial);
  return (
    <Card>
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


// TODO(backend): submit via a server action that creates/updates `funding_requests`.
export function FundingFooter({ courseId }: { courseId: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3">
      <ButtonLink href="/organizer/courses/new" variant="secondary" className="px-[22px]">← Back</ButtonLink>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/organizer" variant="secondary" className="px-[22px]">Save draft</ButtonLink>
        <ButtonLink href={`/organizer/courses/${courseId}/invoice`}>Submit to IAHV</ButtonLink>
      </div>
    </div>
  );
}
