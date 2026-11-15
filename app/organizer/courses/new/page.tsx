import type { Metadata } from "next";
import { CourseDetailsForm } from "./course-details-form";

export const metadata: Metadata = { title: "New retreat" };

// Step 1 · Course details & campus requirements.
export default function NewCoursePage() {
  return (
    <CourseDetailsForm
      initial={{
        name: "UMD Spring Retreat",
        type: "happiness",
        format: "in_person",
        startDate: "03/05/2027",
        endDate: "03/07/2027",
        university: "University of Maryland, College Park",
        teachers: "",
        estParticipants: 14,
        funders: ["university"],
      }}
    />
  );
}
