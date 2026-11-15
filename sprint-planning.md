# Sprint planning

Breaks `plan-v3.md` into sprints for **two engineers (or two coding agents) working at the same time**. Each piece of work has one owner, and the two owners never edit the same file in the same sprint. Where one engineer needs the other's work, the plan says exactly which merged PR to wait for.

- **Engineer Aryan: Organizer side + data foundation.** The Supabase connection (project, schema, clients), Google sign-in (Google Cloud setup and the code), the organizer pages and forms, form templates.
- **Engineer Bhushan: IAHV admin side + email.** CI and tests setup, the admin dashboard and queues, admin actions, reminder emails, settings.

Starting point: the `frontend-designs` pages (all reading sample data from `lib/mock-data.ts`). Every task ID below (A-2.1, B-3.1, …) is one PR.

---

## 1. How we avoid conflicts

### 1.1 File ownership
Every path has one owner. Only the owner edits it. The other engineer may **import** from it but never changes it. If you need a change in a file you don't own, ask the owner (an issue or a message) and they make it in their next PR.

| Path | Owner | Notes |
|---|---|---|
| `app/organizer/**` | A | |
| `app/login/**`, `app/auth/**` | A | Google sign-in button, OAuth callback route |
| Supabase project and Google Cloud OAuth client (outside the repo) | A | Dashboard settings, keys and redirect URLs; share the needed env var names with B |
| `app/templates/**` | A | "My templates" page |
| `app/admin/**` | B | Dashboard, queues, reminders, settings |
| `components/organizer/**` | A | New organizer-only components |
| `components/templates/**` | A | `TemplatePicker`, `SaveTemplateButton` |
| `components/admin/**` | B | New admin-only components |
| `components/ui.tsx`, `components/icons.tsx`, `components/course-stepper.tsx`, `components/app-header.tsx` | **Frozen** after Sprint 0 | Need a new shared piece? Add a new file in your own `components/<area>/` folder instead of editing these. |
| `supabase/migrations/*` | Per file (see 1.3) | |
| `supabase/seed.sql` | A | |
| `lib/supabase/**` | A | Server/browser clients, `requireRole()` |
| `.env.example` | A | Lists every env var (Supabase URL/keys, Google client, Resend key). B asks A to add Resend's. |
| `lib/db/database.types.ts` | A | Generated; regenerate only in A's PRs |
| `lib/data/courses.ts`, `lib/data/organizer.ts`, `lib/data/templates.ts`, `lib/data/events.ts` | A | Data access for organizer features |
| `lib/data/admin.ts`, `lib/data/reminders.ts`, `lib/data/settings.ts` | B | Data access for admin features |
| `lib/templates/**` | A | Template field allow-lists, apply/save logic |
| `lib/email/**` | B | Resend client, merge fields, email template texts |
| `lib/validation/**` | B | Zod schemas (A imports them) |
| `lib/pricing.ts`, `lib/steps.ts`, `lib/dates.ts`, `lib/types.ts` | **Frozen** after Sprint 0 | Changes go through a small PR by A, announced first |
| `lib/mock-data.ts` | Deleted in 0.1 | Split into `lib/data/*`, which keep returning sample data until each owner swaps in real queries |
| `middleware.ts` / `proxy.ts` (route protection) | A | |
| `app/layout.tsx`, `app/page.tsx`, `app/globals.css` | **Frozen** after Sprint 0 | Landing page and app shell |
| `tests/organizer/**`, `e2e/organizer.spec.ts` | A | |
| `tests/admin/**`, `tests/lib/**`, `e2e/admin.spec.ts`, `tests/rls/**` | B | B sets up the test harness; A adds RLS tests for A's tables to `tests/rls/organizer.test.ts` only |
| `.github/workflows/**`, `vitest.config.ts`, `playwright.config.ts` | B | |
| `package.json`, `package-lock.json` | A, **Sprint 0 only** | All dependencies are added up front (see 0.1). After that, adding a dependency needs a short PR by A, merged before either side uses it. |
| `README.md`, `plan-v3.md`, `sprint-planning.md` | Whoever is asked, one at a time | Docs only |

### 1.2 Branches and PRs
- Branch names: `a/<sprint>-<slug>` and `b/<sprint>-<slug>` (e.g. `a/s2-course-create`, `b/s2-admin-dashboard`).
- Keep PRs small (one task each). Rebase on `main` right before opening and again before merging.
- `main` must stay green: CI (lint, typecheck, unit tests, build) passes on every PR.
- Two agents on one machine: use **separate git worktrees** (`git worktree add ../scc-a a/...`), and run dev servers on different ports (`npm run dev -- -p 3000` for A, `-p 3001` for B).

### 1.3 Database migrations
Migrations are the most likely place for two people to collide, so:
- **Sprint 0 creates the whole schema at once** (every table in plan-v3's data model, with RLS). After that, schema changes are rare and small.
- New migration files only. Never edit a migration that's merged. Name them `<timestamp>_<a|b>_<what>.sql` so they sort and never clash.
- Each table has an owner for **later** changes (columns, triggers, transition functions):

| Tables | Owner of later changes |
|---|---|
| `profiles`, `campuses`, `clients`, `courses`, `course_steps`, `documents` (+ join tables), `form_templates`, `events` | A |
| `funding_requests`, `quotes`, `invoices` | **Split by action:** A owns the organizer *create/submit* functions, B owns the admin *status-transition* functions (approve, issue #, mark paid/closed). Column changes need both to agree. |
| `email_templates`, `email_log`, `settings` (pricing constants) | B |

- Local databases: each engineer uses **their own Supabase dev project** (or their own local stack), selected by `.env.local` (gitignored). Never point both at one dev database.

### 1.4 Contracts both sides code against
Fixed in Sprint 0 so neither side waits:
- **Status values** (exact strings) for course steps, funding, quotes and invoices, from plan-v3, as Postgres enums and matching TypeScript types in `lib/types.ts`.
- **Function signatures** in `lib/data/*.ts`, first returning mock data, so pages can be wired before the real query exists.
- **Server action names** each side will expose (list in Sprint 0 task A-0.3).
- **Event types** for the `events` audit log, e.g. `funding.submitted`, `funding.approved`, `invoice.requested`, `invoice.issued`, `invoice.paid`, `reminder.sent`.

---

## 2. Sprints

Each sprint lists A's and B's tasks side by side. **⏸ Waits for** means the task can't merge until the named PR is on `main` (you can start it on top of that branch, but merge after).

### Sprint 0: Bootstrap and contracts
Goal: everything both engineers need to work separately.

**0.1 (A, first, merge before anything else, small):** install every dependency the project will need: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `resend`, `vitest`, `@testing-library/react`, `@playwright/test`, `supabase` (CLI, dev). Split `lib/mock-data.ts` into `lib/data/{courses,organizer,templates,events,admin,reminders,settings}.ts` that still return sample data, update imports, and delete `mock-data.ts`. Change `computeFee` to take pricing constants as an optional argument (default: today's values). Freeze the shared files listed in 1.1.

| Engineer A | Engineer B |
|---|---|
| **A-0.2** Supabase project setup: `supabase init`, first migration with **all** plan-v3 tables, enums, indexes, RLS policies for the two roles, storage bucket + policies. ⏸ 0.1 | **B-0.1** CI: `.github/workflows/ci.yml` running lint, `tsc --noEmit`, unit tests, build. (New file; can start during 0.1.) |
| **A-0.3** `lib/supabase/` server and browser clients, `requireRole('organizer' \| 'iahv_admin')` helper; list of server action names for both sides (in this file, section 3). | **B-0.2** Test harness: `vitest.config.ts`, `playwright.config.ts`, unit tests for `lib/pricing.ts`, `lib/steps.ts`, `lib/dates.ts`. ⏸ 0.1 |
| **A-0.4** `supabase/seed.sql` from the current sample data (same courses, organizers, statuses); generate `lib/db/database.types.ts`. ⏸ A-0.2 | **B-0.3** `lib/validation/` Zod schemas for every form (course, funding request, quote, invoice, reminder email), matching plan-v3's validation rules. ⏸ 0.1 |
| **A-0.5** Google sign-in: create the Google Cloud OAuth client (consent screen, authorized redirect URLs for localhost, Vercel previews and production); turn on the Google provider in Supabase Auth with that client ID/secret; "Continue with Google" on `/login`; `app/auth/callback` route exchanging the code for a session; new users get a `profiles` row with role `organizer`; middleware/proxy protecting `/organizer/**` and `/admin/**` by role. Document the env vars in `.env.example`. ⏸ A-0.3 | **B-0.4** v3 copy on admin pages: remove the "Automatic reminders" panel from `/admin/reminders`; show From/To in the reminder preview. |

### Sprint 1: Real data, read path
Goal: every existing page reads from Supabase instead of sample data.

| Engineer A | Engineer B |
|---|---|
| **A-1.1** Real queries in `lib/data/courses.ts` and `organizer.ts`; organizer home and course pages read from DB. Organizer copy: "IAHV Finance" → "IAHV". | **B-1.1** Real queries in `lib/data/admin.ts`: dashboard rows, queue counts, filters (campus, step, status), "overdue"/"needs follow-up" computed in the query (no cron). |
| **A-1.2** `lib/data/events.ts`: `logEvent(courseId, type, payload)` used by every write from here on. | **B-1.2** Admin dashboard filters wired to URL search params; "Step" and "Country" selects work. |
| **A-1.3** RLS tests for A's tables (`tests/rls/organizer.test.ts`). | **B-1.3** RLS test runner + admin-side RLS tests (`tests/rls/admin.test.ts`). |

### Sprint 2: Courses and the stepper (write path)

| Engineer A | Engineer B |
|---|---|
| **A-2.1** Step 1 form saves: server action `createCourse` / `updateCourse`, seeds 8 `course_steps`, routes step 3 to `skipped` when students pay. | **B-2.1** Admin course detail view (`/admin/courses/[courseId]`): read-only course info, step timeline, event log. |
| **A-2.2** Steps 1, 2, 5, 6 as checklists on the course page (campus requirements, Journey ID, sign-ups/orientation, attendance). | **B-2.2** Settings page shell: users and roles (promote to `iahv_admin`, admins only) via `lib/data/settings.ts`. |
| **A-2.3** "My courses" cards: real next-action and blocker text from step status. | **B-2.3** Admin E2E smoke test (sign in as admin, see dashboard). |

### Sprint 3: Invoice slice (highest value)
Both sides touch invoices, split by action (see 1.3).

| Engineer A | Engineer B |
|---|---|
| **A-3.1** Invoice request form (step 4, invoice mode) saves: `requestInvoice` inserts `invoices` with status `requested`, reuses/creates `clients`, amount computed server-side with `computeFee`. | **B-3.1** Invoice queue actions: `issueInvoiceNumber`, `markInvoiceSent`, `markInvoicePaid`, `closeInvoice`, as Postgres transition functions (migration `_b_invoice_transitions.sql`) + server actions. |
| **A-3.2** Steps 7–8 organizer view: copy-ready Journey text ("Invoice # X for $Y…"), mark accounting submitted (`submitAccounting`). | **B-3.2** Overdue flag and SLA age on invoice rows (2–4 business days, flag after 10). |
| **A-3.3** Organizer E2E: create course → request invoice. ⏸ B-3.1 for the final "issued" assertion | **B-3.3** Admin E2E: issue invoice # → mark paid. |

### Sprint 4: Form templates (A) and reminder emails (B)
Two independent features: no shared files.

| Engineer A | Engineer B |
|---|---|
| **A-4.1** `lib/templates/`: per-form field allow-lists (what's kept vs left out, from plan-v3), `saveTemplate`, `applyTemplate`, schema-version handling. Unit tests prove excluded fields are never saved or applied. | **B-4.1** Resend setup: verify the sending domain (open question 8), `lib/email/client.ts`, sandbox/test mode for dev. |
| **A-4.2** `components/templates/`: `SaveTemplateButton` and `TemplatePicker` ("Replace what you've typed?" confirm). | **B-4.2** `lib/email/templates.ts` + `email_templates` seed: Request your invoice, Submit course accounting, Payment overdue, Payment coming up, Funding needs more info; merge fields. |
| **A-4.3** Templates on the step 1 and invoice forms. | **B-4.3** Reminder composer: recipients from queue/selection, **To = organizer email, From = signed-in admin**, editable subject/body, "Send me a test", one email per course, `email_log` row per send, "Recently sent" shows sender. |
| **A-4.4** `/templates` page: list, rename, delete. | **B-4.4** Settings: edit email template texts. |

### Sprint 5: Funding approval (step 3) and documents

| Engineer A | Engineer B |
|---|---|
| **A-5.1** Step 3 form saves: `submitFundingRequest`, earlier-courses-closed check, "needs Journey ID before approval" rule. | **B-5.1** Funding approval queue: `approveFunding`, `requestFundingInfo` (transition functions + actions); approval unlocks step 4. ⏸ A-5.1 for the submitted-request data |
| **A-5.2** Proof-of-funds uploads to Supabase Storage (`documents`), max 5 PDFs × 10 MB, reuse the PDF on the invoice form. Templates on the funding form. | **B-5.2** Admin view of uploaded documents (signed URLs) on the course detail page. |
| **A-5.3** RLS tests: organizers can't read others' documents. | **B-5.3** Settings: pricing constants stored in `settings`; `lib/data/settings.ts#getPricing()` passed to `computeFee`. |

### Sprint 6: Quote flow and routing

| Engineer A | Engineer B |
|---|---|
| **A-6.1** Step 4 routing from agreement status (yes → invoice; no/in progress → quote; "not at this time" → waived). | **B-6.1** Quote queue: `issueQuoteNumber`, `reviseQuote`, `expireQuote` transitions + actions. |
| **A-6.2** Quote request form saves (`requestQuote`); invoice unlocks after agreement signed; templates on the quote form. | **B-6.2** Reminder composer uses A's `TemplatePicker` / `SaveTemplateButton` (`form_type = reminder_email`). ⏸ A-4.2 (already merged) |

### Sprint 7: Polish and launch

| Engineer A | Engineer B |
|---|---|
| **A-7.1** Help panels and guides on organizer pages; accessibility pass on organizer pages. | **B-7.1** Audit log view per course and CSV export on the dashboard. |
| **A-7.2** Full organizer E2E using a saved template (happy path). | **B-7.2** Admin E2E: send a reminder and check the log's From/To. |
| **A-7.3** Seed data review (synthetic only, no real amounts). | **B-7.3** Vercel production deploy, environment variables, Resend production key. |

---

## 3. Server actions (contract from A-0.3)

| Action | Owner | Who may call | Writes |
|---|---|---|---|
| `createCourse`, `updateCourse`, `updateStep` | A | organizer (own course) | `courses`, `course_steps`, `events` |
| `submitFundingRequest` | A | organizer | `funding_requests` (`submitted`) |
| `requestQuote`, `requestInvoice`, `submitAccounting` | A | organizer | `quotes` / `invoices` (`requested`), `invoices.accounting_submitted_at` |
| `saveTemplate`, `applyTemplate`, `renameTemplate`, `deleteTemplate` | A | owner of the template | `form_templates` |
| `approveFunding`, `requestFundingInfo` | B | iahv_admin | `funding_requests` |
| `issueQuoteNumber`, `reviseQuote`, `expireQuote` | B | iahv_admin | `quotes` |
| `issueInvoiceNumber`, `markInvoiceSent`, `markInvoicePaid`, `closeInvoice` | B | iahv_admin | `invoices` |
| `sendReminders`, `sendTestReminder` | B | iahv_admin | `email_log`, `events` |
| `setUserRole`, `updateEmailTemplate`, `updatePricing` | B | iahv_admin | `profiles.role`, `email_templates`, `settings` |

Every write also calls `logEvent` (A-1.2).

---

## 4. Cross-team dependencies (all of them)

| Needs | Provided by | First needed in |
|---|---|---|
| Dependencies installed, `lib/data/*` split | 0.1 (A) | Everything |
| Schema, RLS, generated types | A-0.2, A-0.4 | B-1.1 |
| `requireRole` and auth | A-0.3, A-0.5 | B-1.1, all admin actions |
| Zod schemas | B-0.3 | A-2.1 |
| Test harness and CI | B-0.1, B-0.2 | A-1.3 |
| `logEvent` | A-1.2 | B-3.1 |
| Submitted invoices/funding/quotes to act on | A-3.1, A-5.1, A-6.2 | B-3.1, B-5.1, B-6.1 (can build against seed data first) |
| Template components | A-4.2 | B-6.2 |
| `getPricing()` | B-5.3 | A's forms (switch from defaults when merged) |

## 5. Definition of done (every task)
- Only files you own are changed (check `git diff --stat` against section 1.1).
- Lint, typecheck, unit tests and build pass in CI.
- New tables or policies have RLS tests.
- Writes log an event.
- PR description says which task ID it closes and anything the other engineer needs to know.

## 6. Open questions that could block a sprint
From plan-v3. Each one's owner chases the answer before the sprint that needs it.

| # | Question | Blocks | Owner |
|---|---|---|---|
| 1 | Quote/invoice numbers entered by hand or generated? | Sprint 3 | B |
| 2 | Who approves funding; hard gate or advisory? | Sprint 5 | B |
| 7 | ~~Login method~~ Decided: Google sign-in through Supabase Auth. Confirmed everyone uses Google accounts. | Done | A |
| 8 | Can `iahv.org` be verified in Resend for per-admin From? | Sprint 4 (B-4.1) | B |
| 9 | Shared admin templates? | Later (not in these sprints) | A |
