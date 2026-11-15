// Small date helpers. All dates are ISO yyyy-mm-dd strings, treated as UTC days.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parse(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

/** "Mar 5, 2027" */
export function formatDate(iso: string): string {
  const d = parse(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "03/05/2027" */
export function formatNumeric(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

/** "Mar 5–7, 2027", or "Dec 30, 2026 – Jan 1, 2027" across months/years. */
export function formatRange(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return "Not set yet";
  const s = parse(startIso);
  const e = parse(endIso);
  if (s.getUTCFullYear() !== e.getUTCFullYear()) return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  if (s.getUTCMonth() !== e.getUTCMonth())
    return `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}, ${e.getUTCFullYear()}`;
  return `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}, ${s.getUTCFullYear()}`;
}

export function addDays(iso: string, days: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Last day of the calendar quarter after the one containing `iso`. */
export function endOfNextQuarter(iso: string): string {
  const d = parse(iso);
  const nextQuarterStartMonth = (Math.floor(d.getUTCMonth() / 3) + 1) * 3; // 0-based, may be 12
  // Day 0 of the month after the next quarter ends = last day of that quarter.
  const end = new Date(Date.UTC(d.getUTCFullYear(), nextQuarterStartMonth + 3, 0));
  return end.toISOString().slice(0, 10);
}
