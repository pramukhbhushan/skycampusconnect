// Unit tests (sprint-planning.md B-0.2). Run with `npm test`.
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    // Logic tests run in Node. A component test opts into a browser-like DOM with
    // a `// @vitest-environment jsdom` comment at the top of the file.
    environment: "node",
  },
});
