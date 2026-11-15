import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { getAdminMe } from "@/lib/data/admin-db";

// Everything under /admin depends on who is signed in, so it renders at request time
// behind this Suspense boundary (cacheComponents). Only IAHV admins get past getAdminMe:
// signed-out visitors go to /login and organizers to /organizer.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" aria-busy="true" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: ReactNode }) {
  const me = await getAdminMe();
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader role="admin" initials={me.initials} />
      {children}
    </div>
  );
}
