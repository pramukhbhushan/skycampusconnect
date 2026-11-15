// End-to-end tests (sprint-planning.md B-0.2). Run with `npm run e2e`.
// First time on a machine: `npx playwright install chromium`.
//
// Profile tests (ProfileTests.md) need the separate e2e Supabase project. Put its settings
// in .env.e2e.local (gitignored). When that file exists, Playwright starts its OWN dev
// server pointed at the e2e project with GUEST_LOGIN=true, so stop your `npm run dev`
// first (Next refuses two dev servers in one folder). Other port: E2E_PORT=3001.
import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// The shared dev project's URL, read before the e2e values, so the setup can refuse to
// touch it by mistake. loadEnvFile never overwrites a variable that is already set.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
process.env.SHARED_SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
if (existsSync(".env.e2e.local")) process.loadEnvFile(".env.e2e.local");

const e2eProject = !!process.env.E2E_SUPABASE_URL;
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one database and build on each other's data, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    // Creates the test accounts through the app's sign-up form and saves their sign-ins.
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: e2eProject ? ["setup"] : [],
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    // Against the e2e project the server must be ours (pointed at that project).
    reuseExistingServer: !process.env.CI && !e2eProject,
    timeout: 120_000,
    env: e2eProject
      ? {
          NEXT_PUBLIC_SUPABASE_URL: process.env.E2E_SUPABASE_URL!,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.E2E_SUPABASE_ANON_KEY ?? "",
          GUEST_LOGIN: "true",
        }
      : {},
  },
});
