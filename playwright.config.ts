import { defineConfig, devices } from "@playwright/test";

// End-to-end test config. Assumes a dev server + seeded DB on APP_URL.
// `npm run test:e2e` will start the dev server automatically.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Dedicated e2e server on :3100 with deterministic auto-verification and an
    // in-process worker so the AI workflow completes without manual admin steps.
    command:
      "VERIFICATION_PROVIDER=mock-auto WORKER_IN_PROCESS=true WORKER_POLL_MS=500 APP_URL=http://localhost:3100 PORT=3100 npm run dev",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
