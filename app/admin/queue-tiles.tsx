import Link from "next/link";
import { cx } from "@/components/ui";
import type { AdminFilters } from "@/lib/data/admin";
import type { AdminQueue } from "@/lib/types";
import { adminHref } from "./filters";

const QUEUES: { id: AdminQueue | "all"; label: string }[] = [
  { id: "all", label: "All courses" },
  { id: "funding", label: "Funding approvals" },
  { id: "quote", label: "Quote requests" },
  { id: "invoice", label: "Invoice requests" },
  { id: "payment", label: "Pending payment" },
  { id: "follow", label: "Needs follow-up" },
];

/** Queue tiles are links, so each queue has its own shareable URL. */
export function QueueTiles({ filters, counts }: { filters: AdminFilters; counts: Record<AdminQueue | "all", number> }) {
  return (
    <nav aria-label="Queues" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
      {QUEUES.map((q) => {
        const on = q.id === filters.queue;
        return (
          <Link
            key={q.id}
            href={adminHref({ ...filters, queue: q.id })}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={cx(
              "flex min-h-24 flex-col items-start gap-1.5 rounded-2xl border p-4 no-underline",
              on ? "border-brand bg-brand text-white hover:text-white" : "border-line bg-white text-ink hover:border-field hover:text-ink",
            )}
          >
            <span
              className={cx(
                "text-3xl leading-none font-bold",
                on ? "text-white" : q.id === "follow" ? "text-danger-fg" : "text-brand-dark",
              )}
            >
              {counts[q.id]}
            </span>
            <span className="text-sm leading-[1.3] font-semibold">{q.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
