import Link from "next/link";
import type { ReactNode } from "react";
import { STEP_NAMES, STEP_STATUS_LABEL } from "@/lib/steps";
import type { StepStatus } from "@/lib/types";
import { cx } from "./ui";

const BAR: Record<StepStatus, string> = {
  done: "bg-brand",
  in_progress: "bg-brand-light",
  waiting: "bg-amber",
  todo: "bg-line-2",
  skipped: "bg-white border border-dashed border-skip",
};

/** The full 8-step progress header shown on course pages. */
export function CourseStepper({ steps }: { steps: StepStatus[] }) {
  return (
    <nav aria-label="Course progress">
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2.5">
        {STEP_NAMES.map((label, i) => {
          const s = steps[i];
          const active = s === "in_progress" || s === "waiting";
          return (
            <li key={label} aria-current={active ? "step" : undefined} className="flex flex-col gap-2">
              <span className={cx("block h-2 rounded", BAR[s])} />
              <span className="flex items-center gap-2">
                <span
                  className={cx(
                    "flex size-6 flex-none items-center justify-center rounded-full text-xs font-bold",
                    active ? "bg-brand text-white" : s === "done" ? "bg-tint text-brand-dark" : "bg-dot text-muted",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cx("text-[13px] leading-tight", active ? "font-bold text-ink" : "font-semibold text-ink-soft")}>
                  {label}
                </span>
              </span>
              <span className="pl-8 text-xs text-muted">{STEP_STATUS_LABEL[s]}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** White band under the app header with the back link, course title and stepper. */
export function CourseHeader({
  title,
  subtitle,
  aside,
  steps,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  steps: StepStatus[];
}) {
  return (
    <div className="border-b border-line-2 bg-white">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-[22px] px-8 pt-6 pb-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link href="/organizer" className="text-sm font-semibold no-underline">
              ← My courses
            </Link>
            <h1 className="text-[28px] font-bold">{title}</h1>
            {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
          </div>
          {aside}
        </div>
        <CourseStepper steps={steps} />
      </div>
    </div>
  );
}

/** Two-column body used by step pages: form on the left, help on the right. */
export function StepLayout({ children, aside }: { children: ReactNode; aside: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-7 px-8 pt-8 pb-12">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">{children}</div>
      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">{aside}</aside>
    </main>
  );
}
