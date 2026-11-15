// Admin pages, end to end (Engineer B), signed in as Kelsi (IAHV admin) on real Supabase data.
// Four fixture courses ("AFX ...", owned by Alex Rivera) give each admin queue something to
// act on: a funding request, a quote, an invoice and an overdue invoice. They're added with the
// service role because organizers can't submit those from the app yet (A-3.1/A-5.1/A-6.2), and
// removed again afterAll. Admin actions still change server memory (until B-3.1), so each test
// starts from a reset via POST /admin/dev-reset.
import { expect, test, type Page } from "@playwright/test";
import { KELSI, authFile, byId } from "./support/personas";
import { FIXTURE_PREFIX, deleteAdminFixtures, seedAdminFixtures, type AdminFixtures } from "./support/supabase-admin";

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_SUPABASE_URL, "Needs the e2e Supabase settings: create .env.e2e.local (see ProfileTests.md).");
test.use({ storageState: authFile(KELSI.id) });

const ALEX = byId("org-umd");
let fx: AdminFixtures;

const courseRows = (page: Page) => page.getByRole("checkbox", { name: /^Select / });
const fixtureView = `/admin?q=${FIXTURE_PREFIX}`;

test.beforeAll(async () => {
  fx = await seedAdminFixtures(ALEX.email, ALEX.campus!);
});

test.afterAll(async () => {
  await deleteAdminFixtures();
});

test.beforeEach(async ({ page }) => {
  expect((await page.request.post("/admin/dev-reset")).ok()).toBe(true);
});

test.describe("dashboard filters (B-1.2) and export (B-7.1)", () => {
  test("queue tiles filter through the URL", async ({ page }) => {
    await page.goto(fixtureView);
    await expect(page.getByRole("heading", { name: "All SKY Campus courses" })).toBeVisible();
    await expect(courseRows(page)).toHaveCount(4);

    await page.getByRole("link", { name: /Funding approvals/ }).click();
    await expect(page).toHaveURL(/queue=funding/);
    await expect(courseRows(page)).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: fx.funding.name })).toBeVisible();
  });

  test("a shared link opens with its filters applied", async ({ page }) => {
    await page.goto(`${fixtureView}&campus=${encodeURIComponent(ALEX.campus!)}&queue=invoice`);
    await expect(page.getByLabel("Campus", { exact: true })).toHaveValue(ALEX.campus!);
    await expect(courseRows(page)).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: fx.invoice.name })).toBeVisible();
  });

  test("Download CSV exports the current view", async ({ page }) => {
    await page.goto(`${fixtureView}&queue=invoice`);
    await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute("href", /\/admin\/export\?.*queue=invoice/);
    const res = await page.request.get(`/admin/export?q=${FIXTURE_PREFIX}&queue=invoice`);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("Course,Campus,Country,Organizer");
    expect(csv).toContain(fx.invoice.name);
    expect(csv).toContain(ALEX.email);
    expect(csv.trim().split("\r\n")).toHaveLength(2); // header + 1 course
  });
});

test.describe("course actions (B-3.1, B-5.1, B-6.1)", () => {
  test("issue an invoice number, mark it paid, and close the course", async ({ page }) => {
    await page.goto(`/admin/courses/${fx.invoice.id}`);
    await expect(page.getByText("Invoice requested").first()).toBeVisible();

    await page.getByLabel("Invoice number").fill("E2E-INV-2");
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Issued invoice E2E-INV-2." })).toBeVisible();
    await expect(page.getByText("Pending payment").first()).toBeVisible();

    await page.getByRole("button", { name: "Mark paid" }).click();
    await page.getByRole("button", { name: "Close course" }).click();
    await expect(page.getByText("Nothing is waiting on IAHV for this course.")).toBeVisible();
    await expect(page.getByRole("region", { name: "Activity" }).getByRole("listitem").first()).toContainText("closed the course");
  });

  test("an invoice number already in use is refused", async ({ page }) => {
    await page.goto(`/admin/courses/${fx.invoice.id}`);
    await page.getByLabel("Invoice number").fill(`${FIXTURE_PREFIX}-INV-1`);
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByRole("alert").filter({ hasText: `${FIXTURE_PREFIX}-INV-1` })).toHaveText(
      `Invoice ${FIXTURE_PREFIX}-INV-1 is already used on another course.`,
    );
  });

  test("approve funding from the funding queue", async ({ page }) => {
    await page.goto(`${fixtureView}&queue=funding`);
    await page.getByRole("row").filter({ hasText: fx.funding.name }).getByRole("link", { name: "Review & approve" }).click();
    await expect(page.getByRole("link", { name: ALEX.email })).toBeVisible();
    await page.getByRole("button", { name: "Approve funding" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Funding approved" })).toBeVisible();
    await page.goto(fixtureView);
    await expect(page.getByRole("link", { name: /Funding approvals/ })).toContainText("0");
  });

  test("issue a quote number", async ({ page }) => {
    await page.goto(`/admin/courses/${fx.quote.id}`);
    await page.getByLabel("Quote number").fill("E2E-Q-1");
    await page.getByRole("button", { name: "Issue quote" }).click();
    await expect(page.getByText("Quote issued").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark accepted" })).toBeVisible();
  });
});

test.describe("reminder emails (B-4.3)", () => {
  test("send to a course picked on the dashboard, From Kelsi and To the organizer", async ({ page }) => {
    await page.goto(fixtureView);
    await page.getByRole("checkbox", { name: `Select ${fx.overdue.name}` }).check();
    await page.getByRole("link", { name: "Email reminder →" }).click();

    await expect(page.getByRole("button", { name: /Picked on the dashboard · 1/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(`<${KELSI.email}>`)).toBeVisible();
    await page.getByLabel("Template").selectOption("payment_overdue");
    await expect(page.getByText(`<${ALEX.email}>`)).toBeVisible();
    await expect(page.getByText(`Payment for ${fx.overdue.name} is past due`)).toBeVisible();

    await page.getByRole("button", { name: "Send to 1 organizer" }).click();
    await expect(page.getByRole("status")).toContainText("Sent to 1 organizer");
    await expect(page.getByRole("region", { name: "Recently sent" }).getByRole("listitem").first()).toContainText("Payment overdue");
  });

  test("refuses to send a message with a gap for a course", async ({ page }) => {
    await page.goto(`/admin/reminders?courses=${fx.funding.id}&template=submit_accounting`);
    await page.getByRole("button", { name: "Send to 1 organizer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: fx.funding.name })).toContainText("has no invoice number");
  });
});

test.describe("settings (B-4.4, B-5.3)", () => {
  // Users & roles still lists sample people until B-2.2 reads profiles, so it isn't tested here.

  test("edit a reminder text; misspelled fields can't be saved", async ({ page }) => {
    await page.goto("/admin/settings");
    const editor = page.getByRole("listitem").filter({ hasText: "Payment overdue" });
    await editor.getByRole("button", { name: "Edit text" }).click();
    await editor.getByLabel("Subject").fill("Late: {{course_nmae}}");
    await expect(editor.getByRole("button", { name: "Save text" })).toBeDisabled();
    await editor.getByLabel("Subject").fill("Overdue: {{course_name}}");
    await editor.getByRole("button", { name: "Save text" }).click();
    await expect(editor.getByRole("status")).toHaveText("Saved. New reminders use this text.");

    await page.goto(`/admin/reminders?courses=${fx.overdue.id}&template=payment_overdue`);
    await expect(page.getByText(`Overdue: ${fx.overdue.name}`)).toBeVisible();
  });

  test("save pricing and see it in fee estimates", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByLabel(/SKY Happiness Retreat/).fill("600");
    await page.getByRole("button", { name: "Save pricing" }).click();
    await expect(page.getByText("Pricing saved.")).toBeVisible();
    // 12 students: $600 + 2 x $100
    await page.goto(`/admin/courses/${fx.funding.id}`);
    await expect(page.getByText("$800.00")).toBeVisible();
  });
});

test("unknown course shows not found", async ({ page }) => {
  await page.goto("/admin/courses/00000000-0000-4000-8000-000000000000");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});
