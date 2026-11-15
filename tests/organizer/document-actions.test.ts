import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }));
const course = "aaaaaaaa-0000-4000-8000-000000000001";
const path = `${course}/0123456789abcdef-letter.pdf`;

let state: {
  owned: boolean;
  info: { data: unknown; error: unknown };
  count: number;
  linked: number;
  doc: unknown;
};
const inserted: unknown[] = [];
const removed: string[][] = [];
const deleted: string[] = [];

function query(table: string) {
  let head = false;
  const q: Record<string, unknown> = {};
  q.select = (_cols: string, opts?: { head?: boolean }) => ((head = !!opts?.head), q);
  q.eq = () => q;
  q.insert = (row: unknown) => (inserted.push(row), q);
  q.delete = () => (deleted.push(table), q);
  q.maybeSingle = async () => {
    if (table === "courses") return { data: state.owned ? { id: course } : null };
    if (table === "documents") return { data: state.doc };
    return { data: null };
  };
  q.single = async () => ({ data: { id: "doc-1", file_name: "letter.pdf", size_bytes: 1_200_000, created_at: "2026-11-15T10:00:00Z" }, error: null });
  q.then = (ok: (v: unknown) => unknown) =>
    Promise.resolve(
      head ? { count: table === "documents" ? state.count : state.linked, error: null } : { data: [], error: null },
    ).then(ok);
  return q;
}

const storage = {
  info: async () => state.info,
  remove: async (paths: string[]) => (removed.push(paths), { error: null }),
};

vi.mock("@/lib/supabase/require-role", () => ({ requireRole }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: query, storage: { from: () => storage } }) }));

import { discardUpload, recordDocument, removeDocument } from "@/app/organizer/courses/document-actions";

beforeEach(() => {
  vi.clearAllMocks();
  inserted.length = 0;
  removed.length = 0;
  deleted.length = 0;
  state = {
    owned: true,
    info: { data: { size: 1_200_000, contentType: "application/pdf" }, error: null },
    count: 0,
    linked: 0,
    doc: { id: "doc-1", storage_path: path },
  };
  requireRole.mockResolvedValue({ id: "u1", email: "m@x.edu", name: "Maya", role: "organizer" });
});

describe("recordDocument", () => {
  it("records the size Storage reports, not the browser's", async () => {
    const doc = await recordDocument(course, path, "letter.pdf", "proof_of_funds");
    expect(doc).toEqual({ id: "doc-1", name: "letter.pdf", size: "1.2 MB", uploadedOn: "Nov 15" });
    expect(inserted[0]).toMatchObject({ course_id: course, kind: "proof_of_funds", storage_path: path, size_bytes: 1_200_000, uploaded_by: "u1" });
  });

  it("refuses paths outside the course, other people's courses, missing uploads, big files and a 6th PDF", async () => {
    await expect(recordDocument(course, `bbbbbbbb-0000-4000-8000-000000000001/0123456789abcdef-x.pdf`, "x.pdf", "other")).rejects.toThrow(/folder/);
    state.owned = false;
    await expect(recordDocument(course, path, "x.pdf", "other")).rejects.toThrow("Course not found");
    state.owned = true;
    state.info = { data: null, error: { message: "not found" } };
    await expect(recordDocument(course, path, "x.pdf", "other")).rejects.toThrow(/didn't arrive/);
    state.info = { data: { size: 11 * 1024 * 1024, contentType: "application/pdf" }, error: null };
    await expect(recordDocument(course, path, "x.pdf", "other")).rejects.toThrow(/10 MB/);
    state.info = { data: { size: 100, contentType: "application/pdf" }, error: null };
    state.count = 5;
    await expect(recordDocument(course, path, "x.pdf", "other")).rejects.toThrow(/Up to 5/);
    expect(inserted).toHaveLength(0);
  });
});

describe("removeDocument", () => {
  it("deletes the row and the stored file", async () => {
    await removeDocument("doc-1");
    expect(deleted).toEqual(["documents"]);
    expect(removed).toEqual([[path]]);
  });

  it("keeps files attached to a request sent to IAHV", async () => {
    state.linked = 1;
    await expect(removeDocument("doc-1")).rejects.toThrow(/attached to a request/);
    expect(deleted).toHaveLength(0);
  });

  it("refuses files that aren't the caller's", async () => {
    state.doc = null;
    await expect(removeDocument("doc-x")).rejects.toThrow("File not found");
  });
});

describe("discardUpload", () => {
  it("removes an unrecorded upload in the caller's course only", async () => {
    state.doc = null;
    await discardUpload(course, path);
    expect(removed).toEqual([[path]]);
    removed.length = 0;
    await discardUpload(course, "../other/file.pdf");
    expect(removed).toHaveLength(0);
  });
});
