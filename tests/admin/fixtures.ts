// The admin sample courses as they would come back from Supabase (admin-db.ts), so the
// admin data tests run without a database. Same courses and facts as before B-1.1.
import type { AdminCourse } from "@/lib/data/admin-db";
import { courses } from "@/lib/data/courses";
import { organizers } from "@/lib/data/organizer";

const facts: Record<string, AdminCourse["facts"] & { country: AdminCourse["country"] }> = {
  "umd-spring-2027": { country: "US", funding: { status: "submitted", neededBy: "2026-11-26" }, quote: null, invoice: null },
  "purdue-winter-2027": {
    country: "US", funding: null, quote: null,
    invoice: { status: "requested", number: null, amount: 900, requestedOn: "2026-11-10", dueDate: "2027-02-21", accountingSubmitted: false },
  },
  "ucla-spring-2027": {
    country: "US", funding: { status: "approved", neededBy: "2026-11-20" },
    quote: { status: "requested", number: null, requestedOn: "2026-11-06", amount: 1300 }, invoice: null,
  },
  "gwu-fall-2026": {
    country: "US", funding: { status: "approved", neededBy: "2026-09-30" }, quote: null,
    invoice: { status: "accounting_submitted", number: "INV-24790", amount: 700, requestedOn: "2026-09-28", dueDate: "2026-11-30", accountingSubmitted: true },
  },
  "umd-fall-2026": {
    country: "US", funding: null, quote: null,
    invoice: { status: "sent_to_client", number: "INV-24817", amount: 1400, requestedOn: "2026-10-14", dueDate: "2026-12-08", accountingSubmitted: false },
  },
  "rutgers-fall-2026": {
    country: "US", funding: { status: "approved", neededBy: "2026-09-01" }, quote: null,
    invoice: { status: "accounting_submitted", number: "INV-24755", amount: 1100, requestedOn: "2026-09-10", dueDate: "2026-11-01", accountingSubmitted: true },
  },
  "ut-austin-fall-2026": { country: "US", funding: null, quote: null, invoice: null },
  "toronto-winter-2026": { country: "CA", funding: null, quote: null, invoice: null },
};

export const ADMIN_COURSES: AdminCourse[] = Object.entries(facts).map(([id, { country, ...f }]) => {
  const course = courses.find((c) => c.id === id)!;
  return { course, organizer: organizers.find((o) => o.id === course.organizerId)!, country, facts: f };
});
