// End-to-end tests (sprint-planning.md B-0.2). Run with `npm run e2e`.
// First time on a machine: `npx playwright install chromium`.
import { defineConfig, devices } from "@playwright/test";

// Engineer B's dev port (sprint-planning.md 1.2). Override with E2E_PORT.
const PORT = Number(process.env.E2E_PORT ?? 3001);
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
