"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, cx } from "./ui";

type NavItem = { label: string; href: string; match: (path: string) => boolean };

const ORGANIZER_NAV: NavItem[] = [
  { label: "Home", href: "/organizer", match: (p) => p === "/organizer" || (p.startsWith("/organizer/courses/") && !p.endsWith("/new")) },
  { label: "New course", href: "/organizer/courses/new", match: (p) => p === "/organizer/courses/new" },
  { label: "Guides", href: "/organizer#help", match: () => false },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Courses", href: "/admin", match: (p) => p === "/admin" || p.startsWith("/admin/courses") },
  { label: "Email reminders", href: "/admin/reminders", match: (p) => p.startsWith("/admin/reminders") },
  { label: "Settings", href: "/admin/settings", match: (p) => p.startsWith("/admin/settings") },
];

export function AppHeader({ role, initials }: { role: "organizer" | "admin"; initials: string }) {
  const path = usePathname();
  const admin = role === "admin";
  const nav = admin ? ADMIN_NAV : ORGANIZER_NAV;

  return (
    <header className={admin ? "bg-ink" : "border-b border-line-2 bg-white"}>
      <div
        className={cx(
          "mx-auto flex flex-wrap items-center justify-between gap-4 px-8 py-3.5",
          admin ? "max-w-[1320px]" : "max-w-[1240px]",
        )}
      >
        <div className="flex flex-wrap items-center gap-8">
          <Link href={admin ? "/admin" : "/organizer"} aria-label={admin ? "Admin dashboard" : "Organizer home"} className="flex items-center">
            <Logo variant={admin ? "white" : "color"} className={admin ? "h-8" : "h-[34px]"} />
          </Link>
          <nav aria-label={admin ? "Admin" : "Organizer"} className="flex flex-wrap gap-1.5 text-[15px] font-semibold">
            {nav.map((item) => {
              const active = item.match(path);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-10 items-center rounded-full px-3.5 no-underline",
                    admin
                      ? active
                        ? "bg-white text-ink hover:text-ink"
                        : "text-white hover:bg-white/10 hover:text-white"
                      : active
                        ? "bg-tint text-brand-dark"
                        : "text-ink-soft hover:bg-surface hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3.5">
          <span
            className={cx(
              "rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.06em] uppercase",
              admin ? "bg-brand-pale text-ink" : "bg-tint text-brand-dark",
            )}
          >
            {admin ? "IAHV Admin" : "Organizer"}
          </span>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-brand-bright text-[15px] font-bold text-white"
          >
            {initials}
          </span>
          <Link href="/" className={cx("text-sm font-semibold", admin ? "text-white hover:text-white" : "text-ink-soft")}>
            Log out
          </Link>
        </div>
      </div>
    </header>
  );
}
