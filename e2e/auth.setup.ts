// Runs before the profile tests (Playwright "setup" project). Creates the four test people
// the way a real person would: the app's "Create account" form on /login. Then saves each
// sign-in to e2e/.auth/<id>.json so the tests start signed in.
//
// Needs the e2e Supabase project with Email sign-in on and "Confirm email" off, and the
// test server pointed at it (playwright.config.ts does that). See ProfileTests.md.
import { expect, test as setup } from "@playwright/test";
import { KELSI, ORGANIZERS, PERSONAS, authFile, password, type Persona } from "./support/personas";
import { ensureCampuses, makeAdmin, wipeTestPeople } from "./support/supabase-admin";

setup.describe.configure({ mode: "serial" });

setup("start clean: remove last run's test people and courses", async () => {
  await wipeTestPeople();
  // IAHV's campus list: the three test campuses with their countries (Toronto is CA).
  await ensureCampuses(ORGANIZERS.map((o) => ({ name: o.campus!, country: o.country! })));
});

async function createAccount(page: import("@playwright/test").Page, p: Persona) {
  await page.goto("/login");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  const form = page.getByRole("form", { name: "Create an account with email" });
  await form.getByLabel("Full name").fill(p.name);
  await form.getByLabel("Email").fill(p.email);
  await form.getByLabel("Password").fill(password());
  await form.getByRole("button", { name: "Create account" }).click();
  // Every new account starts as an organizer (database trigger), so it lands on /organizer.
  await expect(page).toHaveURL(/\/organizer$/);
}

for (const p of PERSONAS) {
  setup(`create account through the app: ${p.name}`, async ({ page }) => {
    await createAccount(page, p);

    if (p.id === KELSI.id) {
      await makeAdmin(p.email);
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "All SKY Campus courses" })).toBeVisible();
    }
    await page.context().storageState({ path: authFile(p.id) });
  });
}
