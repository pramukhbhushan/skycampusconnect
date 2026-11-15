"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle } from "@/components/icons";
import { OptionCard } from "@/components/ui";
import type { Role } from "@/lib/types";

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "organizer", label: "Organizer", desc: "Plan and run courses on my campus" },
  { id: "admin", label: "IAHV Admin", desc: "Finance & SKY Campus team: all courses" },
];

// TODO(backend): replace the link with a Supabase magic-link sign-in that
// restricts organizers to campus domains and admins to invited IAHV emails.
export function LoginForm() {
  const [role, setRole] = useState<Role>("organizer");
  const isAdmin = role === "admin";

  return (
    <form className="flex w-full max-w-[440px] flex-col gap-[26px]">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold">Log in</h2>
        <p className="text-base text-muted">Choose your view, then we&apos;ll email you a sign-in link.</p>
      </div>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold">I&apos;m logging in as</legend>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((r) => {
            const on = r.id === role;
            return (
              <OptionCard key={r.id} selected={on} onClick={() => setRole(r.id)} className="min-h-28 gap-2">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold">{r.label}</span>
                  {on && <CheckCircle size={20} strokeWidth={2.4} className="text-brand" />}
                </span>
                <span className="text-sm leading-[1.45] text-muted">{r.desc}</span>
              </OptionCard>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-email" className="text-sm font-semibold">
          {isAdmin ? "IAHV email" : "Campus email"}
        </label>
        <input
          id="login-email"
          type="email"
          placeholder={isAdmin ? "name@iahv.org" : "you@umd.edu"}
          className="min-h-[50px] rounded-xl border border-field bg-white px-4 text-base text-ink"
        />
      </div>

      <Link
        href={isAdmin ? "/admin" : "/organizer"}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-brand text-base font-semibold text-white no-underline hover:text-white"
      >
        {isAdmin ? "Continue to admin dashboard" : "Continue to my courses"}
        <ArrowRight />
      </Link>

      <p className="text-sm leading-normal text-muted">
        New organizer? Use your campus email and we&apos;ll set up your profile. Admin access is granted by the IAHV team.
      </p>
    </form>
  );
}
