import type { Metadata } from "next";
import { CourseDetailsForm } from "./course-details-form";

export const metadata: Metadata = { title: "New retreat" };

// Step 1 · Course details & campus requirements, for a course that doesn't exist yet.
export default function NewCoursePage() {
  return (
    <CourseDetailsForm
      initial={{
        name: "",
        type: null,
        format: "in_person",
        startDate: "",
        endDate: "",
        university: "",
        teachers: "",
        estParticipants: null,
        funders: [],
      }}
      requirements={[]}
    />
  );
}
