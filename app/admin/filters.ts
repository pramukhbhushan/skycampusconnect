// Dashboard filters live in the URL (B-1.2), so a filtered view can be bookmarked or shared:
//   /admin?queue=follow&campus=Purdue%20University&step=4&country=US&q=retreat
import { NO_FILTERS, type AdminFilters, type Country } from "@/lib/data/admin";
import type { AdminQueue } from "@/lib/types";

type RawParams = Record<string, string | string[] | undefined>;

const QUEUES: (AdminQueue | "all")[] = ["all", "funding", "quote", "invoice", "payment", "follow", "none"];
const COUNTRIES: Country[] = ["US", "CA"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

/** Reads filters from search params, ignoring anything invalid. */
export function parseAdminFilters(params: RawParams): AdminFilters {
  const queue = first(params.queue) as AdminQueue | "all";
  const country = first(params.country).toUpperCase() as Country;
  const step = Number(first(params.step));
  const campus = first(params.campus);
  return {
    queue: QUEUES.includes(queue) ? queue : "all",
    campus: campus ? campus.slice(0, 200) : null,
    step: Number.isInteger(step) && step >= 1 && step <= 8 ? step : null,
    country: COUNTRIES.includes(country) ? country : null,
    q: first(params.q).slice(0, 100),
  };
}

/** Search-param string with only the filters that differ from the defaults. */
export function filtersToQuery(f: AdminFilters): string {
  const p = new URLSearchParams();
  if (f.queue !== "all") p.set("queue", f.queue);
  if (f.campus) p.set("campus", f.campus);
  if (f.step) p.set("step", String(f.step));
  if (f.country) p.set("country", f.country);
  if (f.q.trim()) p.set("q", f.q.trim());
  return p.toString();
}

export function adminHref(f: AdminFilters): string {
  const qs = filtersToQuery(f);
  return qs ? `/admin?${qs}` : "/admin";
}

export function hasFilters(f: AdminFilters): boolean {
  return filtersToQuery({ ...f, queue: NO_FILTERS.queue }) !== "";
}
