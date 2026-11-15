import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFundingForm } from "@/lib/organizer/funding";

const { requireRole, logEvent, rpc } = vi.hoisted(() => ({ requireRole: vi.fn(), logEvent: vi.fn(), rpc: vi.fn() }));
let docs: { id: string; file_name: string; size_bytes: number }[] = [];

function query() {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in"]) q[m] = () => q;
  q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: docs, error: null }).then(ok);
  return q;
}

vi.mock("@/lib/supabase/require-role", () => ({ requireRole }));
vi.mock("@/lib/data/events", () => ({ logEvent }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: query, rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { saveFundingForm, submitFundingRequest } from "@/app/organizer/courses/funding-actions";

const values = {
  totalFunding: 900,
  estParticipants: 14,
  neededBy: "2099-01-01",
  studentsPayPart: false,
  studentFee: 0,
  agreement: "yes",
};

beforeEach(() => {
  vi.clearAllMocks();
  docs = [{ id: "d1", file_name: "award.pdf", size_bytes: 5000 }];
  requireRole.mockResolvedValue({ id: "u1", email: "m@x.edu", name: "Maya", role: "organizer" });
  rpc.mockResolvedValue({ data: "fr-1", error: null });
});

describe("readFundingForm", () => {
  it("reads amounts with $ and commas, the student fee only when students pay part, and unique file ids", () => {
    const fd = new FormData();
    fd.set("totalFunding", "$1,200.50");
    fd.set("studentsPayPart", "no");
    fd.set("studentFee", "40");
    fd.append("proofOfFundsIds", "d1");
    fd.append("proofOfFundsIds", "d1");
    const r = readFundingForm(fd);
    expect(r.values).toMatchObject({ totalFunding: 1200.5, studentsPayPart: false, studentFee: 0 });
    expect(r.documentIds).toEqual(["d1"]);
    fd.set("studentsPayPart", "yes");
    expect(readFundingForm(fd).values.studentFee).toBe(40);
  });
});

describe("submitFundingRequest", () => {
  it("submits with the files described from the database", async () => {
    await expect(submitFundingRequest("c1", { values, documentIds: ["d1"] }, true)).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith(
      "save_funding_request",
      expect.objectContaining({ p_course_id: "c1", p_submit: true, p_total_funding: 900, p_document_ids: ["d1"], p_agreement: "yes" }),
    );
    expect(logEvent).toHaveBeenCalledWith("c1", "funding.submitted", { by: "u1" });
  });

  it("submitting needs proof of funds and a student fee when students pay part", async () => {
    docs = [];
    expect(await submitFundingRequest("c1", { values, documentIds: [] }, true)).toHaveProperty("proofOfFunds");
    docs = [{ id: "d1", file_name: "award.pdf", size_bytes: 5000 }];
    expect(await submitFundingRequest("c1", { values: { ...values, studentsPayPart: true, studentFee: 0 }, documentIds: ["d1"] }, true)).toHaveProperty(
      "studentFee",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a draft saves with blanks but rejects malformed numbers", async () => {
    await expect(submitFundingRequest("c1", { values: {}, documentIds: [] }, false)).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("save_funding_request", expect.objectContaining({ p_submit: false, p_total_funding: undefined }));
    expect(logEvent).toHaveBeenCalledWith("c1", "step.updated", { step: 3, draft: true });
    expect(await submitFundingRequest("c1", { values: { totalFunding: NaN }, documentIds: [] }, false)).toHaveProperty("totalFunding");
  });

  it("shows database refusals (e.g. missing Journey ID) as a form error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Add the Journey course ID (step 2) first" } });
    expect(await submitFundingRequest("c1", { values, documentIds: ["d1"] }, true)).toEqual({ form: "Add the Journey course ID (step 2) first" });
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe("saveFundingForm", () => {
  it("goes back to the course after a draft and stays on step 3 after submitting", async () => {
    const draft = new FormData();
    draft.set("courseId", "c1");
    draft.set("intent", "draft");
    await expect(saveFundingForm({}, draft)).rejects.toThrow("REDIRECT:/organizer/courses/c1");
    const submit = new FormData();
    submit.set("courseId", "c1");
    submit.set("intent", "submit");
    submit.set("totalFunding", "900");
    submit.set("estParticipants", "14");
    submit.set("neededBy", "2099-01-01");
    submit.set("studentsPayPart", "no");
    submit.set("agreement", "yes");
    submit.append("proofOfFundsIds", "d1");
    await expect(saveFundingForm({}, submit)).rejects.toThrow("REDIRECT:/organizer/courses/c1/funding");
  });
});
