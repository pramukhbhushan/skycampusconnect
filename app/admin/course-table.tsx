"use client";

import Link from "next/link";
import { useState } from "react";
import { ProgressSegments, StatusPill, cx } from "@/components/ui";
import { remindHref } from "@/lib/admin/links";
import type { AdminDashboardRow } from "@/lib/data/admin";

const actionBase = "inline-flex min-h-10 items-center rounded-[10px] px-3.5 font-semibold whitespace-nowrap no-underline";

// TODO(backend): wire inline actions (approve / enter # / mark paid) to server actions (Sprints 3-6).
export function CourseTable({ rows }: { rows: AdminDashboardRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Only count selections that are still visible under the current filters.
  const selectedCount = rows.filter((r) => selected.has(r.id)).length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {selectedCount > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-ink py-3 pr-4 pl-5 text-white">
          <span className="text-[15px] font-semibold">
            {selectedCount} course{selectedCount === 1 ? "" : "s"} selected
          </span>
          <span className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="min-h-11 cursor-pointer rounded-[10px] border border-[#5b6e94] px-4 text-sm font-semibold text-white"
            >
              Clear
            </button>
            <Link
              href={remindHref(rows.filter((r) => selected.has(r.id)).map((r) => r.id))}
              className="inline-flex min-h-11 items-center rounded-[10px] bg-white px-[18px] text-sm font-bold text-ink no-underline hover:text-ink"
            >
              Email reminder →
            </Link>
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface text-left text-ink-soft">
              <th scope="col" className="w-9 px-4 py-3"><span className="sr-only">Select</span></th>
              <th scope="col" className="px-2 py-3 font-bold">Course &amp; campus</th>
              <th scope="col" className="px-2 py-3 font-bold">Organizer</th>
              <th scope="col" className="px-2 py-3 font-bold">Dates</th>
              <th scope="col" className="px-2 py-3 font-bold">Progress</th>
              <th scope="col" className="px-2 py-3 font-bold">Status</th>
              <th scope="col" className="px-2 py-3 font-bold">Due / waiting</th>
              <th scope="col" className="py-3 pr-4 pl-2 text-right font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line-3 align-middle">
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Select ${r.name}`}
                    className="size-[18px] accent-brand"
                  />
                </td>
                <td className="px-2 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/admin/courses/${r.id}`} className="text-[15px] font-bold text-ink no-underline hover:text-brand hover:underline">
                      {r.name}
                    </Link>
                    <span className="text-muted">{r.campus}</span>
                  </div>
                </td>
                <td className="px-2 py-3.5">{r.organizer}</td>
                <td className="px-2 py-3.5 whitespace-nowrap">{r.dates}</td>
                <td className="px-2 py-3.5">
                  <div className="flex min-w-[150px] flex-col gap-1.5">
                    <ProgressSegments steps={r.steps} size="sm" label={`Step ${r.step} of 8, ${r.stepName}`} />
                    <span className="text-xs text-muted">Step {r.step}/8 · {r.stepName}</span>
                  </div>
                </td>
                <td className="px-2 py-3.5"><StatusPill tone={r.tone} className="py-[5px]">{r.statusLabel}</StatusPill></td>
                <td className="px-2 py-3.5">
                  <span className={r.late ? "font-semibold text-danger-fg" : "text-ink-soft"}>{r.dueLabel}</span>
                  {r.flagged && <span className="block text-xs font-semibold text-danger-fg">Stuck over 10 business days</span>}
                </td>
                <td className="py-3.5 pr-4 pl-2 text-right">
                  <Link
                    href={r.action.href}
                    className={cx(
                      actionBase,
                      r.action.primary ? "bg-brand text-white hover:text-white" : "border border-field text-brand-dark hover:bg-surface",
                    )}
                  >
                    {r.action.label}
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted">No courses match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
