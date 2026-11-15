# Profile tests

These end-to-end tests prove that a course an organizer creates in the app shows up on the IAHV admin dashboard. Three organizers on three campuses and one IAHV admin, Kelsi, do everything through the app's UI in Playwright: create their accounts, create and edit courses, and check the dashboard.

- Tests: `e2e/profiles.spec.ts` (people and courses) and `e2e/admin.spec.ts` (admin actions, as Kelsi)
- Account setup: `e2e/auth.setup.ts`
- People: `e2e/support/personas.ts`

## The people

| Id | Name | Email | Role | Campus | Country | Course they create |
|---|---|---|---|---|---|---|
| org-umd | Alex Rivera | alex.umd.e2e@example.test | Organizer | University of Maryland, College Park | US | E2E UMD Spring Retreat, Mar 5–7 2027, 14 students, paid by the university |
| org-purdue | Jordan Lee | jordan.purdue.e2e@example.test | Organizer | Purdue University | US | E2E Purdue Winter Retreat, Feb 19–21 2027, 10 students, students pay |
| org-toronto | Sam Patel | sam.toronto.e2e@example.test | Organizer | University of Toronto | CA | E2E Toronto Spring Retreat, Apr 9–11 2027, 12 students, paid by the university; plus "E2E Toronto Draft" (name only) |
| kelsi | Kelsi | kelsi.e2e@example.test | IAHV admin | — | — | — |

All four use the password in `E2E_PASSWORD`. The emails use `example.test`, which never delivers mail.

## How accounts are made

Google sign-in can't be automated, so the login page also has an email + password form. It only appears when `GUEST_LOGIN=true`; production stays Google-only.

1. `auth.setup.ts` deletes last run's four test people and their courses, so every run starts clean. It also makes sure the three test campuses are in the campus list with the right country (University of Toronto = CA), the way an IAHV admin keeps that list.
2. For each person it opens `/login`, clicks **New here? Create an account**, and fills in name, email and password. The app's database trigger gives every new account an organizer profile.
3. Kelsi is then made an IAHV admin with one service-role update. The app can't make the first admin: only an admin can make an admin.
4. Each sign-in is saved to `e2e/.auth/<id>.json` (gitignored), so each test opens the browser already signed in.

The service-role key is used only for steps 1 and 3 and for the admin fixtures below. The setup refuses to run against the shared dev project unless `.env.e2e.local` says `E2E_ALLOW_SHARED=true`.

## One-time setup (about 15 minutes)

1. **Pick the Supabase project.** A separate one (for example `skycampus-e2e`) is safest. We currently run against the shared dev project with `E2E_ALLOW_SHARED=true`; every run removes its own test people and courses, but tell Aryan before turning on email sign-in there, and turn it off again when you're done testing.
2. **Apply the migrations** in `supabase/migrations/` in order, in the SQL editor or with `supabase link` + `supabase db push`:
   1. `20261115040000_a_initial_schema.sql`
   2. `20261115060000_b_admin_transitions.sql`
   3. `20261116000000_a_course_steps_and_campuses.sql`
   4. `20261116010000_a_clients_privacy.sql`
3. **Authentication → Sign In / Providers → Email:** turn it on, and turn **Confirm email** off. Otherwise "Create account" waits for an email that never comes.
4. **Create `.env.e2e.local`** in the repo root. It's gitignored, so never commit it.

   ```
   E2E_SUPABASE_URL=https://<e2e-project-ref>.supabase.co
   E2E_SUPABASE_ANON_KEY=<anon / publishable key>
   E2E_SUPABASE_SERVICE_ROLE_KEY=<service_role key>
   E2E_PASSWORD=<any password, 8+ characters>
   ```

5. **Install the browser** once: `npx playwright install chromium`.

## Running

1. **Stop your own `npm run dev`.** Playwright starts its own dev server pointed at the e2e project with `GUEST_LOGIN=true`, and Next won't run two dev servers in one folder.
2. Run everything: `npm run e2e`.
3. Run only the profile tests: `npx playwright test e2e/profiles.spec.ts` (setup runs first automatically).
4. Watch it in a browser: add `--headed`. Step through it: add `--ui`.

Without `.env.e2e.local`, the profile tests are skipped and nothing touches Supabase.

## Test cases

Run in this order: the organizer tests create the data the admin tests check.

| # | As | What it does | Expected | Result |
|---|---|---|---|---|
| S1 | setup | Delete last run's test people and courses | Clean start | |
| S2 | setup | Create Alex, Jordan, Sam and Kelsi with the app's "Create account" form; make Kelsi admin | Organizers land on `/organizer`; Kelsi opens `/admin` | |
| P1 | each organizer | Open `/organizer` | "My courses" with "No courses yet." | |
| P2 | each organizer | Fill step 1 (name, SKY Happiness, dates, campus, participants, who pays) and click **Save & continue** | University-paid → funding page; student-paid → invoice page. The course card shows campus and "Step x of 8" | |
| P3 | Alex (UMD) | Look for Jordan's Purdue course in the list and open its URL | Not in the list; its URL returns 404 | |
| P4 | Jordan (Purdue) | Open `/admin` | Sent back to `/organizer` | |
| P5 | Sam (Toronto) | New course with only a name, **Save draft** | Listed with the "Draft" label | |
| A1 | Kelsi | `/admin`, search "E2E" | 4 rows (3 courses + the draft), each with the right campus, organizer and dates | |
| A2 | Kelsi | Campus filter: UMD, then Purdue | Exactly that campus's one course | |
| A2b | Kelsi | Country = Canada | Only the Toronto course (its country comes from its campus) | |
| A3 | Kelsi | Open the UMD course | Title, "Organizer Alex Rivera", their email, 8-step timeline, step 1 In progress, step 3 To do | |
| A4 | Kelsi | Open the Purdue course | Step 3 Skipped (students pay) | |
| A5 | Alex, then Kelsi | Alex changes the end date to Mar 8; Kelsi reloads the dashboard | The row shows "Mar 5–8, 2027" | |
| A6 | Kelsi | Download CSV (`/admin/export?q=E2E`) | Every course name and organizer email is in the file | |
| A7 | Kelsi | Open Settings and Email reminders | Both load; reminders show Kelsi's email as the sender | |

## What these tests rely on

- **B-1.1:** the dashboard and course detail read courses from Supabase (`lib/data/admin-db.ts`), and the admin pages require the IAHV admin role.
- **A-2.1:** step 1 saves courses to Supabase.
- **Course country:** step 1 now copies the country and currency from the course's campus (fixed with these tests). A campus an organizer types that isn't in the list yet starts as US until an admin sets its country.

## Admin actions (`e2e/admin.spec.ts`, as Kelsi)

Organizers can't submit funding requests, quotes or invoices from the app yet (A-3.1, A-5.1, A-6.2). So before these tests, four fixture courses named "AFX …" (owned by Alex Rivera) are added with the service role: one each with a submitted funding request, a requested quote, a requested invoice, and an overdue invoice. They're deleted after the tests. When the organizer forms save those rows, create the fixtures through the UI instead.

| # | What it does | Expected |
|---|---|---|
| D1 | Dashboard, search "AFX", click the Funding approvals tile | 4 rows, then the 1 funding course |
| D2 | Open a link with campus + invoice queue | Filters applied, 1 row |
| D3 | Download CSV of the invoice queue | Header + the invoice course, with Alex's email |
| C1 | Issue invoice number → Mark paid → Close course | Each status in order; activity shows the close |
| C2 | Issue an invoice number another course already uses | Refused |
| C3 | Approve the funding request from the queue | Approved; funding tile shows 0 |
| C4 | Issue a quote number | Quote issued; Mark accepted available |
| R1 | Pick the overdue course, Email reminder, Payment overdue, Send | From Kelsi, To Alex; sent (dev mode); in Recently sent |
| R2 | Reminder template that needs an invoice number, for a course without one | Refused |
| S1 | Edit a reminder text (bad field refused, good one saved) | New text used in the composer |
| S2 | Set SKY Happiness price to $600 | Fee estimate for 12 students shows $800.00 |
| N1 | Unknown course URL | Not found |

Admin actions still change server memory (until B-3.1), so each test resets them first. The settings users list is still sample data (B-2.2), so roles aren't tested.
