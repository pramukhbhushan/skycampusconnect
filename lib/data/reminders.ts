// Sample data until the backend lands. Owner: Engineer B (Bhushan) (sprint-planning.md 1.1).
// Swap the function bodies for Supabase queries; keep the signatures.

import type { ReminderGroup, SentReminder } from "@/lib/types";

export const reminderGroups: ReminderGroup[] = [
  {
    id: "invoice",
    label: "Invoice not requested",
    recipients: [
      { organizer: "Priya Shah", course: "UT Austin Fall Retreat", campus: "The University of Texas at Austin", why: "Course started yesterday, no invoice request" },
    ],
    template: {
      name: "Request your invoice",
      subject: "Action needed: request the invoice for UT Austin Fall Retreat",
      body: "Hi Priya,\n\nYour UT Austin Fall Retreat started on Nov 13, and we don’t have an invoice request for it yet. You should have everything you need by the end of day one.\n\nIt only takes a few minutes, since your course and university details are already filled in:\n[Open Step 4 · Invoice request]\n\nThank you for everything you’re doing for SKY on your campus!\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "acct",
    label: "Accounting not submitted",
    recipients: [
      { organizer: "Maya Chen", course: "Fall Premium Retreat", campus: "University of Maryland, College Park", why: "Course ended 6 days ago" },
    ],
    template: {
      name: "Submit course accounting",
      subject: "Please close out Fall Premium Retreat in Journey",
      body: "Hi Maya,\n\nThank you for leading Fall Premium Retreat! The last step is to submit course accounting in Journey with your invoice number so the course can be closed.\n\nCopy this into the Expenses/Incomes description:\n“Invoice # INV-24817 for $1,400.00”\n\n[Open Step 7 · Course accounting]\n\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "overdue",
    label: "Payment overdue",
    recipients: [
      { organizer: "Hannah Lee", course: "Rutgers Fall Retreat", campus: "Rutgers, The State University of New Jersey", why: "Due Nov 1 · 13 days late" },
    ],
    template: {
      name: "Payment overdue",
      subject: "Payment for Rutgers Fall Retreat is past due",
      body: "Hi Hannah,\n\nThe invoice for Rutgers Fall Retreat was due on Nov 1 and we haven’t received payment yet.\n\nCould you check with the university for a new payment date and reply with it here? We’ll update the course so you won’t get another reminder.\n\nSKY Campus Happiness · IAHV",
    },
  },
  {
    id: "payment",
    label: "Pending payment",
    recipients: [
      { organizer: "Daniel Kim", course: "GWU Fall Retreat", campus: "George Washington University", why: "Due Nov 30" },
    ],
    template: {
      name: "Payment coming up",
      subject: "Heads up: GWU Fall Retreat payment is due Nov 30",
      body: "Hi Daniel,\n\nJust a heads up that the invoice for GWU Fall Retreat is due on Nov 30. If the university has already paid, let us know and we’ll mark it as paid.\n\nSKY Campus Happiness · IAHV",
    },
  },
];

export const sentReminders: SentReminder[] = [
  { id: "s1", title: "Payment overdue", target: "Rutgers Fall Retreat", when: "Nov 10 · sent by IAHV admin" },
  { id: "s2", title: "Request your invoice", target: "2 courses", when: "Nov 8 · sent by IAHV admin" },
  { id: "s3", title: "Funding approved", target: "GWU Fall Retreat", when: "Oct 2 · sent by IAHV admin" },
];
