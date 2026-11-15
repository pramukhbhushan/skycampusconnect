// Sample data until the backend lands. Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
// Swap the function bodies for Supabase queries; keep the signatures.

import type { Organizer, OrganizerCourseCard } from "@/lib/types";
import { getCourse } from "./courses";

export const organizers: Organizer[] = [
  { id: "maya", name: "Maya Chen", email: "mchen@umd.edu", initials: "MC", campus: "University of Maryland, College Park" },
  { id: "arjun", name: "Arjun Patel", email: "apatel@purdue.edu", initials: "AP", campus: "Purdue University" },
  { id: "sofia", name: "Sofia Ramirez", email: "sramirez@ucla.edu", initials: "SR", campus: "University of California, Los Angeles" },
  { id: "daniel", name: "Daniel Kim", email: "dkim@gwu.edu", initials: "DK", campus: "George Washington University" },
  { id: "hannah", name: "Hannah Lee", email: "hlee@rutgers.edu", initials: "HL", campus: "Rutgers, The State University of New Jersey" },
  { id: "priya", name: "Priya Shah", email: "pshah@utexas.edu", initials: "PS", campus: "The University of Texas at Austin" },
  { id: "ethan", name: "Ethan Wong", email: "ewong@utoronto.ca", initials: "EW", campus: "University of Toronto (CAD)" },
];

/** The signed-in organizer in the mockups. */
export const currentOrganizerId = "maya";

const organizerCards: OrganizerCourseCard[] = [
  {
    courseId: "umd-spring-2027",
    statusLabel: "Waiting on IAHV",
    tone: "waiting",
    next: "IAHV Finance is reviewing your proof of funds. You can start the invoice request meanwhile.",
    cta: { label: "View funding request", href: "/organizer/courses/umd-spring-2027/funding" },
  },
  {
    courseId: "umd-fall-2026",
    statusLabel: "Action due",
    tone: "late",
    next: "Enter invoice #INV-24817 in Journey course accounting and submit for closure.",
    cta: { label: "Open course accounting", href: "/organizer/courses/umd-fall-2026/invoice" },
  },
  {
    courseId: "draft-new",
    statusLabel: "Draft",
    tone: "info",
    next: "Add your campus, dates and course type to unlock the rest of your steps.",
    cta: { label: "Continue setup", href: "/organizer/courses/new" },
  },
];

export function getOrganizer(id: string): Organizer | undefined {
  return organizers.find((o) => o.id === id);
}

export function getCurrentOrganizer(): Organizer {
  return getOrganizer(currentOrganizerId)!;
}

export function getOrganizerCourses(organizerId: string) {
  return organizerCards
    .map((card) => ({ card, course: getCourse(card.courseId)! }))
    .filter(({ course }) => course.organizerId === organizerId);
}
