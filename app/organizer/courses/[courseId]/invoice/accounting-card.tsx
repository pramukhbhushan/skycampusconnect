"use client";

import { useActionState, useState } from "react";
import { Button, Card, Eyebrow } from "@/components/ui";
import { submitAccountingForm, type AccountingState } from "../../invoice-actions";

/** Step 7: copy-ready Journey text, and "I've submitted it in Journey". */
export function AccountingCard({
  courseId,
  text,
  canSubmit,
  blocker,
}: {
  courseId: string;
  text: string;
  canSubmit: boolean;
  /** Why submitting isn't possible yet (shown instead of the button). */
  blocker?: string;
}) {
  const [state, formAction, pending] = useActionState<AccountingState, FormData>(submitAccountingForm, {});
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card>
      <Eyebrow>Step 7 of 8</Eyebrow>
      <h2 className="text-2xl font-bold">Course accounting in Journey</h2>
      <p className="text-[15px] text-muted">
        In Journey, open the course&apos;s accounting, paste this into the invoice field, and submit the course for closure.
      </p>
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3.5">
        <code className="min-w-0 flex-1 text-[15px] break-words">{text}</code>
        <Button type="button" variant="secondary" onClick={copy} className="min-h-10 px-4 text-sm">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {canSubmit ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? "Saving…" : "I've submitted it in Journey"}
          </Button>
          {state.error && (
            <p role="alert" className="text-sm font-semibold text-danger-text">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        blocker && <p className="text-sm text-muted">{blocker}</p>
      )}
    </Card>
  );
}
