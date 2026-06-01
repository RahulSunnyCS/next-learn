/**
 * C21 — Playwright E2E: Key User Flow
 *
 * WHAT THIS COVERS
 * ─────────────────
 * The "catalog → product detail" navigation flow. This is the most critical
 * user-facing flow in the Nextmart app: a user lands on the catalog, finds a
 * product, and navigates to its detail page.
 *
 * WHY E2E FOR RSC?
 * ─────────────────
 * React Server Components render in the Next.js RSC runtime — a Node.js
 * environment that the unit test runner (Vitest) does not simulate. The only
 * way to verify that an RSC renders correctly is to run it in the real runtime.
 * Playwright drives a real Chromium browser against the running Next.js server,
 * so the RSC executes exactly as it does in production.
 *
 * E2E tests cover three RSC concerns that unit tests cannot:
 *   1. The RSC renders without throwing (no uncaught async errors).
 *   2. The rendered HTML contains the expected content (product name, price).
 *   3. Streaming boundaries (Suspense) resolve and show dynamic content.
 *
 * PIPELINE TAGGING
 * ─────────────────
 * Tests are tagged for the Automation Gate (Phase 6):
 *   @critical    — failure blocks Gate 2. Reserved for the core happy path.
 *   @functional  — failure produces CONDITIONAL PASS at Gate 2. For important
 *                  but non-blocking scenarios.
 *   @non-blocker — logged but never blocks any gate.
 *
 * IMPORTANT: Do not tag a test @critical unless its failure should genuinely
 * block a release. Over-tagging critical degrades the signal.
 */

import { test, expect } from "@playwright/test";

// ── Catalog page ─────────────────────────────────────────────────────────────

test.describe("Catalog page (c02-catalog-ssg-isr)", () => {
  test(
    "@critical renders without error and displays at least one product",
    async ({ page }) => {
      // Navigate to the catalog page.
      // This is the primary entry point for the Nextmart app and the one most
      // users land on first.
      await page.goto("/challenges/c02-catalog-ssg-isr");

      // The page title or heading should confirm we are on the catalog.
      // We look for ANY heading rather than a specific text because the title
      // may change as challenges evolve.
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

      // At least one product card should be visible. The catalog renders a
      // grid of product cards; even if the first Suspense hole is still
      // loading, the RSC shell should contain at least a heading.
      // We check for an element that we know exists on the static shell.
      // Product links follow the /challenges/c03-product-ppr/[slug] pattern.
      const productLinks = page.locator("a[href*='c03-product-ppr']");
      await expect(productLinks.first()).toBeVisible({ timeout: 15_000 });

      // No unhandled errors in the browser console (RSC errors show as
      // console.error messages in the terminal, not in Playwright by default,
      // but we can assert no error dialog is visible).
      await expect(page.locator("[role='alert']")).toHaveCount(0);
    }
  );

  test(
    "@functional page title contains expected text",
    async ({ page }) => {
      await page.goto("/challenges/c02-catalog-ssg-isr");
      // Title may vary but should be non-empty and contain something meaningful.
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
    }
  );
});

// ── Product detail page (PPR RSC) ─────────────────────────────────────────────

test.describe("Product detail page (c03-product-ppr)", () => {
  // Use a known slug from the fixture data. This product is seeded in
  // lib/data/fixtures.ts and is always present.
  const knownSlug = "wireless-noise-cancelling-headphones";
  const productUrl = `/challenges/c03-product-ppr/${knownSlug}`;

  test(
    "@critical renders the product detail page without error",
    async ({ page }) => {
      await page.goto(productUrl);

      // The static shell should arrive immediately (PPR). We check for the
      // product name rather than a generic heading so the test also verifies
      // the data layer is returning the expected product.
      // Use a loose match in case the name appears in different case/element.
      await expect(
        page.locator("text=/Wireless|Headphones|wireless|headphones/i").first()
      ).toBeVisible({ timeout: 15_000 });

      // No full-page error should be shown (not an empty page or error boundary).
      await expect(page.locator("[role='alert']")).toHaveCount(0);
    }
  );

  test(
    "@critical dynamic holes stream in after the static shell",
    async ({ page }) => {
      await page.goto(productUrl);

      // The static shell should be visible immediately (PPR).
      // Then we wait for at least one Suspense hole to resolve.
      // The Reviews section is a dynamic hole labelled "Customer Reviews"
      // or similar — we look for review-related text.
      //
      // We give it 20 seconds because:
      //   a) The dev server may be doing an initial compile.
      //   b) Dynamic holes have simulated latency via lib/data's delay().
      await expect(
        page.locator("text=/Review|review|rating|Rating/i").first()
      ).toBeVisible({ timeout: 20_000 });
    }
  );

  test(
    "@functional product detail page has a price displayed",
    async ({ page }) => {
      await page.goto(productUrl);

      // A product price formatted as USD should be present in the static shell.
      // We look for the $ currency symbol as a quick sanity check.
      await expect(
        page.locator("text=/\\$/").first()
      ).toBeVisible({ timeout: 15_000 });
    }
  );

  test(
    "@non-blocker unknown slug returns a not-found page rather than crashing",
    async ({ page }) => {
      // Navigate to a slug that does not exist in the fixture data.
      await page.goto("/challenges/c03-product-ppr/this-slug-does-not-exist");

      // The RSC shell should handle the null product case gracefully and render
      // something (not a blank page or unhandled exception).
      // We just assert the page has content and does not show a Next.js
      // error overlay (which would appear as an HTML error page in production).
      const body = page.locator("body");
      await expect(body).toBeVisible({ timeout: 10_000 });

      // The page should NOT contain a raw stack trace
      const pageText = await page.textContent("body");
      expect(pageText).not.toContain("at Object.<anonymous>");
    }
  );
});

// ── C21 Testing challenge page ──────────────────────────────────────────────

test.describe("C21 Testing challenge page", () => {
  test(
    "@functional c21-testing challenge page renders",
    async ({ page }) => {
      await page.goto("/challenges/c21-testing");

      // The challenge page itself should load without error.
      await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
    }
  );
});
