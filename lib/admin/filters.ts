// Dashboard filter types. Pure, so Client Components can import it. Owner: Engineer B.
import type { AdminQueue } from "@/lib/types";

export type Country = "US" | "CA";

/** Dashboard filters, as read from the URL (see app/admin/filters.ts). */
export type AdminFilters = {
  queue: AdminQueue | "all";
  campus: string | null;
  step: number | null; // 1-8: the step the course is on
  country: Country | null;
  q: string; // search: course, campus or organizer
};

export const NO_FILTERS: AdminFilters = { queue: "all", campus: null, step: null, country: null, q: "" };
