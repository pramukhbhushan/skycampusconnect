import type { Metadata } from "next";
import { getAdminRows } from "@/lib/data/admin";
import { formatRange } from "@/lib/dates";
import { STEP_NAMES, currentStep } from "@/lib/steps";
import { AdminCourses, type AdminRowView } from "./admin-courses";

export const metadata: Metadata = { title: "All courses" };

export default function AdminDashboard() {
  const rows: AdminRowView[] = getAdminRows().map(({ row, course, organizer }) => {
    // Admin rows show the step that needs attention (e.g. invoice still open on step 4).
    const step = Math.min(currentStep(course.steps), 8);
    return {
      id: course.id,
      name: course.name,
      campus: course.university ?? "—",
      organizer: organizer.name,
      dates: formatRange(course.startDate, course.endDate),
      steps: course.steps,
      step,
      stepName: STEP_NAMES[step - 1] === "Sign-ups & orientation" ? "Sign-ups" : STEP_NAMES[step - 1],
      ...row,
    };
  });

  return (
    <main className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 pt-8 pb-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">All SKY Campus courses</h1>
          <p className="text-[15px] text-muted">Every campus, every step. Pick a queue to see what needs you.</p>
        </div>
        <span className="rounded-full border border-dashed border-skip px-3 py-1.5 text-[13px] font-semibold text-muted">
          Sample data
        </span>
      </div>
      <AdminCourses rows={rows} />
    </main>
  );
}
