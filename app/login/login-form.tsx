"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const showError = failed || searchParams.get("error") === "auth";

  async function signInWithGoogle() {
    setPending(true);
    setFailed(false);
    const callback = new URL("/auth/callback", window.location.origin);
    const next = safeNextPath(searchParams.get("next"));
    if (next) callback.searchParams.set("next", next);

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Always show Google's account picker, so a shared computer or a user with
        // both a personal and a campus account isn't signed in silently.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-[440px] flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">Log in</h2>
        <p className="text-base text-muted">Sign in with your Google account to continue.</p>
      </div>

      {showError && (
        <p role="alert" className="rounded-xl border border-field bg-white p-4 text-sm text-ink">
          Sign-in didn&apos;t complete. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-brand text-base font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <p className="text-sm leading-normal text-muted">
        New organizer? Sign in with Google and we&apos;ll set up your profile. Admin access is granted by the IAHV team.
      </p>
    </div>
  );
}
