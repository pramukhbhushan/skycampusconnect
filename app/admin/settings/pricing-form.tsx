"use client";

import { useActionState, useState } from "react";
import { COURSE_TYPE_LABEL, computeFee, money, type PricingConstants } from "@/lib/pricing";
import { pricingAction } from "../actions";
import { FormResult } from "./form-result";

const fieldCls = "min-h-11 w-full rounded-xl border border-field bg-white px-3.5 text-[15px] text-ink";

// B-5.3: edit pricing. The example updates as you type; the server validates on save.
export function PricingForm({ pricing }: { pricing: PricingConstants }) {
  const [state, action, pending] = useActionState(pricingAction, null);
  const [v, setV] = useState({
    happiness: String(pricing.basePrice.happiness),
    premium: String(pricing.basePrice.premium),
    includedStudents: String(pricing.includedStudents),
    extraStudentPrice: String(pricing.extraStudentPrice),
    cardFeePercent: String(Math.round(pricing.cardFeeRate * 10_000) / 100),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((old) => ({ ...old, [k]: e.target.value }));

  const draft: PricingConstants = {
    basePrice: { happiness: Number(v.happiness) || 0, premium: Number(v.premium) || 0 },
    includedStudents: Number(v.includedStudents) || 0,
    extraStudentPrice: Number(v.extraStudentPrice) || 0,
    cardFeeRate: (Number(v.cardFeePercent) || 0) / 100,
  };
  const example = computeFee("happiness", 14, false, draft);

  const fields: { k: keyof typeof v; label: string; prefix?: string; suffix?: string }[] = [
    { k: "happiness", label: COURSE_TYPE_LABEL.happiness, prefix: "$" },
    { k: "premium", label: COURSE_TYPE_LABEL.premium, prefix: "$" },
    { k: "includedStudents", label: "Students included in the base price" },
    { k: "extraStudentPrice", label: "Each extra student", prefix: "$" },
    { k: "cardFeePercent", label: "Card payment fee", suffix: "%" },
  ];

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {fields.map((f) => (
          <div key={f.k} className="flex flex-col gap-1.5">
            <label htmlFor={`p-${f.k}`} className="text-sm font-semibold">
              {f.label}
              {f.prefix && <span className="font-normal text-muted"> ({f.prefix})</span>}
              {f.suffix && <span className="font-normal text-muted"> ({f.suffix})</span>}
            </label>
            <input id={`p-${f.k}`} name={f.k} inputMode="decimal" value={v[f.k]} onChange={set(f.k)} className={fieldCls} />
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-tint px-3.5 py-3 text-sm text-info-text">
        Example: a SKY Happiness Retreat with 14 students costs {money(example.total)} ({money(example.base, false)} base +{" "}
        {example.extraStudents} extra × {money(draft.extraStudentPrice, false)}).
      </p>
      <FormResult state={state} />
      <button disabled={pending} className="min-h-11 cursor-pointer self-start rounded-xl bg-brand px-5 font-semibold text-white disabled:cursor-wait disabled:opacity-60">
        {pending ? "Saving…" : "Save pricing"}
      </button>
    </form>
  );
}
