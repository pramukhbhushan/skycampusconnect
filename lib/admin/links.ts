// Links between admin pages. Pure, so Client Components can import it. Owner: Engineer B.

/** The reminder composer with these courses picked (and optionally a template chosen). */
export function remindHref(courseIds: string[], template?: string): string {
  const p = new URLSearchParams({ courses: courseIds.join(",") });
  if (template) p.set("template", template);
  return `/admin/reminders?${p}`;
}
