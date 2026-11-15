"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cx } from "@/components/ui";
import type { AdminFilters, Country } from "@/lib/data/admin";
import { STEP_NAMES } from "@/lib/steps";
import { adminHref, hasFilters } from "./filters";

const selectClass = "min-h-11 rounded-[10px] border border-field bg-white px-3 text-[15px] text-ink";

/** Each change rewrites the URL; the server re-renders the table with the new filters. */
export function FilterBar({ filters, campuses }: { filters: AdminFilters; campuses: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  const go = (next: Partial<AdminFilters>) =>
    startTransition(() => router.replace(adminHref({ ...filters, ...next }), { scroll: false }));

  // Search updates the URL after the user stops typing.
  useEffect(() => {
    if (search.trim() === filters.q.trim()) return;
    const t = setTimeout(() => go({ q: search }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` closes over the latest filters
  }, [search, filters.q]);

  return (
    <div className={cx("flex flex-wrap items-end gap-3 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
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
        <select
          id="a-campus"
          value={filters.campus ?? ""}
          onChange={(e) => go({ campus: e.target.value || null })}
          className={selectClass}
        >
          <option value="">All campuses</option>
          {campuses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="a-step" className="text-[13px] font-semibold">Step</label>
        <select
          id="a-step"
          value={filters.step ?? ""}
          onChange={(e) => go({ step: e.target.value ? Number(e.target.value) : null })}
          className={selectClass}
        >
          <option value="">Any step</option>
          {STEP_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>{i + 1} · {name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="a-country" className="text-[13px] font-semibold">Country</label>
        <select
          id="a-country"
          value={filters.country ?? ""}
          onChange={(e) => go({ country: (e.target.value || null) as Country | null })}
          className={selectClass}
        >
          <option value="">US &amp; Canada</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
        </select>
      </div>
      {hasFilters(filters) && (
        <Link
          href={adminHref({ queue: filters.queue, campus: null, step: null, country: null, q: "" })}
          scroll={false}
          onClick={() => setSearch("")}
          className="inline-flex min-h-11 items-center px-2 text-sm font-semibold"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
