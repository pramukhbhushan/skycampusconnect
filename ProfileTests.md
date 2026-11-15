# Profile tests

These end-to-end tests prove that a course an organizer creates in the app shows up on the IAHV admin dashboard. Three organizers on three campuses and one IAHV admin, Kelsi, do everything through the app's UI in Playwright: create their accounts, create and edit courses, and check the dashboard.

- Tests: `e2e/profiles.spec.ts`
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

1. `auth.setup.ts` deletes last run's four test people and their courses, so every run starts clean.
2. For each person it opens `/login`, clicks **New here? Create an account**, and fills in name, email and password. The app's database trigger gives every new account an organizer profile.
3. Kelsi is then made an IAHV admin with one service-role update. The app can't make the first admin: only an admin can make an admin.
4. Each sign-in is saved to `e2e/.auth/<id>.json` (gitignored), so each test opens the browser already signed in.

The service-role key is used only for steps 1 and 3, and only against the e2e project. The setup refuses to run if `E2E_SUPABASE_URL` is the shared dev project.

## One-time setup (about 15 minutes)

1. **Create a separate Supabase project**, for example `skycampus-e2e`. The tests create and delete data, so never point them at the shared dev project.
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
| A2b | Kelsi | Country = Canada | The Toronto course shows. **Expected to fail today:** step 1 never sets the course's country, so every course is saved as US. Marked `test.fail`; it reports "passed unexpectedly" once fixed | |
| A3 | Kelsi | Open the UMD course | Title, "Organizer Alex Rivera", their email, 8-step timeline, step 1 In progress, step 3 To do | |
| A4 | Kelsi | Open the Purdue course | Step 3 Skipped (students pay) | |
| A5 | Alex, then Kelsi | Alex changes the end date to Mar 8; Kelsi reloads the dashboard | The row shows "Mar 5–8, 2027" | |
| A6 | Kelsi | Download CSV (`/admin/export?q=E2E`) | Every course name and organizer email is in the file | |
| A7 | Kelsi | Open Settings and Email reminders | Both load; reminders show Kelsi's email as the sender | |

## What these tests rely on

- **B-1.1:** the dashboard and course detail read courses from Supabase (`lib/data/admin-db.ts`), and the admin pages require the IAHV admin role.
- **A-2.1:** step 1 saves courses to Supabase.
- **Still in memory, not covered here:** admin actions (approve funding, issue quote or invoice numbers), reminder history, and the settings users list. The old sample-data admin tests (`e2e/admin.spec.ts`) are skipped until B-3.1 moves those to Supabase.

## Known gaps found by these tests

- [ ] **Course country** (Engineer A): `createCourse` never sets `courses.country`, so Canadian courses are saved as US and show under US on the dashboard (test A2b).
