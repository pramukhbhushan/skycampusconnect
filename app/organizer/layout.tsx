import { AppHeader } from "@/components/app-header";
import { getCurrentOrganizer } from "@/lib/mock-data";

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  const me = getCurrentOrganizer();
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader role="organizer" initials={me.initials} />
      {children}
    </div>
  );
}
