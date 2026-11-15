// Reminder email templates and their fill-in fields (B-4.2). Owner: Engineer B.
// Texts use {{field}} placeholders; renderTemplate fills them per organizer and course.
import type { ReminderTemplateKey } from "@/lib/admin/derive";

export type EmailTemplate = { key: ReminderTemplateKey; name: string; subject: string; body: string };

/** Every field a template may use, with what it means (shown to admins when editing). */
export const MERGE_FIELDS = {
  organizer_first_name: "Organizer's first name",
  organizer_name: "Organizer's full name",
  course_name: "Course name",
  course_dates: "Course dates, e.g. Mar 5–7, 2027",
  course_start: "Course start date",
  university: "University",
  invoice_number: "Invoice number",
  invoice_amount: "Invoice amount, e.g. $1,400.00",
  due_date: "Invoice due date",
  course_link: "Link to the organizer's course page",
  admin_name: "Your name",
} as const;

export type MergeField = keyof typeof MERGE_FIELDS;
export type MergeValues = Partial<Record<MergeField, string>>;

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    key: "request_invoice",
    name: "Request your invoice",
    subject: "Action needed: request the invoice for {{course_name}}",
    body: "Hi {{organizer_first_name}},\n\nYour {{course_name}} started on {{course_start}}, and we don’t have an invoice request for it yet. You should have everything you need by the end of day one.\n\nIt only takes a few minutes, since your course and university details are already filled in:\n{{course_link}}\n\nThank you for everything you’re doing for SKY on your campus!\n{{admin_name}} · IAHV",
  },
  {
    key: "submit_accounting",
    name: "Submit course accounting",
    subject: "Please close out {{course_name}} in Journey",
    body: "Hi {{organizer_first_name}},\n\nThank you for leading {{course_name}}! The last step is to submit course accounting in Journey with your invoice number so the course can be closed.\n\nCopy this into the Expenses/Incomes description:\n“Invoice # {{invoice_number}} for {{invoice_amount}}”\n\n{{course_link}}\n\n{{admin_name}} · IAHV",
  },
  {
    key: "payment_overdue",
    name: "Payment overdue",
    subject: "Payment for {{course_name}} is past due",
    body: "Hi {{organizer_first_name}},\n\nThe invoice for {{course_name}} ({{invoice_number}}) was due on {{due_date}} and we haven’t received payment yet.\n\nCould you check with {{university}} for a new payment date and reply with it here? We’ll update the course so you won’t get another reminder.\n\n{{admin_name}} · IAHV",
  },
  {
    key: "payment_coming_up",
    name: "Payment coming up",
    subject: "Heads up: {{course_name}} payment is due {{due_date}}",
    body: "Hi {{organizer_first_name}},\n\nJust a heads up that the invoice for {{course_name}} ({{invoice_number}}) is due on {{due_date}}. If the university has already paid, let us know and we’ll mark it as paid.\n\n{{admin_name}} · IAHV",
  },
  {
    key: "funding_needs_info",
    name: "Funding needs more info",
    subject: "A question about funding for {{course_name}}",
    body: "Hi {{organizer_first_name}},\n\nThanks for sending the funding request for {{course_name}}. Before we can approve it, we need a little more information. Please open your funding request and check the note from IAHV:\n{{course_link}}\n\n{{admin_name}} · IAHV",
  },
];

const FIELD = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Placeholders in a text that aren't known merge fields (typos like {{course_nmae}}). */
export function unknownFields(text: string): string[] {
  const out = new Set<string>();
  for (const [, name] of text.matchAll(FIELD)) if (!(name in MERGE_FIELDS)) out.add(name);
  return [...out];
}

/** Fills {{fields}}. A field with no value is left as [Field label] and reported. */
export function renderTemplate(text: string, values: MergeValues): { text: string; missing: MergeField[] } {
  const missing = new Set<MergeField>();
  const rendered = text.replace(FIELD, (whole, name: string) => {
    if (!(name in MERGE_FIELDS)) return whole;
    const value = values[name as MergeField];
    if (value) return value;
    missing.add(name as MergeField);
    return `[${MERGE_FIELDS[name as MergeField]}]`;
  });
  return { text: rendered, missing: [...missing] };
}
