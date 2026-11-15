// Dates for admin queues (B-3.2): "today", business days, and the due/waiting labels.
// Owner: Engineer B. All dates are ISO yyyy-mm-dd and treated as calendar days.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** IAHV's target: requests are handled in 2-4 business days (plan-v3). */
export const SLA_TARGET_DAYS = 4;
/** After this many business days a request is flagged as stuck (plan-v3). */
export const SLA_FLAG_DAYS = 10;

const day = (iso: string) => new Date(iso + "T00:00:00Z");
const DAY_MS = 86_400_000;

/** Today, or APP_TODAY (yyyy-mm-dd) when set, so demos and seed data line up. */
export function todayIso(now: Date = new Date()): string {
  const fixed = process.env.APP_TODAY;
  if (fixed && /^\d{4}-\d{2}-\d{2}$/.test(fixed)) return fixed;
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Nov 26" */
export function shortDate(iso: string): string {
  const d = day(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((day(to).getTime() - day(from).getTime()) / DAY_MS);
}

/** Weekdays after `from`, up to and including `to`. Mon->Wed is 2. */
export function businessDaysBetween(from: string, to: string): number {
  let count = 0;
  const d = day(from);
  const end = day(to);
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) count++;
  }
  return count;
}

export type Label = { label: string; late: boolean };

/** How long a request has waited on IAHV. Late once it passes the 4-day target. */
export function waitingLabel(requestedOn: string, today: string): Label & { flagged: boolean } {
  const n = businessDaysBetween(requestedOn, today);
  const label = n === 0 ? "Requested today" : `Waiting ${n} business day${n === 1 ? "" : "s"}`;
  return { label, late: n > SLA_TARGET_DAYS, flagged: n > SLA_FLAG_DAYS };
}

/** "Due Nov 30", or "Due Nov 1 · 14 days late" once it has passed. */
export function dueLabel(dueOn: string, today: string): Label {
  const late = daysBetween(dueOn, today);
  if (late > 0) return { label: `Due ${shortDate(dueOn)} · ${late} day${late === 1 ? "" : "s"} late`, late: true };
  if (late === 0) return { label: `Due today`, late: false };
  return { label: `Due ${shortDate(dueOn)}`, late: false };
}

export function neededByLabel(neededBy: string, today: string): Label {
  return { label: `Needed by ${shortDate(neededBy)}`, late: daysBetween(neededBy, today) > 0 };
}

export function endedLabel(endDate: string, today: string): string {
  const n = daysBetween(endDate, today);
  return n <= 0 ? "Course ends today" : `Course ended ${n === 1 ? "yesterday" : `${n} days ago`}`;
}

export function startedLabel(startDate: string, today: string): string {
  const n = daysBetween(startDate, today);
  return n <= 0 ? "Course starts today" : `Course started ${n === 1 ? "yesterday" : `${n} days ago`}`;
}
