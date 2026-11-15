# Decisions

Design decisions for SKY Campus Connect, newest last. Past entries are never rewritten; a
replaced decision is marked `Superseded by <NNN>`.

## 001. Clients are visible only to admins, their creator, and organizers billing to them
**Date:** 2026-11-15
**Status:** Accepted

**Decision:** Restrict reading `clients` to IAHV admins, the organizer who created the client, and organizers with a course billed to it (migration `20261116010000_a_clients_privacy.sql`).

**Context:** `clients` stores a university's billing contact (Attn name, address, AP email). Sign-in is open to any Google account and every new user becomes an organizer, so the original policy ("every signed-in user can read every client") exposed those contacts to anyone. plan-v3 wanted clients "reused per university" so details are entered once. No real data existed yet, so changing it was cheap.

**Options considered:**
- Keep open reads: easiest reuse, but leaks named contacts to anyone who signs in. Rejected.
- Restrict reads (chosen): one policy change; closes the leak.
- Restrict plus an exact-name lookup function for cross-organizer reuse: keeps "enter once", but still reveals a contact to anyone who types the university's name, and adds code. Not needed yet.
- Defer: the leak would go live with the first real invoice (Sprint 3). Rejected.

**Why:** Privacy of named contacts outweighs cross-organizer reuse, given open sign-in and only a few organizers per campus. Form templates (A-4) already let each organizer reuse their own billing details.

**Accepted downsides:** Two organizers at the same university each enter its billing details once, which can create duplicate clients for admins to tidy.

**Concerns raised:** None.

**Revisit if:** sign-in becomes invite-only (open reads would be acceptable), or duplicate clients become a real burden for admins (add the exact-name lookup on top).

## 002. Add `not_at_this_time` to `AgreementStatus` at A-6.1, as an alias of the generated enum
**Date:** 2026-11-15
**Status:** Accepted

**Decision:** Leave the frozen `lib/types.ts` unchanged for now. At A-6.1, in one announced PR coordinated with B's Zod change, make `AgreementStatus` an alias of the generated database enum so it includes `not_at_this_time`.

**Context:** The database enum `agreement_status` already has `not_at_this_time`; `lib/types.ts` (frozen after Sprint 0) and B's Zod `agreementStatus` (`lib/validation/common.ts`) don't. Nothing writes `agreement_status` until the funding form saves (A-5.1), and only A-6.1 routes on it ("not at this time" means the quote is waived). Meanwhile `lib/data/course-mapper.ts` shows the value as "no".

**Options considered:**
- Add it now: types match the database early, but it costs a frozen-file announcement for a value no code can write yet, and is unusable without B's Zod change. Rejected.
- Defer to A-6.1 with B's Zod change (chosen): one coherent change when it's needed; no user impact meanwhile.
- Alias the generated enum: removes future hand-syncing. Adopted as the way the deferred change is made.

**Why:** Zero benefit before Sprint 6, and a single coordinated PR is cleaner than two partial ones. The alias stops the same drift happening again.

**Accepted downsides:** `lib/types.ts` doesn't match the database until Sprint 6; the temporary "not_at_this_time shows as no" mapping stays until then.

**Concerns raised:** None.

**Revisit if:** the funding form (A-5.1) lets organizers choose an agreement status before Sprint 6; then make the change with A-5.1.

## 003. Build PDF uploads first, then the invoice request (A-3.1), then the funding request (A-5.1)
**Date:** 2026-11-15
**Status:** Accepted

**Decision:** Next organizer work is, in order: a shared PDF upload piece (Storage upload, `documents` row, reusable component), then A-3.1 `requestInvoice`, then A-5.1 `submitFundingRequest` (pulled forward from Sprint 5), then A-2.3 card text.

**Context:** Steps 3 and 4 were still mockups, so courses never got past them. Both forms require PDFs in B's Zod schemas (at least one proof-of-funds PDF for funding; at least one signed-agreement PDF for the invoice), and no upload code existed. The Storage bucket and its policies already existed (A-0.2). B's admin transition functions (`approve_funding`, `issue_invoice_number`, ...) were already live, so submissions could be acted on immediately. A-2.3's card text depends on funding/invoice states that don't exist until those forms save.

**Options considered:**
- A-3.1 then A-5.1: highest value first, but uploads would be buried inside A-3.1.
- A-5.1 then A-3.1: follows the course order, same hidden upload dependency.
- Uploads first, then A-3.1, then A-5.1 (chosen): the shared piece is built and tested once; each form PR stays small; the invoice can reuse the step 3 PDF as plan-v3 wants.
- A-2.3 first: its text would be redone once steps 3 and 4 save.
- Relax the PDF requirement: fastest, but skips a real IAHV rule and needs B to change schemas.

**Why:** Both forms are blocked on the same missing piece; build it once. The invoice goes before funding because the plan ranks it highest and students-pay courses can use it right away.

**Accepted downsides:** One more PR before a "Submit" button works; part of A-5.2 moves out of Sprint 5.

**Concerns raised:** None.

**Revisit if:** most real courses are university-funded (then do A-5.1 before A-3.1).

## 004. Defaults for the open questions affecting organizer work
**Date:** 2026-11-15
**Status:** Accepted (items marked B-owned stand until Bhushan decides otherwise)

**Decision:** Aryan accepted Claude's recommended default for each open question below, in one batch.

**Context:** A review of every remaining sprint listed the questions that need a product decision. Most had a safe, reversible default; deciding them together unblocks Sprints 3 to 7.

| # | Question | Decision | Revisit if |
|---|---|---|---|
| a | Earlier unclosed courses when requesting funding (plan-v3 Q2; B-owned) | Warning only, not a block | IAHV wants it enforced; then add the check to `save_funding_request()` |
| b | Who marks step 3 done when IAHV approves funding | Claude adds a trigger, if Bhushan agrees (his `approve_funding()` doesn't touch `course_steps`) | Bhushan prefers to do it in his function |
| c | Organizers can insert `invoices` rows directly (bypassing `request_invoice()`) | Tighten it, coordinated with Bhushan (his `access-rules.sql` relies on the current policy) | — |
| d | Journey integration (plan-v3 Q3) | Manual only: steps 6 to 8 stay checklists and typed values | IAHV provides a Journey API or CSV export |
| e | How end-to-end tests sign in (A-3.3) | A separate test Supabase project with email/password users, never the live project | Keeping a second project becomes too costly |
| f | Sharing form templates (plan-v3 Q9; A-owned) | Private to each person (as the database already enforces) | Admins ask to share reminder templates |
| g | Which fields templates keep | As listed in plan-v3 (never dates, amounts or files) | — |
| h | Partial student fee (plan-v3 Q4) | Allowed: any per-student amount when students pay part | IAHV says the fee is all-or-nothing |
| i | Dropouts and cancellations (plan-v3 Q5) | No automatic invoice change; IAHV adjusts by hand | IAHV defines a refund rule |
| j | Canada, CAD and GST (plan-v3 Q6) | USD only for now | A Canadian course needs a real invoice |
| k | One Supabase project or separate dev and production | Split before real data arrives | — |
| l | Who can sign up as an organizer | Any Google account, for now | Unknown accounts appear, or before launch (then also revisit 001) |
| m | Organizer home "assistant" chat (not in any sprint) | Leave as a placeholder | Someone schedules it |

**Why:** Each default is the smallest, most reversible choice that lets the planned work continue.

**Accepted downsides:** (a) IAHV must catch unclosed earlier courses themselves; (l) anyone with a Google account can create an organizer profile until this is revisited.

**Concerns raised:** (l) The live project already has 13 organizer profiles, so it's worth checking for unknown accounts.

**Revisit if:** see each row.
