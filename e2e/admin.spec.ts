// Admin pages, end to end (Engineer B). Uses sample data until the backend lands.
import { expect, test, type Page } from "@playwright/test";

const courseRows = (page: Page) => page.getByRole("checkbox", { name: /^Select / });

test.describe("dashboard filters (B-1.2)", () => {
  test("lists every course, and queue tiles filter through the URL", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "All SKY Campus courses" })).toBeVisible();
    await expect(courseRows(page)).toHaveCount(8);

    await page.getByRole("link", { name: /Needs follow-up/ }).click();
    await expect(page).toHaveURL(/\/admin\?queue=follow$/);
    await expect(courseRows(page)).toHaveCount(3);
    await expect(page.getByRole("checkbox", { name: "Select Rutgers Fall Retreat" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Needs follow-up/ })).toHaveAttribute("aria-current", "page");
  });

  test("step, country and search update the URL", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Step", { exact: true }).selectOption("4");
    await expect(page).toHaveURL(/step=4/);
    await expect(courseRows(page)).toHaveCount(3);

    await page.getByLabel("Country", { exact: true }).selectOption("CA");
    await expect(page).toHaveURL(/country=CA/);
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
    await expect(page.getByRole("checkbox", { name: "Select UMD Spring Retreat" })).toBeVisible();
  });
});

test.describe("course detail (B-2.1)", () => {
  test("opens from the dashboard and shows the course", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "UMD Spring Retreat" }).click();
    await expect(page).toHaveURL("/admin/courses/umd-spring-2027");
    await expect(page.getByRole("heading", { name: "UMD Spring Retreat", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "mchen@umd.edu" })).toBeVisible();
    await expect(page.getByText("Submitted, waiting on IAHV · $900.00")).toBeVisible();
    await expect(page.getByRole("button", { name: "Review & approve" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Courses", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("unknown course shows not found", async ({ page }) => {
    const res = await page.goto("/admin/courses/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});

test("settings (B-2.2): roles, email texts and pricing", async ({ page }) => {
  await page.goto("/admin/settings");
  await expect(page.getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page");

  const maya = page.getByRole("row", { name: /Maya Chen/ });
  await maya.getByRole("button", { name: "Make admin" }).click();
  await expect(maya.getByText("IAHV admin")).toBeVisible();

  await page.getByLabel("Find a person").fill("toronto");
  await expect(page.getByRole("row")).toHaveCount(2); // header + Ethan Wong

  await page.getByText("Payment overdue", { exact: true }).click();
  await expect(page.getByText("The invoice for Rutgers Fall Retreat was due on Nov 1")).toBeVisible();
  await expect(page.getByText("Example: a SKY Happiness Retreat with 14 students costs $900.00")).toBeVisible();
});

test("reminders are manual: no automatic panel, From admin and To organizer", async ({ page }) => {
  await page.goto("/admin/reminders");
  await expect(page.getByRole("heading", { name: "Email reminders" })).toBeVisible();
  await expect(page.getByText("Automatic reminders")).toHaveCount(0);
  await expect(page.getByText("<admin@iahv.org>")).toBeVisible();
  await expect(page.getByText("<pshah@utexas.edu>")).toBeVisible();

  await page.getByRole("button", { name: /Accounting not submitted/ }).click();
  await expect(page.getByText("<mchen@umd.edu>")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send to 1 organizer" })).toBeVisible();
});
