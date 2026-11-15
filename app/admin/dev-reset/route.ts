// POST /admin/dev-reset: forget every admin change (sample mode only), so end-to-end tests
// start from the same data. Not available in production. Remove with admin-store.ts once
// the backend lands.
import { revalidatePath } from "next/cache";
import { resetAdminStore } from "@/lib/data/admin-store";

export function POST() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  resetAdminStore();
  revalidatePath("/admin", "layout");
  return Response.json({ ok: true });
}
