// Admin pages, end to end (Engineer B). Sample data until the backend lands; each test
// starts from the same data via POST /admin/dev-reset.
import { expect, test, type Page } from "@playwright/test";

const courseRows = (page: Page) => page.getByRole("checkbox", { name: /^Select / });

// Skipped: these tests drive the old sample courses (purdue-winter-2027, 8 rows, Maya Chen),
// which B-1.1 replaced with Supabase, and they run signed out, which /admin no longer allows.
// The dashboard and course detail are now covered by e2e/profiles.spec.ts (as Kelsi).
// TODO(B-3.1): rebuild the action/reminder/settings tests on seeded e2e-project courses.
test.skip(true, "Sample-data admin tests; replaced by profiles.spec.ts until B-3.1 rebuilds them on Supabase data");

test.beforeEach(async ({ request }) => {
  expect((await request.post("/admin/dev-reset")).ok()).toBe(true);
});

test.describe("dashboard filters (B-1.2) and export (B-7.1)", () => {
  test("lists every course, and queue tiles filter through the URL", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "All SKY Campus courses" })).toBeVisible();
    await expect(courseRows(page)).toHaveCount(8);

    await page.getByRole("link", { name: /Needs follow-up/ }).click();
    await expect(page).toHaveURL(/\/admin\?queue=follow$/);
    await expect(courseRows(page)).toHaveCount(3);
    await expect(page.getByRole("link", { name: /Needs follow-up/ })).toHaveAttribute("aria-current", "page");
  });

  test("step, country and search update the URL", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Step", { exact: true }).selectOption("4");
    await expect(page).toHaveURL(/step=4/);
    await expect(courseRows(page)).toHaveCount(3);

    await page.getByLabel("Country", { exact: true }).selectOption("CA");
    await expect(page.getByText("No courses match these filters.")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByLabel("Search", { exact: true }).fill("maya");
    await expect(page).toHaveURL(/q=maya/);
    await expect(courseRows(page)).toHaveCount(2);
  });

  test("a shared link opens with its filters applied", async ({ page }) => {
    await page.goto("/admin?campus=University%20of%20Maryland%2C%20College%20Park&queue=funding");
    await expect(page.getByLabel("Campus", { exact: true })).toHaveValue("University of Maryland, College Park");
    await expect(courseRows(page)).toHaveCount(1);
  });

  test("Download CSV exports the current view", async ({ page, request }) => {
    await page.goto("/admin?queue=follow");
    await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", "/admin/export?queue=follow");
    const res = await request.get("/admin/export?queue=follow");
    expect(res.headers()["content-type"]).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("Course,Campus,Country,Organizer");
    expect(csv).toContain("Rutgers Fall Retreat");
    expect(csv.trim().split("\r\n")).toHaveLength(4); // header + 3 courses
  });
});

test.describe("course actions (B-3.1, B-5.1, B-6.1)", () => {
  test("issue an invoice number, mark it paid, and close the course", async ({ page }) => {
    await page.goto("/admin/courses/purdue-winter-2027");
    await expect(page.getByText("Invoice requested")).toBeVisible();

    await page.getByLabel("Invoice number").fill("INV-1");
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Issued invoice INV-1." })).toBeVisible();
    await expect(page.getByText("Pending payment")).toBeVisible();

    await page.getByRole("button", { name: "Mark paid" }).click();
    await expect(page.getByRole("button", { name: "Close course" })).toBeVisible();
    await page.getByRole("button", { name: "Close course" }).click();
    await expect(page.getByText("Nothing is waiting on IAHV for this course.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Activity" }).getByRole("listitem").first()).toContainText("IAHV Admin closed the course");

    await page.goto("/admin?queue=invoice");
    await expect(courseRows(page)).toHaveCount(0);
  });

  test("an invoice number already in use is refused", async ({ page }) => {
    await page.goto("/admin/courses/purdue-winter-2027");
    await page.getByLabel("Invoice number").fill("INV-24817");
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "INV-24817" })).toHaveText("Invoice INV-24817 is already used on another course.");
  });

  test("approve funding from the funding queue", async ({ page }) => {
    await page.goto("/admin?queue=funding");
    await page.getByRole("link", { name: "Review & approve" }).click();
    await expect(page.getByRole("link", { name: "mchen@umd.edu" })).toBeVisible();
    await page.getByRole("button", { name: "Approve funding" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Funding approved" })).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("link", { name: /Funding approvals/ })).toContainText("0");
  });

  test("issue a quote number", async ({ page }) => {
    await page.goto("/admin/courses/ucla-spring-2027");
    await page.getByLabel("Quote number").fill("Q-1042");
    await page.getByRole("button", { name: "Issue quote" }).click();
    await expect(page.getByText("Quote issued")).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark accepted" })).toBeVisible();
  });
});

test.describe("reminder emails (B-4.3)", () => {
  test("send to courses picked on the dashboard, From the admin and To each organizer", async ({ page }) => {
    await page.goto("/admin?queue=follow");
    await page.getByRole("checkbox", { name: "Select Rutgers Fall Retreat" }).check();
    await page.getByRole("checkbox", { name: "Select Fall Premium Retreat" }).check();
    await page.getByRole("link", { name: "Email reminder →" }).click();

    await expect(page.getByRole("button", { name: /Picked on the dashboard · 2/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("<admin@iahv.org>")).toBeVisible();
    await page.getByLabel("Template").selectOption("payment_overdue");
    await page.getByLabel("Preview for").selectOption({ label: "Hannah Lee" });
    await expect(page.getByText("<hlee@rutgers.edu>")).toBeVisible();
    await expect(page.getByText("Payment for Rutgers Fall Retreat is past due")).toBeVisible(); // filled-in preview

    await page.getByRole("button", { name: "Send to 2 organizers" }).click();
    await expect(page.getByRole("status")).toContainText("Sent to 2 organizers (dev mode");
    await expect(page.getByRole("region", { name: "Recently sent" }).getByRole("listitem").first()).toContainText("Payment overdue · 2 courses");
  });

  test("refuses to send a message with a gap for a course", async ({ page }) => {
    await page.goto("/admin/reminders?courses=ut-austin-fall-2026&template=submit_accounting");
    await page.getByRole("button", { name: "Send to 1 organizer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "UT Austin" })).toContainText("UT Austin Fall Retreat has no invoice number");
  });

  test("no automatic panel; the row action opens the composer with the right template", async ({ page }) => {
    await page.goto("/admin/reminders");
    await expect(page.getByText("Automatic reminders")).toHaveCount(0);
    await page.goto("/admin?queue=follow");
    await page.getByRole("row", { name: /UT Austin Fall Retreat/ }).getByRole("link", { name: "Send reminder" }).click();
    await expect(page.getByLabel("Template")).toHaveValue("request_invoice");
    await expect(page.getByText("<pshah@utexas.edu>")).toBeVisible();
  });
});

test.describe("settings (B-2.2, B-4.4, B-5.3)", () => {
  test("change roles, but not your own", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("aria-current", "page");
    await page.getByRole("row", { name: /Maya Chen/ }).getByRole("button", { name: "Make admin" }).click();
    await expect(page.getByRole("status")).toHaveText("Maya Chen is now an IAHV admin.");
    await page.getByRole("row", { name: /IAHV Admin.*\(you\)/ }).getByRole("button", { name: "Make organizer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "admin access" })).toContainText("You can't remove your own admin access");
  });

  test("edit a reminder text; misspelled fields can't be saved", async ({ page }) => {
    await page.goto("/admin/settings");
    const editor = page.getByRole("listitem").filter({ hasText: "Payment overdue" });
    await editor.getByRole("button", { name: "Edit text" }).click();
    await editor.getByLabel("Subject").fill("Late: {{course_nmae}}");
    await expect(editor.getByRole("button", { name: "Save text" })).toBeDisabled();
    await editor.getByLabel("Subject").fill("Overdue: {{course_name}}");
    await editor.getByRole("button", { name: "Save text" }).click();
    await expect(editor.getByRole("status")).toHaveText("Saved. New reminders use this text.");

    await page.goto("/admin/reminders?courses=rutgers-fall-2026&template=payment_overdue");
    await expect(page.getByText("Overdue: Rutgers Fall Retreat")).toBeVisible();
  });

  test("save pricing and see it in fee estimates", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel(/SKY Happiness Retreat/).fill("600");
    await expect(page.getByText("costs $1,000.00")).toBeVisible(); // live example
    await page.getByRole("button", { name: "Save pricing" }).click();
    await expect(page.getByText("Pricing saved.")).toBeVisible();
    await page.goto("/admin/courses/umd-spring-2027");
    await expect(page.getByText("$1,000.00")).toBeVisible();
  });
});

test("unknown course shows not found", async ({ page }) => {
  await page.goto("/admin/courses/does-not-exist");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
