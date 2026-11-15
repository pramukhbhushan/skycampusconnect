# Form 2: SKY Campus Quote Request

Source: `raw-forms/SKY Campus Quote request form.pdf` (Google Form, IAHV).

**Purpose (from form):** a quote is a good-faith estimate of services + dollar amount. Requested *before* a formal agreement (contract/MOU) exists; some clients agree verbally and need no written quote. "First the quotation, then the invoice." All pricing applies to online and in-person.

Maps to plan-v3.md **Step 4** ("Request a quote and invoice"), quote branch. Meeting notes: some schools (e.g. UCLA) need a quote before invoice.

## Questions (extracted)

| # | Question | Type | Req? |
|---|----------|------|------|
| 1 | Email | email | Yes |
| 2 | Today's date | date | Yes |
| 3 | Name of person submitting the request | text | Yes |
| 4 | Name of client/Company | text | Yes |
| 5 | Attn: (if quote must be addressed to a specific person at the University) | text | Yes |
| 6 | Client/company address | text | Yes |
| 7 | Client email address | text | Yes |
| 8 | Quote date (mm/dd/yyyy) | text | Yes |
| 9 | Full Name of University/College (e.g. "George Washington University", not "GW") | text | Yes |
| 10 | IAHV Program Name (SKY Campus, SKY Schools, SKY Kids, SKY Teens, etc.) | text | Yes |
| 11 | When applicable, program details or event name & description | text | Yes |
| 12 | SKY Campus POC (person managing the quote and funding negotiations) | text | Yes |
| 13 | Name of course | text | Yes |
| 14 | Journey event ID | text | Yes |
| 15 | Course Dates (mm/dd/yyyy - mm/dd/yyyy) | text | Yes |
| 16 | Pricing model, "SKY Happiness Retreat" (online & in person) | radio: *Minimum baseline of $500 for up to 10 students* / *N/A, "Premium" course type* / Other | Yes |
| 17 | Pricing model, "Premium" course (SKY Happiness + Sahaj Samadhi). Note: +$100 per additional student, specify in Other | radio: *Minimum baseline of $1,000 for up to 10 students* / *N/A: not a Premium course* / Other | Yes |
| 18 | Quote Amount | text | Yes |
| 19 | Any other notes or considerations to be communicated to the IAHV Finance Office | text | Yes |

**Process text on form:** abbreviations must be spelled out ("Graduate Student Organization (GSO)"); option to email self a copy; Finance turnaround 2-4 business days, plan ~2 weeks; Finance emails back a quote #; requester reviews and either forwards to client or replies with changes for reissue.

## How it fits the system

**Plan step:** 4 (quote branch). Visible only when `agreement_status != yes` (from Form 1) or when organizer picks "I need a quote".

**Integration approach:** native in-app form; submit creates a `quotes` row (status `requested`). Finance (admin) enters the **quote #** in the dashboard when issued, which flips status to `issued`, emails the organizer, and unlocks the invoice step once agreement is signed.

### Field mapping

| Form field | Source in app |
|---|---|
| Email, person submitting, POC | `profiles` (auto; POC defaults to submitter, editable) |
| Today's date | `now()` (system, not user-entered) |
| Quote date | `quotes.quote_date` (default today; admin may set) |
| Client name, Full University name | `courses.funder_name` (from Form 1); single field, validated full name |
| Attn, address, client email | `clients` table (contact + billing). **Saved once per university, reused** across quotes/invoices/courses |
| IAHV program name | dropdown, default "SKY Campus" |
| Program details | `courses.description` (optional if course) |
| Course name, Journey event ID, dates | `courses.*` (pre-filled) |
| Pricing model | `courses.course_type` + participant count -> **computed price** |
| Quote amount | **Computed**, editable w/ reason; see below |
| Notes to Finance | `quotes.notes` |
| Quote # (output) | `quotes.quote_number`, entered by admin; referenced later by Invoice form Q "quote #" |

### Behavior / logic
- **Auto-pricing:** `base = Happiness $500 | Premium $1,000` (up to 10 students); `amount = base + $100 * max(0, participants - 10)`. "Other" -> free-text override flagged for Finance review. Replaces error-prone hand-calculated amounts and radio+Other combos. (The two radios are mutually exclusive in practice: collapse into one course-type selector.)
- **Skip when not needed:** verbal-agreement clients -> "Skip quote" button records `quote_waived` and goes to invoice.
- **Validation:** full-name check (no unexpanded all-caps abbreviations; prompt "Name (ABBR)"), valid email, date range end >= start.
- **Status flow:** `requested -> issued -> accepted | revised | expired`. Revisions create a new version, preserving history.
- **Admin dashboard:** Quotes queue with SLA ages (2-4 business days; flag > 10 days); filter by campus/status.
- **Reminders:** "Quote issued, send to client" nudge; "Quote issued N days ago, agreement still pending" for follow-up.
- **Hackathon fit:** most of the 19 fields are data the system already holds, so the organizer confirms rather than types. Cuts the "lengthy form" delay called out in meeting notes.

### Suggested tables
`clients(id, name, attn, address, email)`; `quotes(id, course_id, client_id, requested_by, poc_id, program_name, participants, pricing_tier, amount, notes, status, quote_number, quote_date, version)`.

## Open questions
- Is quote # format controlled by Finance (manual) or can the app generate one?
- Does a quote need a PDF produced by the app, or does Finance keep generating it externally and attach to the email?
- Is Q5 "Attn" really required when a quote isn't addressed to a person (form marks it required)?
