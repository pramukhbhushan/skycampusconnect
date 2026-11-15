# Form 1: SKY Campus Flat Rate Course Approval

Source: `raw-forms/SKY Campus Flat Rate Course Approval3.pdf` (Google Form, owned by Art of Living Foundation; contact samantha.hanson@artofliving.org; 1-2 business day processing).

**Purpose (from form):** request approval for university/donor/grant/sponsor-funded courses. Used to verify funding, approve pricing + registration settings, track funding sources, ensure accurate accounting. "Complete before posting a funded course or requesting a quote/invoice."

This is the **"$0 request"** in the meeting notes, i.e. plan.md **Step 3**.

## Questions (extracted)

**Section 1: Requestor + eligibility**

| # | Question | Type | Req? |
|---|----------|------|------|
| 1 | Email (record account email with response) | checkbox | Yes |
| 2 | Requestor Name | short text | No |
| 3 | Requestor Email Address | short text | No |
| 4 | Teacher(s) of Course | short text | No |
| 5 | Have all of your previous SKY Campus courses been fully closed on Journey? | radio: *Yes, all previous courses are closed* / *No, I still need to close course accounting* / *This is my first SKY Campus course* | Yes |

**Section 2: Request for Flat Rate Course** ("must be completed to process your request to change your course fees")

| # | Question | Type | Req? |
|---|----------|------|------|
| 6 | Journey Course ID | short text | No |
| 7 | Course Type | radio: *SKY Happiness Retreat* / *SKY Premium Retreat* / Other | Yes |
| 8 | Course Format | radio: *In Person* / *Online* | No |
| 9 | Course Start Date | date | No |
| 10 | Total Funding Amount Available | short text | No |
| 11 | What student fee do you need to be set on the Journey registration link? | short text | No |
| 12 | If you have prior funding that was unused, write the invoice number, how much is left, and how much to use for this course. | long text | No |
| 13 | Proof of Funds (up to 5 PDFs, 10 MB each) | file upload | Yes |
| 14 | Will students pay any portion of the registration fee? | radio: Yes / No | No |
| 15 | Estimated Number of Participants | short text | No |
| 16 | University Name (full name, no abbreviations) | short text | No |
| 17 | Where are the funds coming from? | checkbox: *University* / *Corporate Sponsor* / *Individual Donor* / Other | Yes |
| 18 | Do you anticipate needing a quote or invoice? | radio: *Quote* / *Invoice* / *Unsure* / *Not at this time* | No |
| 19 | Has a formal agreement been completed with the client or funding organization? | radio: Yes / No / In Progress | No |
| 20 | When do you need this request completed by? | date | No |

**Proof of Funds must clearly show:** funding organization name; approved funding amount; purpose (designated for SKY Campus course); written funding approval. Acceptable: funding approval/award letters, admin emails confirming approval, grant award letters, sponsorship agreements / donor commitments. Must include dollar amount.

## How it fits the system

**Plan step:** 3 ("Submit the $0 request with proof of funding, only if school-funded"). Step gated by `courses.funding_type = school_funded` (also covers donor/sponsor, which the form supports).

**Integration approach:** native in-app form (Step 3 screen) replacing the Google Form. Submission creates a `funding_requests` record and advances the course.

### Field mapping

| Form field | Source in app | Notes |
|---|---|---|
| Email, Requestor Name/Email | Auto-filled from `profiles` (signed-in organizer) | Drop manual entry; removes typos |
| Teacher(s) | `courses.teachers` (collected at Add Course / Step 1) | |
| Previous courses closed? | **Computed**: query organizer's other courses, all `closed`? | Auto-answer; show list of blocking courses if not. Strong pain-point fit (forgotten closures) |
| Journey Course ID | `courses.journey_course_id` (Step 2 output) | Required in app (form has it optional) |
| Course Type / Format / Start Date | `courses.course_type`, `format`, `start_date` | Shared with Quote + Invoice forms |
| Total Funding, Funding source, University name | `courses.funder_name`, `funding_source[]`, `funding_amount` | Reused downstream by Quote/Invoice (client name) |
| Student fee for Journey link | `funding_requests.student_fee` | Default $0 when students pay nothing; Q14 "students pay any portion" drives this |
| Prior unused funding | `funding_requests.prior_funding` (invoice #, remaining, amount applied) | Optionally link to earlier `invoices` rows |
| Proof of Funds | Supabase Storage; `documents` table (type=`proof_of_funds`) | PDF only, ≤5 files, ≤10 MB. Reused as invoice "formal agreement" upload |
| Anticipate quote/invoice | `courses.needs_quote`, `needs_invoice` | **Drives Step 4 routing** (see below) |
| Formal agreement completed? | `courses.agreement_status` (yes/no/in_progress) | Drives quote-vs-invoice rule |
| Needed-by date | `funding_requests.needed_by` | Used for admin queue sorting + reminders |

### Behavior
- **Step 3 status:** `draft -> submitted -> approved | needs_info`. Admin (Finance) approves in dashboard; approval marks step 3 done and unlocks 4. (Meeting notes: Finance handles approval, 1-2 business days; show SLA hint.)
- **Routing into Step 4:** `agreement_status = yes` -> invoice form; `no`/`in_progress` -> quote form. `Not at this time` hides step 4 until changed.
- **Validation:** proof-of-funds required; amount > 0; PDF/size limits; full university name (no abbreviations; reject all-caps <=5 chars).
- **Ordering conflict to resolve:** form says "complete before posting a funded course"; meeting notes say course must be posted first to get the Journey ID. Form's Journey ID is optional, so app should allow submitting without an ID, then require it before approval/invoice. Confirm with Kelsey.
- **Admin view:** approval queue with proof PDFs inline, funding amount, needed-by date; stored funding source feeds Finance tracking (replaces manual sheet rows).
- **Reminders:** email template "Funding approval pending" (admin -> Finance) and "Request approved, post course" (-> organizer).
- **Hackathon fit:** captures funding source/amount once, prevents re-entry across forms (duplicate-data pain point); proof PDF stored once and linked, no duplicate uploads.

### Suggested tables
`funding_requests(id, course_id, requested_by, student_fee, students_pay_portion, est_participants, prior_funding_note, needed_by, status, reviewer_id, reviewed_at)`; `documents(id, course_id, kind, storage_path, uploaded_by)`.

## Open questions
- Does "flat rate" = $0 to students always, or can student fee be partial (Q11/Q14 suggest partial)?
- Exact approval authority (Samantha Hanson vs Finance/Mikayla)?
- Is approval a hard gate on posting the course, or advisory?
