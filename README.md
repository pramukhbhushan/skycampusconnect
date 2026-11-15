# skycampusconnect
SKY Campus Connect helps Sky Campus finance reimbursements with structured submissions, receipt checks, and streamlined approvals—reducing email and manual processing while keeping finance reviewers in control.

## Frontend (Next.js)

Pages are built from the `SKY Campus Connect – App Design v1` mockups (kept locally; `*.html` is gitignored). All data is sample data from `lib/mock-data.ts`.

```bash
npm install
npm run dev   # http://localhost:3000
```

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/login` | Log in (choose organizer / IAHV admin view) |
| `/organizer` | Organizer home: assistant + my courses |
| `/organizer/courses/new` | Step 1 · Course details & campus requirements |
| `/organizer/courses/[courseId]/funding` | Step 3 · Funding approval |
| `/organizer/courses/[courseId]/invoice` | Step 4 · Quote / invoice request |
| `/admin` | IAHV admin dashboard (queues, filters, bulk select) |
| `/admin/reminders` | Email reminders (manual send + automatic rules) |

### Wiring up the backend
- `lib/types.ts` mirrors the Supabase schema in `plan-v2.md`.
- `lib/mock-data.ts` ends with data-access functions (`getCourse`, `getOrganizerCourses`, `getAdminRows`, …). Replace their bodies with Supabase queries.
- `lib/pricing.ts` and `lib/steps.ts` hold the pricing formula and step logic, ready to share with server code.
- Search for `TODO(backend)` for the spots where forms need server actions (save course, submit funding, request invoice, send reminders, sign-in).
