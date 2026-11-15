import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { LoginForm } from "./login-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-white text-ink">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col justify-between gap-10 bg-brand-bright p-14 text-white max-sm:p-8">
        <Link href="/" aria-label="Back to SKY Campus Connect home" className="self-start">
          <Logo variant="white" className="h-12" />
        </Link>
        <div className="flex max-w-[480px] flex-col gap-5">
          <h1 className="text-[46px] leading-[1.08] font-bold tracking-[-0.02em] max-sm:text-4xl">
            Welcome. Let&apos;s get your retreat planned.
          </h1>
          <p className="text-lg leading-[1.55]">
            We&apos;re excited for you to get started. Log in and we&apos;ll pick up right where you left off, whether
            that&apos;s your first course or your fifth.
          </p>
        </div>
        <p className="text-sm text-[#e6eeff]">SKY Campus Connect · SKY Campus Happiness &amp; IAHV</p>
      </div>

      <div className="flex min-w-0 flex-[1_1_520px] items-center justify-center bg-white px-8 py-14">
        <Suspense>
          <div className="flex w-full max-w-[440px] flex-col gap-8">
            <LoginForm />
            <PasswordForm />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
