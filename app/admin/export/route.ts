// GET /admin/export?queue=...&campus=... : the dashboard's current view as CSV (B-7.1).
// TODO(backend): check requireUser("iahv_admin") once A-0.3/A-0.5 land.
import type { NextRequest } from "next/server";
import { toCsv } from "@/lib/admin/csv";
import { todayIso } from "@/lib/admin/time";
import { getAdminDashboard } from "@/lib/data/admin";
import { parseAdminFilters } from "../filters";

export function GET(request: NextRequest) {
  const filters = parseAdminFilters(Object.fromEntries(request.nextUrl.searchParams));
  const today = todayIso();
  const { rows } = getAdminDashboard(filters, today);

  const csv = toCsv(
    ["Course", "Campus", "Country", "Organizer", "Organizer email", "Dates", "Step", "Status", "Due / waiting", "Late"],
    rows.map((r) => [r.name, r.campus, r.country, r.organizer, r.organizerEmail, r.dates, `${r.step} · ${r.stepName}`, r.statusLabel, r.dueLabel, r.late ? "yes" : "no"]),
  );

  // The byte-order mark makes Excel read the file as UTF-8 (dashes, accents).
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sky-campus-courses-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
