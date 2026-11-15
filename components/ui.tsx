// Shared presentational building blocks used across organizer and admin pages.

import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { SEGMENT_CLASS, TONE_CLASS } from "@/lib/steps";
import type { StepStatus, Tone } from "@/lib/types";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Logo({ variant = "color", className }: { variant?: "color" | "white"; className?: string }) {
  return (
    <Image
      src={variant === "white" ? "/brand/sky-campus-logo-white.png" : "/brand/sky-campus-logo.png"}
      alt="SKY Campus Happiness"
      width={900}
      height={315}
      priority
      className={cx("block w-auto", className)}
    />
  );
}

/** White rounded panel used for every form section. */
export function Card({ className, ...rest }: ComponentProps<"section">) {
  return (
    <section
      className={cx("flex flex-col gap-5 rounded-[20px] border border-line bg-white p-7", className)}
      {...rest}
    />
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-[13px] font-bold tracking-[0.06em] text-brand uppercase">{children}</span>;
}

export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-block rounded-full px-2.5 py-1.5 text-xs font-bold whitespace-nowrap", TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

/** The compact 8-segment progress bar on course cards and admin rows. */
export function ProgressSegments({
  steps,
  label,
  size = "md",
}: {
  steps: StepStatus[];
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <span role="img" aria-label={label} className={cx("grid grid-cols-8", size === "md" ? "gap-1" : "gap-[3px]")}>
      {steps.map((s, i) => (
        <span
          key={i}
          className={cx("block", size === "md" ? "h-2.5 rounded-[5px]" : "h-2 rounded", SEGMENT_CLASS[s])}
        />
      ))}
    </span>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2.5 font-semibold no-underline transition-colors";

const buttonVariants = {
  primary: "bg-brand text-white hover:bg-brand-dark hover:text-white",
  secondary: "border border-field bg-white text-ink hover:text-ink hover:bg-surface",
  outline: "border border-field bg-white text-brand-dark hover:bg-surface",
};

export function ButtonLink({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return <Link className={cx(buttonBase, "min-h-[50px] rounded-xl px-6", buttonVariants[variant], className)} {...rest} />;
}

export function Button({
  variant = "primary",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      type="button"
      className={cx(buttonBase, "min-h-[50px] cursor-pointer rounded-xl px-6", buttonVariants[variant], className)}
      {...rest}
    />
  );
}

/** Labelled text input. */
export function TextField({
  id,
  label,
  hint,
  optional,
  className,
  ...input
}: ComponentProps<"input"> & { id: string; label: ReactNode; hint?: ReactNode; optional?: string }) {
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> ({optional})</span>}
      </label>
      <input
        id={id}
        className={cx(
          "min-h-12 rounded-xl border px-3.5 text-base",
          input.readOnly ? "border-line bg-surface text-muted" : "border-field bg-white text-ink",
        )}
        {...input}
      />
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  );
}

export function TextArea({
  id,
  label,
  optional,
  ...rest
}: ComponentProps<"textarea"> & { id: string; label: ReactNode; optional?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-muted"> ({optional})</span>}
      </label>
      <textarea
        id={id}
        rows={2}
        className="resize-y rounded-xl border border-field px-3.5 py-3 text-base text-ink"
        {...rest}
      />
    </div>
  );
}

/** Pill-shaped toggle buttons (single or multi select). */
export function Chip({
  selected,
  className,
  ...rest
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "min-h-11 cursor-pointer rounded-full border px-4 text-[15px] font-semibold",
        selected ? "border-brand bg-brand text-white" : "border-field bg-white text-brand-dark",
        className,
      )}
      {...rest}
    />
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <Chip key={o.id} selected={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </Chip>
      ))}
    </>
  );
}

/** iOS-style segmented control (e.g. In person / Online, Quote / Invoice). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("flex gap-1 rounded-xl bg-tint p-1", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.id)}
            className={cx(
              "min-h-10 flex-1 cursor-pointer rounded-[9px] px-4 text-[15px]",
              on ? "bg-white font-bold text-brand-dark shadow-[0_1px_3px_rgba(11,31,69,0.15)]" : "font-semibold text-ink-soft",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Large selectable card (course type, login role). */
export function OptionCard({
  selected,
  className,
  ...rest
}: ComponentProps<"button"> & { selected: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cx(
        "flex cursor-pointer flex-col gap-1.5 rounded-[14px] border-2 p-4 text-left text-ink",
        selected ? "border-brand bg-tint" : "border-line bg-white",
        className,
      )}
      {...rest}
    />
  );
}

type CalloutTone = "info" | "warn" | "danger" | "ok";
const calloutClass: Record<CalloutTone, string> = {
  info: "bg-tint text-info-text",
  warn: "border border-warn-border bg-warn-bg text-warn-text",
  danger: "border border-danger-border bg-danger-bg text-danger-text",
  ok: "border border-ok-border bg-ok-bg text-ok-text",
};

export function Callout({
  tone,
  icon,
  title,
  children,
  role,
}: {
  tone: CalloutTone;
  icon: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  role?: string;
}) {
  return (
    <div role={role} className={cx("flex items-start gap-3.5 rounded-2xl px-5 py-[18px]", calloutClass[tone])}>
      <span className="mt-px flex-none">{icon}</span>
      <div className="flex flex-col gap-1 text-[15px] leading-normal">
        {title && <strong className="text-base">{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function SideCard({ title, children, tinted }: { title: string; children: ReactNode; tinted?: boolean }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 rounded-[20px] p-[22px]",
        tinted ? "bg-tint" : "border border-line bg-white",
      )}
    >
      <h2 className="text-[17px] font-bold">{title}</h2>
      {children}
    </div>
  );
}

export function FileRow({ name, meta, action }: { name: string; meta: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-line px-4 py-3.5">
      <span className="flex min-w-0 items-center gap-3">
        <PdfBadge />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-semibold">{name}</span>
          <span className="text-[13px] text-muted">{meta}</span>
        </span>
      </span>
      {action}
    </div>
  );
}

export function PdfBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex size-10 flex-none items-center justify-center rounded-[10px] bg-tint text-[11px] font-bold text-brand-dark",
        className,
      )}
    >
      PDF
    </span>
  );
}
