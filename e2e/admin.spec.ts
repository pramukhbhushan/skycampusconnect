// Admin pages, end to end (Engineer B). Uses sample data until the backend lands.
import { expect, test } from "@playwright/test";

test("admin dashboard lists every course and filters by queue", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "All SKY Campus courses" })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(1 + 8); // header + 8 sample courses

  await page.getByRole("button", { name: /Needs follow-up/ }).click();
  await expect(page.getByRole("row")).toHaveCount(1 + 3);
  await expect(page.getByRole("checkbox", { name: "Select Rutgers Fall Retreat" })).toBeVisible();
});

test("reminders are manual: no automatic panel, From admin and To organizer", async ({ page }) => {
  await page.goto("/admin/reminders");
  await expect(page.getByRole("heading", { name: "Email reminders" })).toBeVisible();

  // plan-v3: no automatic reminders.
  await expect(page.getByText("Automatic reminders")).toHaveCount(0);

  // Preview addresses the first recipient of the selected queue.
  await expect(page.getByText("<admin@iahv.org>")).toBeVisible();
  await expect(page.getByText("<pshah@utexas.edu>")).toBeVisible();

  // Switching queue changes the To address.
  await page.getByRole("button", { name: /Accounting not submitted/ }).click();
  await expect(page.getByText("<mchen@umd.edu>")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send to 1 organizer" })).toBeVisible();
});
