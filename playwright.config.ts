// End-to-end tests (sprint-planning.md B-0.2). Run with `npm run e2e`.
// First time on a machine: `npx playwright install chromium`.
//
// Tests run against http://localhost:3000. If `npm run dev` is already running there,
// they use it; otherwise Playwright starts one. Next refuses a second dev server in the
// same folder, so keep the default when your dev server is up. Other port: E2E_PORT=3001.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
