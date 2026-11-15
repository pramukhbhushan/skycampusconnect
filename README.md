# SKY Campus Connect

SKY Campus Connect is a web app for running **SKY Campus Happiness** courses at universities. It walks organizers through every step of setting up a course, from campus approval to final payment. It also gives the **IAHV** team one live view of every course, so nothing slips through.

It replaces the scattered Google Forms, the Finance spreadsheet and the one-by-one reminder emails used today.

> Built for Hackathon Track 5, *"Cut down volunteers' finance paperwork"*, and tailored to the SKY Campus workflow described in [`SKY_Meeting_Notes.md`](SKY_Meeting_Notes.md).

## The problem

Organizers who bring SKY retreats to their campus end up doing a lot of finance paperwork: funding approvals, quote requests, invoice requests and course accounting in Journey. Each step lives in a separate form, the same details get typed again and again, and IAHV staff track everything by hand in a spreadsheet. Invoices get forgotten, courses don't get closed out, and reminders go out late, often the week of the course.

## Who uses it

| Role | Who they are | What they do in the app |
|---|---|---|
| **Organizer** | A student or teacher bringing a SKY course to their campus | Plan a course, see what step it's on, fill in forms that are already mostly filled in, and save forms as templates for next time. |
| **IAHV admin** | IAHV Finance and the SKY Campus team | See every course across campuses, approve funding, enter quote and invoice numbers, mark courses paid, and email organizers who need a nudge. |

Everyone signs in with Google. New users start as organizers; an IAHV admin can make someone an admin.

## The 8 steps of a course

Every course moves through the same 8 steps, shown as a progress bar on each course:

| # | Step | When | What happens |
|---|---|---|---|
| 1 | Campus requirements | Before | Event request, room booking, campus funding application. |
| 2 | Post on Journey | Before | Post the course and save its Journey course ID. |
| 3 | Funding approval | Before | Only when a university, sponsor or donor pays. Upload proof of funds; IAHV approves and the student fee is set (usually $0). |
| 4 | Quote & invoice | Before | Request a quote first if the school needs one, then the invoice. IAHV issues the numbers. |
| 5 | Sign-ups & orientation | Before | Collect sign-ups and hold orientation calls. |
| 6 | Record attendance | After | Mark each student complete, dropout or no-show in Journey. |
| 7 | Course accounting | After | Enter the invoice number in Journey. The app gives text to copy. |
| 8 | Payment & closure | After | Track the school's payment until the course is closed. |

Steps that don't apply are skipped automatically. For example, funding approval is skipped when students pay for the course themselves.

## Parts of the app

### Landing page
Explains what SKY Campus Connect does and how the 8 steps work, with links to log in.

### Sign-in
"Continue with Google". After signing in, organizers land on their courses and IAHV admins land on the dashboard.

### Organizer home
- **Course planning assistant:** a summary of what needs attention ("your funding request is waiting on IAHV"), with shortcuts to the right step.
- **My courses:** a card for each course with its progress bar, current step, status (e.g. *Waiting on IAHV*, *Action due*) and the next thing to do.
- **Guides:** finance guidelines, the course accounting walkthrough and the orientation call guide.

### Course steps and forms
- **Step 1 · Course details:** name, course type (Happiness or Premium), format, dates, university, teachers, expected participants and who's paying. Entered once and reused in every later form. Includes the campus requirements checklist and a live fee estimate.
- **Step 3 · Funding approval:** details carried over from step 1, funding amount, student fee, proof-of-funds PDFs (saved once, reused for the invoice) and whether a formal agreement is signed, which decides what step 4 asks for. Warns if an earlier course isn't closed yet.
- **Step 4 · Quote or invoice request:** who the invoice goes to, number of participants, card payment, and a suggested due date based on how long the university usually takes to pay. The amount is worked out automatically.

### Form templates
On any form, "Save as template" stores the answers that repeat (university, billing contact, teachers, course type…). Next time, "Start from template" fills them in. Details unique to one course, like dates and Journey ID, are never saved in a template.

### Pricing
$500 for a SKY Happiness Retreat or $1,000 for a SKY Premium Retreat, covering up to 10 students, plus $100 for each extra student, plus 3% if the university pays by card. The app calculates this everywhere so nobody does it by hand.

### IAHV admin dashboard
- Every course across every campus in one table: organizer, dates, progress, status, and what it's waiting on.
- **Queues:** Funding approvals, Quote requests, Invoice requests, Pending payment and Needs follow-up, each with a count.
- **Filters and search** by campus, step, status and country (US and Canada).
- **Actions on each row:** review and approve, enter quote or invoice #, mark paid, send reminder.
- Select several courses at once to email them all.

### Reminder emails
1. Pick who needs a nudge, from a queue like "Invoice not requested" or by selecting courses.
2. Choose a pre-written message (*Request your invoice*, *Submit course accounting*, *Payment overdue*, …) with each course's details filled in, and edit it if needed.
3. Send. Each organizer gets their own email, **to** their address and **from** the admin who sent it, so replies go straight to that admin.

Reminders are always sent by a person. Nothing goes out automatically.

### Settings (IAHV admins)
Manage users and roles, edit email message texts and update pricing.

---

## Frontend

**Status:** ✅ All 8 designed screens are built and run on sample data.

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS 4, DM Sans.

### Run it locally
Requires Node.js 20.9 or newer. Run the commands **inside this repo folder** (`skycampusconnect`), not its parent:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/login` | Log in |
| `/organizer` | Organizer home: assistant + my courses |
| `/organizer/courses/new` | Step 1 · Course details & campus requirements |
| `/organizer/courses/[courseId]/funding` | Step 3 · Funding approval |
| `/organizer/courses/[courseId]/invoice` | Step 4 · Quote / invoice request |
| `/admin` | IAHV admin dashboard |
| `/admin/reminders` | Email reminders |

Try `/organizer/courses/umd-spring-2027/funding` to see a course with sample data.

### Project structure
```
app/            Pages: landing, login, organizer/, admin/
components/     Shared UI: header, course stepper, buttons, fields, icons
lib/            Types, sample data, pricing, step and date logic
docs/forms/     The three current Google Forms, written up field by field
raw-forms/      PDFs of those forms
public/brand/   Logos
```

The design mockup (`*.html`) is kept locally and is gitignored.

## Backend

**Status:** 🚧 Planned. The work is split into sprints in [`sprint-planning.md`](sprint-planning.md).

**Stack:** Supabase (Postgres with row-level security, Auth with Google sign-in, Storage for PDFs), Resend for email, Vercel for hosting. No scheduled jobs.

### Wiring up the backend
- `lib/types.ts` mirrors the Supabase schema in `plan-v3.md`.
- Pages get data only through the functions in `lib/data/` (`getCourse`, `getOrganizerCourses`, `getAdminRows`, …), which return sample data for now. Each file says which engineer owns it; replace the bodies with Supabase queries.
- `lib/pricing.ts` and `lib/steps.ts` hold the pricing formula and step logic, ready to share with server code.
- Search for `TODO(backend)` to find the forms that still need server actions (save course, submit funding, request invoice, send reminders, sign-in).

## Docs

| File | What it is |
|---|---|
| [`plan-v3.md`](plan-v3.md) | **The plan.** Roles, pages, data model, emails, templates. |
| [`sprint-planning.md`](sprint-planning.md) | The plan split into sprints for two engineers working in parallel. |
| [`SKY_Meeting_Notes.md`](SKY_Meeting_Notes.md) | Notes from the kickoff meeting with SKY Campus (background). |
| [`docs/forms/`](docs/forms) | Field-by-field write-ups of the funding, quote and invoice forms. |
| [`Hackathon_Prompt.md`](Hackathon_Prompt.md) | The original hackathon brief (background only; plan-v3 is what we build). |
