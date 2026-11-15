// The four test people from ProfileTests.md: one organizer per campus, and Kelsi (IAHV admin).
// Accounts are made through the app's own "Create account" form (e2e/auth.setup.ts).

export type Persona = {
  id: "org-umd" | "org-purdue" | "org-toronto" | "kelsi";
  name: string;
  email: string;
  role: "organizer" | "iahv_admin";
  /** Full university name typed into step 1 (organizers only). */
  campus?: string;
  country?: "US" | "CA";
  /** The course this organizer creates in profiles.spec.ts. */
  course?: { name: string; funders: string[]; start: string; end: string; participants: number };
};

export const ORGANIZERS: Persona[] = [
  {
    id: "org-umd",
    name: "Alex Rivera",
    email: "alex.umd.e2e@example.test",
    role: "organizer",
    campus: "University of Maryland, College Park",
    country: "US",
    course: { name: "E2E UMD Spring Retreat", funders: ["University"], start: "2027-03-05", end: "2027-03-07", participants: 14 },
  },
  {
    id: "org-purdue",
    name: "Jordan Lee",
    email: "jordan.purdue.e2e@example.test",
    role: "organizer",
    campus: "Purdue University",
    country: "US",
    course: { name: "E2E Purdue Winter Retreat", funders: ["Students pay"], start: "2027-02-19", end: "2027-02-21", participants: 10 },
  },
  {
    id: "org-toronto",
    name: "Sam Patel",
    email: "sam.toronto.e2e@example.test",
    role: "organizer",
    campus: "University of Toronto",
    country: "CA",
    course: { name: "E2E Toronto Spring Retreat", funders: ["University"], start: "2027-04-09", end: "2027-04-11", participants: 12 },
  },
];

export const KELSI: Persona = { id: "kelsi", name: "Kelsi", email: "kelsi.e2e@example.test", role: "iahv_admin" };

export const PERSONAS: Persona[] = [...ORGANIZERS, KELSI];

export const byId = (id: Persona["id"]) => PERSONAS.find((p) => p.id === id)!;

/** Saved sign-in for a persona (written by auth.setup.ts, gitignored). */
export const authFile = (id: Persona["id"]) => `e2e/.auth/${id}.json`;

/** Course saved with only a name, to check drafts show up for admins too. */
export const DRAFT_COURSE = "E2E Toronto Draft";

export function password(): string {
  const p = process.env.E2E_PASSWORD;
  if (!p || p.length < 8) throw new Error("Set E2E_PASSWORD (8+ characters) in .env.e2e.local. See ProfileTests.md.");
  return p;
}
