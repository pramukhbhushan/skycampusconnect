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
