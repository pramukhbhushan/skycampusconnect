import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getMe } from "@/lib/data/organizer-db";

// Everything under /organizer depends on who is signed in, so it renders at request
// time behind this Suspense boundary (cacheComponents).
export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" aria-busy="true" />}>
      <OrganizerShell>{children}</OrganizerShell>
    </Suspense>
  );
}

async function OrganizerShell({ children }: { children: ReactNode }) {
  const me = await getMe(); // sends signed-out visitors to /login, admins to /admin
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader role="organizer" initials={me.initials} />
      {children}
    </div>
  );
}
