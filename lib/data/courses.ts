// Sample data until the backend lands. Owner: Engineer A (Aryan) (sprint-planning.md 1.1).
// Swap the function bodies for Supabase queries; keep the signatures.

import type { Course } from "@/lib/types";

const base = {
  format: "in_person" as const,
  teachers: null,
  estParticipants: null,
  funders: [],
  journeyCourseId: null,
};

export const courses: Course[] = [
  {
    ...base,
    id: "umd-spring-2027",
    organizerId: "maya",
    name: "UMD Spring Retreat",
    type: "happiness",
    university: "University of Maryland, College Park",
    startDate: "2027-03-05",
    endDate: "2027-03-07",
    estParticipants: 14,
    funders: ["university"],
    journeyCourseId: "J-104582",
    steps: ["done", "done", "waiting", "todo", "todo", "todo", "todo", "todo"],
    funding: {
      status: "submitted",
      submittedOn: "Nov 12",
      approvedOn: "Nov 13",
      totalFunding: "$900.00",
      neededBy: "11/26/2026",
      studentsPayPart: false,
      agreement: "yes",
      documents: [{ id: "doc-1", name: "UMD_funding_approval_letter.pdf", size: "1.2 MB", uploadedOn: "Nov 12" }],
    },
    client: { fullName: "University of Maryland, College Park" },
  },
  {
    ...base,
    id: "umd-fall-2026",
    organizerId: "maya",
    name: "Fall Premium Retreat",
    type: "premium",
    university: "University of Maryland, College Park",
    startDate: "2026-11-06",
    endDate: "2026-11-08",
    estParticipants: 14,
    funders: ["students"],
    journeyCourseId: "J-103977",
    steps: ["done", "done", "skipped", "done", "done", "done", "waiting", "todo"],
    invoiceNumber: "INV-24817",
    client: { fullName: "University of Maryland, College Park" },
  },
  {
    ...base,
    id: "draft-new",
    organizerId: "maya",
    name: "New retreat (untitled)",
    type: null,
    university: null,
    startDate: null,
    endDate: null,
    steps: ["in_progress", "todo", "todo", "todo", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "purdue-winter-2027",
    organizerId: "arjun",
    name: "Purdue Winter Retreat",
    type: "happiness",
    university: "Purdue University",
    startDate: "2027-01-22",
    endDate: "2027-01-24",
    steps: ["done", "done", "skipped", "waiting", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "ucla-spring-2027",
    organizerId: "sofia",
    name: "UCLA Spring Retreat",
    type: "happiness",
    university: "University of California, Los Angeles",
    startDate: "2027-03-12",
    endDate: "2027-03-14",
    steps: ["done", "done", "done", "waiting", "todo", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "gwu-fall-2026",
    organizerId: "daniel",
    name: "GWU Fall Retreat",
    type: "happiness",
    university: "George Washington University",
    startDate: "2026-10-16",
    endDate: "2026-10-18",
    steps: ["done", "done", "done", "done", "done", "done", "done", "waiting"],
  },
  {
    ...base,
    id: "rutgers-fall-2026",
    organizerId: "hannah",
    name: "Rutgers Fall Retreat",
    type: "happiness",
    university: "Rutgers, The State University of New Jersey",
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    steps: ["done", "done", "done", "done", "done", "done", "done", "waiting"],
  },
  {
    ...base,
    id: "ut-austin-fall-2026",
    organizerId: "priya",
    name: "UT Austin Fall Retreat",
    type: "happiness",
    university: "The University of Texas at Austin",
    startDate: "2026-11-13",
    endDate: "2026-11-15",
    steps: ["done", "done", "skipped", "waiting", "in_progress", "todo", "todo", "todo"],
  },
  {
    ...base,
    id: "toronto-winter-2026",
    organizerId: "ethan",
    name: "Toronto Winter Retreat",
    type: "happiness",
    university: "University of Toronto (CAD)",
    startDate: "2026-12-04",
    endDate: "2026-12-06",
    steps: ["done", "in_progress", "todo", "todo", "todo", "todo", "todo", "todo"],
  },
];

export function getCourse(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

/** Earlier courses by the same organizer that aren't closed yet (blocks funding approval). */
export function getOpenPriorCourses(course: Course): Course[] {
  return courses.filter(
    (c) =>
      c.organizerId === course.organizerId &&
      c.id !== course.id &&
      c.endDate !== null &&
      course.startDate !== null &&
      c.endDate < course.startDate &&
      c.steps[7] !== "done",
  );
}
