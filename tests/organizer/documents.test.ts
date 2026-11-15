import { describe, expect, it } from "vitest";
import { checkPickedFiles, isCoursePath, safeFileName, storagePath } from "@/lib/organizer/documents";

const course = "aaaaaaaa-0000-4000-8000-000000000001";

describe("file names and paths", () => {
  it("makes names safe for storage", () => {
    expect(safeFileName("UMD funding letter (final).PDF")).toBe("UMD_funding_letter_final.pdf");
    expect(safeFileName("../../etc/passwd.pdf")).toBe("etc_passwd.pdf");
    expect(safeFileName(".pdf")).toBe("document.pdf");
  });

  it("puts files in the course folder", () => {
    const p = storagePath(course, "letter.pdf", "0123456789ab");
    expect(p).toBe(`${course}/0123456789ab-letter.pdf`);
    expect(isCoursePath(course, p)).toBe(true);
  });

  it("rejects paths outside the course folder or with sub-folders", () => {
    expect(isCoursePath(course, `bbbbbbbb-0000-4000-8000-000000000001/0123456789ab-x.pdf`)).toBe(false);
    expect(isCoursePath(course, `${course}/sub/0123456789ab-x.pdf`)).toBe(false);
    expect(isCoursePath(course, `${course}/0123456789ab-x.exe`)).toBe(false);
  });
});

describe("checkPickedFiles", () => {
  const pdf = (name: string, size = 1000) => ({ name, size, type: "application/pdf" });
  it("accepts small PDFs", () => {
    expect(checkPickedFiles([pdf("a.pdf"), pdf("b.pdf")], 0)).toEqual([]);
  });
  it("limits the count, size and type", () => {
    expect(checkPickedFiles([pdf("a.pdf")], 5)[0]).toMatch(/Up to 5/);
    expect(checkPickedFiles([pdf("big.pdf", 11 * 1024 * 1024)], 0)[0]).toMatch(/10 MB/);
    expect(checkPickedFiles([{ name: "x.png", size: 10, type: "image/png" }], 0).length).toBeGreaterThan(0);
  });
});
