// Step 3 funding request: reading the form. Pure. Owner: Engineer A (Aryan).

function text(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function num(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

/** FormData from the funding form -> B's fundingRequestSchema shape (minus proofOfFunds) + document ids. */
export function readFundingForm(fd: FormData): { values: Record<string, unknown>; documentIds: string[] } {
  const studentsPayPart = fd.get("studentsPayPart") === "yes";
  return {
    values: {
      totalFunding: num(text(fd, "totalFunding")),
      estParticipants: num(text(fd, "estParticipants")),
      neededBy: text(fd, "neededBy"),
      studentsPayPart,
      studentFee: studentsPayPart ? num(text(fd, "studentFee")) : 0,
      priorFundingNote: text(fd, "priorFundingNote"),
      agreement: text(fd, "agreement"),
    },
    documentIds: [...new Set(fd.getAll("proofOfFundsIds").filter((v): v is string => typeof v === "string" && v !== ""))],
  };
}
