"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProgressSegments, StatusPill, cx } from "@/components/ui";
import type { AdminCourseRow, AdminQueue, StepStatus } from "@/lib/types";

export type AdminRowView = AdminCourseRow & {
  id: string;
  name: string;
  campus: string;
  organizer: string;
  dates: string;
  steps: StepStatus[];
  step: number;
  stepName: string;
};

const QUEUES: { id: AdminQueue | "all"; label: string }[] = [
  { id: "all", label: "All courses" },
  { id: "funding", label: "Funding approvals" },
  { id: "quote", label: "Quote requests" },
  { id: "invoice", label: "Invoice requests" },
  { id: "payment", label: "Pending payment" },
  { id: "follow", label: "Needs follow-up" },
];

const selectClass = "min-h-11 rounded-[10px] border border-field bg-white px-3 text-[15px] text-ink";
const actionBase = "inline-flex min-h-10 items-center rounded-[10px] px-3.5 font-semibold whitespace-nowrap no-underline";

// TODO(backend): load rows from Supabase with filters applied server-side, and
// wire the inline actions (approve / enter # / mark paid) to server actions.
export function AdminCourses({ rows }: { rows: AdminRowView[] }) {
  const [queue, setQueue] = useState<AdminQueue | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState("all");

  const campuses = useMemo(() => [...new Set(rows.map((r) => r.campus))].sort(), [rows]);

  const visible = rows.filter((r) => {
    if (queue !== "all" && r.queue !== queue) return false;
    if (campus !== "all" && r.campus !== campus) return false;
    const q = search.trim().toLowerCase();
    return !q || [r.name, r.campus, r.organizer].some((v) => v.toLowerCase().includes(q));
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <div role="group" aria-label="Queues" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {QUEUES.map((q) => {
          const on = q.id === queue;
          const count = q.id === "all" ? rows.length : rows.filter((r) => r.queue === q.id).length;
          return (
            <button
              key={q.id}
              type="button"
              aria-pressed={on}
              onClick={() => setQueue(q.id)}
              className={cx(
                "flex min-h-24 cursor-pointer flex-col items-start gap-1.5 rounded-2xl border p-4 text-left",
                on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink",
              )}
            >
              <span
                className={cx(
                  "text-3xl leading-none font-bold",
                  on ? "text-white" : q.id === "follow" ? "text-danger-fg" : "text-brand-dark",
                )}
              >
                {count}
              </span>
              <span className="text-sm leading-[1.3] font-semibold">{q.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_1_260px] flex-col gap-1.5">
          <label htmlFor="a-search" className="text-[13px] font-semibold">Search</label>
          <input
            id="a-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Course, campus or organizer"
            className="min-h-11 rounded-[10px] border border-field bg-white px-3.5 text-[15px] text-ink"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="a-campus" className="text-[13px] font-semibold">Campus</label>
          <select id="a-campus" value={campus} onChange={(e) => setCampus(e.target.value)} className={selectClass}>
            <option value="all">All campuses</option>
            {campuses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="a-step" className="text-[13px] font-semibold">Step</label>
          <select id="a-step" className={selectClass}>
            <option>Any step</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="a-country" className="text-[13px] font-semibold">Country</label>
          <select id="a-country" className={selectClass}>
            <option>US &amp; Canada</option>
          </select>
        </div>
      </div>

      {selected.size > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-ink py-3 pr-4 pl-5 text-white"
        >
          <span className="text-[15px] font-semibold">
            {selected.size} course{selected.size === 1 ? "" : "s"} selected
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
              href="/admin/reminders"
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
            {visible.map((r) => (
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
                    <span className="text-[15px] font-bold">{r.name}</span>
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
                </td>
                <td className="py-3.5 pr-4 pl-2 text-right">
                  <Link
                    href={r.action.href}
                    className={cx(
                      actionBase,
                      r.action.primary
                        ? "bg-brand text-white hover:text-white"
                        : "border border-field text-brand-dark hover:bg-surface",
                    )}
                  >
                    {r.action.label}
                  </Link>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
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
