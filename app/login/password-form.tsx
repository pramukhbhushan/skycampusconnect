"use client";
// Email + password sign-in, offered alongside Google (and used by the Playwright tests,
// which can't drive Google). It uses the same Supabase Auth as Google sign-in: a new account gets an organizer profile from the
// on_auth_user_created trigger, and roles are checked by requireRole as usual.

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeNextPath } from "@/lib/auth/safe-next";
import { createClient } from "@/lib/supabase/browser";

type Mode = "sign_in" | "sign_up";

const field = "min-h-[48px] w-full rounded-xl border border-field bg-white px-4 text-base text-ink";

export function PasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("sign_in");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();
    if (mode === "sign_up" && !name) return setMessage({ tone: "error", text: "Enter your full name." });

    setPending(true);
    setMessage(null);
    const supabase = createClient();
    const { data, error } =
      mode === "sign_up"
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        : await supabase.auth.signInWithPassword({ email, password });
    setPending(false);

    if (error) return setMessage({ tone: "error", text: error.message });
    if (!data.session) {
      return setMessage({ tone: "info", text: "Account created. Check your email to confirm it, then sign in." });
    }
    // Organizers land on /organizer; requireRole sends admins on to /admin.
    router.replace(safeNextPath(searchParams.get("next")) ?? "/organizer");
    router.refresh();
  }

  const signUp = mode === "sign_up";
  return (
    <form onSubmit={submit} aria-label={signUp ? "Create an account with email" : "Sign in with email"} className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        or use email
        <span className="h-px flex-1 bg-line" />
      </div>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className="rounded-xl border border-field bg-white p-3 text-sm text-ink">
          {message.text}
        </p>
      )}

      {signUp && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Full name
          <input name="name" autoComplete="name" required className={field} />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Email
        <input name="email" type="email" autoComplete="email" required className={field} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Password
        <input
          name="password"
          type="password"
          autoComplete={signUp ? "new-password" : "current-password"}
          minLength={signUp ? 8 : undefined}
          required
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-[48px] items-center justify-center rounded-xl border border-brand bg-white text-base font-semibold text-brand hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Please wait…" : signUp ? "Create account" : "Sign in with email"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(signUp ? "sign_in" : "sign_up");
          setMessage(null);
        }}
        className="self-start text-sm font-semibold text-brand hover:underline"
      >
        {signUp ? "Have an account? Sign in" : "New here? Create an account"}
      </button>
    </form>
  );
}
