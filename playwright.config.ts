/**
 * Playwright configuration — Nextmart Next.js app.
 *
 * Design decisions:
 *
 * 1. webServer — we use `npm run dev` rather than `npm run build && npm start`
 *    because the build step is time-consuming in CI and the dev server
 *    behaviour is equivalent for E2E UI testing.  If you need production-build
 *    fidelity (e.g. to test PPR streaming headers or Edge runtime behaviour),
 *    swap the command to `npm run build && npm start` and set `reuseExistingServer`
 *    to false so the build is always fresh.
 *
 * 2. baseURL — localhost:3000 is the Next.js dev server default.
 *
 * 3. testDir — we keep E2E specs in the top-level `e2e/` directory rather
 *    than inside the app directory to keep routing and testing concerns
 *    separate.  The solutions/c21-testing/e2e/ location is an alias kept
 *    for the C21 challenge package (both locations are configured in the
 *    testDir glob).
 *
 * 4. projects — we run only Chromium by default to keep CI fast.  Firefox
 *    and WebKit can be added for cross-browser coverage once the suite is
 *    stable.
 *
 * 5. fullyParallel — disabled because the tests share a single dev server
 *    process and the in-memory store is mutated by server actions.  A
 *    mutation test (e.g. submitting a review) would race against a read test
 *    if run in parallel.  Enable only if you move to isolated server
 *    instances per worker.
 *
 * 6. retries — set to 1 in CI to absorb transient network/timing flakiness.
 *    Locally set to 0 for fast feedback.
 *
 * Pipeline tags: tests should be tagged @critical, @functional, or
 * @non-blocker so the Automation Gate can classify them.  See
 * solutions/c21-testing/e2e/key-flow.spec.ts for examples.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // single worker because tests share the in-memory store
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Use the dev server for E2E tests.
    // Switch to `npm run build && npm start` for production-build fidelity.
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000, // 2 minutes for the dev server to start
  },
});
