import type { Metadata } from "next";
import { Suspense } from "react";
import { getAdminDashboard } from "@/lib/data/admin";
import { CourseTable } from "./course-table";
import { FilterBar } from "./filter-bar";
import { parseAdminFilters } from "./filters";
import { QueueTiles } from "./queue-tiles";

export const metadata: Metadata = { title: "All courses" };

export default function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">All SKY Campus courses</h1>
          <p className="text-[15px] text-muted">Every campus, every step. Pick a queue to see what needs you.</p>
        </div>
      </div>
      {/* Filters come from the URL, which is only known per request. */}
      <Suspense fallback={<DashboardLoading />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const filters = parseAdminFilters(await searchParams);
  const { rows, queueCounts, campuses } = await getAdminDashboard(filters);
  return (
    <>
      <QueueTiles filters={filters} counts={queueCounts} />
      <FilterBar filters={filters} campuses={campuses} />
      <CourseTable rows={rows} />
    </>
  );
}

function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading courses" className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="min-h-24 animate-pulse rounded-2xl border border-line bg-white" />
        ))}
      </div>
      <div className="h-[420px] animate-pulse rounded-[18px] border border-line bg-white" />
    </div>
  );
}
