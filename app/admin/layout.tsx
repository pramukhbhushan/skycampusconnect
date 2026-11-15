import { AppHeader } from "@/components/app-header";
import { adminUser } from "@/lib/mock-data";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader role="admin" initials={adminUser.initials} />
      {children}
    </div>
  );
}
