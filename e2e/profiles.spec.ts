// Profile tests (ProfileTests.md): 3 organizers on 3 campuses create courses in the app,
// and Kelsi (IAHV admin) sees them on the dashboard. Everything goes through the UI;
// accounts come from e2e/auth.setup.ts, which also uses the app's own sign-up form.
//
// Runs in order: P-tests create the data the A-tests check. Needs the e2e Supabase
// project (see ProfileTests.md); without .env.e2e.local these tests are skipped.
import { expect, test, type Browser, type Page } from "@playwright/test";
import { formatRange } from "@/lib/dates";
import { DRAFT_COURSE, KELSI, ORGANIZERS, authFile, byId, type Persona } from "./support/personas";

test.describe.configure({ mode: "serial" });
test.skip(!process.env.E2E_SUPABASE_URL, "Needs the e2e Supabase project: create .env.e2e.local (see ProfileTests.md).");

/** Course ids created in this run, by persona. */
const created = new Map<Persona["id"], string>();

async function as(browser: Browser, id: Persona["id"]): Promise<Page> {
  const context = await browser.newContext({ storageState: authFile(id) });
  return context.newPage();
}

const courseRow = (page: Page, name: string) => page.getByRole("row").filter({ hasText: name });
const stepStatus = (page: Page, step: number) =>
  page.getByRole("navigation", { name: "Course progress" }).getByRole("listitem").nth(step - 1);

async function fillStep1(page: Page, p: Persona) {
  const c = p.course!;
  await page.getByLabel("Course name").fill(c.name);
  await page.getByRole("button", { name: /SKY Happiness Retreat/ }).click();
  await page.getByLabel("Start date").fill(c.start);
  await page.getByLabel("End date").fill(c.end);
  await page.getByLabel("University or college (full name)").fill(p.campus!);
  await page.getByLabel("Estimated participants").fill(String(c.participants));
  for (const f of c.funders) await page.getByRole("button", { name: f, exact: true }).click();
}

// ---- Organizers ------------------------------------------------------------

test.describe("organizers", () => {
  for (const p of ORGANIZERS) {
    test(`P1 ${p.name} starts with no courses`, async ({ browser }) => {
      const page = await as(browser, p.id);
      await page.goto("/organizer");
      await expect(page.getByRole("heading", { name: "My courses" })).toBeVisible();
      await expect(page.getByText("No courses yet.")).toBeVisible();
    });
  }

  for (const p of ORGANIZERS) {
    test(`P2 ${p.name} creates "${p.course!.name}" at ${p.campus}`, async ({ browser }) => {
      const page = await as(browser, p.id);
      await page.goto("/organizer/courses/new");
      await fillStep1(page, p);
      await page.getByRole("button", { name: /Save & continue/ }).click();

      // University-funded courses go to step 3 (funding); student-paid ones skip to step 4.
      const next = p.course!.funders.includes("Students pay") ? "invoice" : "funding";
      await expect(page).toHaveURL(new RegExp(`/organizer/courses/([0-9a-f-]{36})/${next}$`));
      created.set(p.id, page.url().match(/courses\/([0-9a-f-]{36})/)![1]);

      await page.goto("/organizer");
      const card = page.getByRole("article").filter({ hasText: p.course!.name });
      await expect(card).toBeVisible();
      await expect(card).toContainText(p.campus!);
      await expect(card.getByText(/Step \d of 8/)).toBeVisible();
    });
  }

  test("P3 an organizer can't see another campus's course", async ({ browser }) => {
    const page = await as(browser, "org-umd");
    await page.goto("/organizer");
    await expect(page.getByRole("article").filter({ hasText: byId("org-purdue").course!.name })).toHaveCount(0);

    // Opening it directly doesn't show it: the app sends Alex back to his own home (or 404s).
    await page.goto(`/organizer/courses/${created.get("org-purdue")}`);
    await expect(page.getByRole("heading", { level: 1 })).not.toContainText(byId("org-purdue").course!.name);
    await expect(page.getByText(byId("org-purdue").course!.name)).toHaveCount(0);
  });

  test("P4 an organizer can't open the IAHV dashboard", async ({ browser }) => {
    const page = await as(browser, "org-purdue");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/organizer$/);
  });

  test("P5 a course saved as a draft shows as a draft", async ({ browser }) => {
    const page = await as(browser, "org-toronto");
    await page.goto("/organizer/courses/new");
    await page.getByLabel("Course name").fill(DRAFT_COURSE);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/organizer$/);
    await expect(page.getByRole("article").filter({ hasText: DRAFT_COURSE })).toContainText("Draft");
  });
});

// ---- Kelsi, IAHV admin -------------------------------------------------------

test.describe("Kelsi on the IAHV dashboard", () => {
  test("A1 every organizer's course shows up with its campus and organizer", async ({ browser }) => {
    const page = await as(browser, KELSI.id);
    await page.goto("/admin?q=E2E");
    await expect(page.getByRole("checkbox", { name: /^Select / })).toHaveCount(ORGANIZERS.length + 1); // + the draft
    for (const p of ORGANIZERS) {
      const row = courseRow(page, p.course!.name);
      await expect(row).toContainText(p.campus!);
      await expect(row).toContainText(p.name);
      await expect(row).toContainText(formatRange(p.course!.start, p.course!.end));
    }
    await expect(courseRow(page, DRAFT_COURSE)).toContainText(byId("org-toronto").name);
  });

  test("A2 the campus filter shows exactly that campus's courses", async ({ browser }) => {
    const page = await as(browser, KELSI.id);
    for (const p of ORGANIZERS.filter((o) => o.id !== "org-toronto")) {
      await page.goto("/admin?q=E2E");
      await page.getByLabel("Campus", { exact: true }).selectOption(p.campus!);
      await expect(page.getByRole("checkbox", { name: /^Select / })).toHaveCount(1);
      await expect(courseRow(page, p.course!.name)).toBeVisible();
    }
  });

  test("A2b Country = Canada shows only the Toronto course", async ({ browser }) => {
    // The course's country comes from its campus (University of Toronto is CA).
    const page = await as(browser, KELSI.id);
    await page.goto("/admin?q=E2E&country=CA");
    await expect(courseRow(page, byId("org-toronto").course!.name)).toBeVisible();
    await expect(courseRow(page, byId("org-umd").course!.name)).toHaveCount(0);
  });

  test("A3 the UMD course detail shows its organizer, campus and steps", async ({ browser }) => {
    const p = byId("org-umd");
    const page = await as(browser, KELSI.id);
    await page.goto(`/admin/courses/${created.get(p.id)}`);
    await expect(page.getByRole("heading", { name: p.course!.name })).toBeVisible();
    await expect(page.getByText(`Organizer ${p.name}`)).toBeVisible();
    await expect(page.getByRole("link", { name: p.email })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Course progress" }).getByRole("listitem")).toHaveCount(8);
    await expect(stepStatus(page, 1)).toContainText("In progress");
    await expect(stepStatus(page, 3)).toContainText("To do"); // university pays -> funding approval needed
  });

  test("A4 the student-paid Purdue course skips funding approval", async ({ browser }) => {
    const page = await as(browser, KELSI.id);
    await page.goto(`/admin/courses/${created.get("org-purdue")}`);
    await expect(stepStatus(page, 3)).toContainText("Skipped");
  });

  test("A5 an organizer's edit shows on the dashboard", async ({ browser }) => {
    const p = byId("org-umd");
    const organizer = await as(browser, p.id);
    await organizer.goto(`/organizer/courses/${created.get(p.id)}/details`);
    await organizer.getByLabel("End date").fill("2027-03-08");
    await organizer.getByRole("button", { name: /Save & continue/ }).click();
    await expect(organizer).toHaveURL(/\/funding$/);

    const page = await as(browser, KELSI.id);
    await page.goto("/admin?q=E2E");
    await expect(courseRow(page, p.course!.name)).toContainText(formatRange(p.course!.start, "2027-03-08"));
  });

  test("A6 the CSV export lists every organizer's course and email", async ({ browser }) => {
    const page = await as(browser, KELSI.id);
    const res = await page.request.get("/admin/export?q=E2E");
    expect(res.headers()["content-type"]).toContain("text/csv");
    const csv = await res.text();
    for (const p of ORGANIZERS) {
      expect(csv).toContain(p.course!.name);
      expect(csv).toContain(p.email);
    }
  });

  test("A7 settings and reminders load, and reminders come from Kelsi", async ({ browser }) => {
    const page = await as(browser, KELSI.id);
    await page.goto("/admin/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.goto("/admin/reminders");
    await expect(page.getByRole("heading", { name: "Email reminders" })).toBeVisible();
    await expect(page.getByText(KELSI.email).first()).toBeVisible();
  });
});
