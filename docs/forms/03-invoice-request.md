# Form 3: Invoice Request Form for SKY Campus

Source: `raw-forms/Invoice request form for SKY Campus.pdf` (Google Form, IAHV; 10 pages including process text).

**Purpose (from form):** request an invoice listing services provided. Only after a **formal written agreement** (contract/MOU signed by both, PO, grant acceptance letter, etc., a.k.a. "funding confirmation documentation") exists. If funding is not 100% confirmed, do **not** request an invoice; request a quote instead. Teachers/organizers have all participant info by end of day 1 of the course.

Maps to plan-v3.md **Step 4** (invoice branch), feeding **Steps 7-8** (invoice number in course accounting; track payment until closed). This is the highest-value form: the meeting notes' core pain is forgotten invoice requests, missing invoice numbers, and placeholder invoices.

## Questions (extracted)

| # | Question | Type | Req? |
|---|----------|------|------|
| 1 | Email | email | Yes |
| 2 | Today's date | date | Yes |
| 3 | Upload copy of the formal agreement showing funding is secured (up to 5 PDFs, 10 MB each) | file upload | Yes |
| 4 | Name of person submitting this invoice request | text | Yes |
| 5 | Invoice DUE date (date IAHV will receive payment; ask client's Accounts Payable processing time: 2 wks / 1-6 wks / quarterly) | text | Yes |
| 6 | Quote # (if previously requested to secure funding; else "N/A") | text | Yes |
| 7 | Purchase Order # (from client; else "N/A") | text | Yes |
| 8 | Name of Client/University | text | Yes |
| 9 | Attn: (person receiving/paying invoice) | text | Yes |
| 10 | Client/University address | text | Yes |
| 11 | Client email address | text | Yes |
| 12 | Full Name of University/College (no abbreviations) | text | Yes |
| 13 | IAHV Program Name (SKY Campus, SKY Schools, SKY Kids, SKY Teens, etc.) | text | Yes |
| 14 | If applicable, program details or event name & description (if not a course) | text | Yes |
| 15 | SKY Campus POC, person responsible for this invoice | text | Yes |
| 16 | Name of course | text | Yes |
| 17 | Journey Event ID | text | Yes |
| 18 | Dates (mm/dd/yyyy - mm/dd/yyyy) | text | Yes |
| 19 | Pricing model, "SKY Happiness Retreat" | radio: *$500 min for up to 10 students* / *N/A, Premium* / Other | Yes |
| 20 | Pricing model, "Premium" course (+$100 per additional student, specify in Other) | radio: *$1,000 min for up to 10 students* / *N/A, SKY Happiness Retreat* / Other | Yes |
| 21 | # of participants | text | Yes |
| 22 | Invoice Amount | text | Yes |
| 23 | Any other notes or considerations for IAHV Finance Office | text | No |
| 24 | University wants to pay by credit card? Adds 3% merchant fee + payment link (e.g. $1,500 -> $1,545.00) | radio: *Yes, add 3% and credit card payment link* / *N/A* | No |

### Post-submit process text (drives workflow design)
1. Option to email yourself a copy of responses.
2. Finance turnaround 2-4 business days; plan 1 week to 10 days (audit season, revisions).
3. Finance emails the invoice (with **invoice #**).
4a. Requester reviews, sends to client if correct, else replies with changes for reissue.
4b. Requester **submits Journey course accounting**, logging invoice #(s), amount(s), details in "Expenses/Incomes".
5. If Journey course not "Closed" by due date, follow up.

**FYI (status model):** Journey Status `Active` -> (course accounting submitted) `Expenses Submitted for Approval` ("pending review") stays until invoice paid -> `Closed` if course accounting form (CAF) complete, else declined (`Expenses Rejected`) -> fix and resubmit CAF. If past due date and still pending: check with school for new payment ETA and notify SKY Campus personnel + SKY Campus Desk (skycampushappiness@iahv.org). Rejection notes: Journey admin login -> Related tab -> Approval History -> View All. Multiple attachments allowed per income entry (invoice + Zelle confirmation). Description example: "invoice # XXXXXXX for $YYYY paid by zelle on MM/DD". Tip: Journey filter must be "IAHV courses" under "AOLF events" to find course ID. Training: Loom videos (Q4 2024 Course Accounting; Flat Rate and Invoices; Complex Arrangements) + "Finance Guidelines '24: SKY Campus" Google doc.

## How it fits the system

**Plan step:** 4 (invoice branch) -> 7 -> 8. Invoice request is the **anchor record**: its invoice # and due date power the Finance dashboard and reminder engine.

**Integration approach:** native in-app form, pre-filled from earlier steps; creates an `invoices` row (status `requested`). Finance enters invoice # on issue; app emails organizer, then tracks the full lifecycle in the dashboard (replaces the manually-maintained Finance spreadsheet).

### Field mapping

| Form field | Source in app |
|---|---|
| Email, submitter, POC | `profiles` (auto) |
| Today's date | `now()` |
| Formal agreement upload | `documents` (kind=`formal_agreement`); can reuse Form 1 proof-of-funds PDFs by selecting existing documents (no re-upload; duplicate-upload pain point) |
| Quote # | Auto-linked from `quotes.quote_number` if one exists, else "N/A" (computed, not typed) |
| PO # | `invoices.po_number` (nullable; app stores null instead of the string "N/A") |
| Client name/Attn/address/email, Full university name | `clients` (reused from Quote form / Form 1) |
| Program name | dropdown default SKY Campus |
| Course name, Journey ID, dates, # participants | `courses.*` (pre-filled; participants can be updated from Step 5 sign-ups) |
| Pricing model + invoice amount | **Computed** (same formula as quote) + 3% if card |
| Credit card 3% | `invoices.cc_fee_applied` -> amount x 1.03; show breakdown |
| Due date | `invoices.due_date`; helper: client AP turnaround dropdown (2 wk / 4 wk / 6 wk / quarterly) -> suggested date |
| Notes | `invoices.notes` |
| Invoice # (output) | `invoices.invoice_number` entered by Finance -> copied to `courses.invoice_number` for Step 7 |

### Behavior / logic
- **Gatekeeping:** block submit unless agreement uploaded or selected; if `agreement_status != yes`, offer "Request a quote instead" (mirrors form's own warning).
- **Timing nudge:** the form notes info is available by end of day 1 of the course. Remind organizer at course start (fixes "reminder email only the week of the course") and again at the end of the course if no invoice requested.
- **Status lifecycle** (maps directly to dashboard + Steps 6-8):
  `requested -> issued -> sent_to_client -> accounting_submitted -> paid -> closed` (+ `rejected` loop -> resubmit CAF). Maps to Journey `Active` / `Expenses Submitted for Approval` / `Closed` / `Expenses Rejected`. Journey status is entered manually (no API assumed), so organizer/admin updates it in the app.
- **Step 7 helper:** once `invoice_number` exists, show copy-ready text: "Invoice # X for $Y" and the suggested income-entry description; checklist for Journey "Expenses/Incomes" entry; link training videos/guidelines in a help panel (static content from form).
- **Placeholder invoice case:** if invoice was never requested, Finance can create a placeholder number from the admin screen; mark `is_placeholder=true` so it stays visible in reports.
- **Overdue logic (admin):** `due_date < today AND status != closed` -> "Overdue". One-click reminder email to organizer ("check with school for new ETA, notify SKY Campus Desk"). Bulk select e.g. "invoice not requested", "accounting not submitted", "pending payment" (meeting notes' status-based queue).
- **Validation:** full university name; amount matches computed pricing or has override reason; cc fee rounding to cents; due date >= today; participant count integer.
- **Confidentiality:** amounts/invoice records visible only to admins and the owning organizer via RLS; "template with monetary details removed" fits a demo-safe seed dataset.
- **Hackathon fit:** targets "generate and track invoices", duplicate uploads (reuse documents), and handoff to Finance (queue instead of Google Form -> email -> spreadsheet).

### Suggested tables
`invoices(id, course_id, client_id, quote_id, requested_by, poc_id, po_number, participants, pricing_tier, base_amount, cc_fee_applied, amount, due_date, notes, status, invoice_number, is_placeholder, issued_at, sent_at, paid_at, closed_at)`; links to `documents`, `clients`, `quotes`.

## Open questions
- Can Finance export/import (CSV) to the app, or will Finance enter invoice # manually in the dashboard? Does the app issue the invoice PDF or just store the number?
- Is Journey status readable via API or CSV export? Otherwise manual updates.
- Currency/tax: forms are USD-only with a 3% card fee. Hackathon prompt mentions US/Canada (GST/HST); invoice amounts need `currency` and `country` fields plus tax lines if Canada is to be demoed.
- Dropout/no-show/cancellation payment rules (Kelsey unsure on cancellations) affect final amount vs participants.
