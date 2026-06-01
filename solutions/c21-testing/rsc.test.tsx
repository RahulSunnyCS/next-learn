/**
 * C21 — RSC Logic Test
 *
 * WHY NOT SHALLOW-RENDER THE RSC?
 * ────────────────────────────────
 * React Server Components execute in the Next.js RSC runtime — a Node.js
 * environment with a special renderer that handles async components, Suspense
 * boundaries, and the 'use cache' / 'use server' directives. Vitest (and
 * Jest) run tests in plain Node.js without that runtime. Attempting to
 * shallow-render an RSC with @testing-library/react would produce a JSDOM
 * context that:
 *   1. Does not understand async components (they are treated as Promise
 *      returning functions, not React components).
 *   2. Does not have the cacheTag/cacheLife/revalidateTag stubs injected
 *      by Next.js — imports from "next/cache" would throw.
 *   3. Does not simulate Suspense streaming in a way that reflects the real
 *      server behaviour (the order of shell vs hole rendering).
 *
 * The correct testing pyramid for RSC code is:
 *
 *   1. Unit test the EXTRACTABLE LOGIC — pure functions and data-accessor
 *      functions that are imported by the RSC but do not depend on the RSC
 *      rendering context. That is what this file does.
 *
 *   2. Integration test the DATA LAYER — the repository functions that the
 *      data-accessor wraps. The existing lib/data/_tests/repository.test.ts
 *      covers this tier.
 *
 *   3. E2E test the RSC RENDERED OUTPUT — Playwright drives a real browser
 *      against the running Next.js server. The RSC renders correctly in the
 *      actual runtime and the test asserts what the user sees on screen.
 *      See solutions/c21-testing/e2e/key-flow.spec.ts for the E2E layer.
 *
 * This split is intentional. Do not try to unit-test RSC rendering in
 * vitest — it buys nothing (wrong runtime) and breaks constantly (every
 * Next.js internal API change is a test breakage).
 */

// ── Mock "next/cache" so we can import c03's product.ts in a plain Node context.
// The 'use cache' directive is a Next.js compiler transform and is a no-op in
// plain Node; but the helper functions (cacheTag, cacheLife) are actual imports
// from "next/cache" that would throw if not stubbed.
import { vi, describe, it, expect, beforeAll } from "vitest";

vi.mock("next/cache", () => ({
  cacheTag: vi.fn(),   // no-op in tests — we are not asserting cache tagging
  cacheLife: vi.fn(),  // no-op in tests
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Now import the target module AFTER the mock is in place.
// formatPrice is a pure function — no mocking needed.
// getProductShellData and getCachedCategoryProducts call lib/data, which works
// in plain Node (in-memory store, no Next.js runtime dependency).
import {
  formatPrice,
  getProductShellData,
  getCachedCategoryProducts,
} from "@/app/(challenges)/c03-product-ppr/_lib/product";

// ── formatPrice — pure function, easiest to test ──────────────────────────

describe("formatPrice", () => {
  it("converts cents to a US dollar string", () => {
    expect(formatPrice(24999)).toBe("$249.99");
  });

  it("handles whole dollar amounts with .00", () => {
    expect(formatPrice(10000)).toBe("$100.00");
  });

  it("formats sub-dollar amounts correctly", () => {
    expect(formatPrice(99)).toBe("$0.99");
  });

  it("accepts a custom currency code", () => {
    const result = formatPrice(1000, "EUR");
    // The locale formatter emits a currency symbol — we just check the number
    // and that no USD symbol appears when EUR is requested.
    expect(result).toContain("1");
    // Euro symbol or 'EUR' should appear somewhere in the formatted string.
    expect(result.includes("€") || result.includes("EUR")).toBe(true);
  });
});

// ── getProductShellData — data-accessor (calls in-memory store) ──────────
//
// Why is this worth testing at the unit level if we already test the repository?
//
// getProductShellData is the *contract surface* between the RSC and the data
// layer. Tests here confirm:
//   (a) The function returns the right shape for a known slug.
//   (b) It correctly forwards null for an unknown slug.
//   (c) Its return type (Product | null) is respected.
//
// The function also calls cacheTag/cacheLife, but those are mocked — we are
// not testing the caching behaviour here (that requires the Next.js runtime).

describe("getProductShellData", () => {
  it("returns a product for a known slug", async () => {
    const product = await getProductShellData("wireless-noise-cancelling-headphones");
    expect(product).not.toBeNull();
    expect(product!.id).toBe("p-elec-001");
    expect(product!.slug).toBe("wireless-noise-cancelling-headphones");
    expect(typeof product!.priceCents).toBe("number");
    expect(typeof product!.name).toBe("string");
  });

  it("returns null for an unknown slug", async () => {
    const product = await getProductShellData("this-product-does-not-exist");
    expect(product).toBeNull();
  });

  it("calls cacheTag and cacheLife (verifying the cache registration hooks ran)", async () => {
    // Import the mocked functions to assert they were called.
    const { cacheTag, cacheLife } = await import("next/cache");
    const vtCacheTag = vi.mocked(cacheTag);
    const vtCacheLife = vi.mocked(cacheLife);

    vtCacheTag.mockClear();
    vtCacheLife.mockClear();

    await getProductShellData("wireless-noise-cancelling-headphones");

    // In a real Next.js build, the 'use cache' transform ensures these run.
    // We verify here that product.ts still calls them (regression guard).
    expect(vtCacheTag).toHaveBeenCalled();
    expect(vtCacheLife).toHaveBeenCalled();
  });
});

// ── getCachedCategoryProducts — verifies the category filtering ───────────

describe("getCachedCategoryProducts", () => {
  it("returns products for a valid categoryId", async () => {
    const products = await getCachedCategoryProducts("cat-electronics");
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.categoryId).toBe("cat-electronics");
    }
  });

  it("returns an empty array for an unknown categoryId", async () => {
    const products = await getCachedCategoryProducts("cat-does-not-exist");
    expect(products).toHaveLength(0);
  });

  it("returns products with the required SearchResult-compatible fields", async () => {
    const products = await getCachedCategoryProducts("cat-books");
    expect(products.length).toBeGreaterThan(0);
    const first = products[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.slug).toBe("string");
    expect(typeof first.name).toBe("string");
    expect(typeof first.priceCents).toBe("number");
    expect(typeof first.rating).toBe("number");
  });
});
