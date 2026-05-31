// ─── solutions/c03-product-ppr/[slug]/page.tsx ────────────────────────────
//
// REFERENCE SOLUTION — C03 Product Detail: PPR + Streaming SSR
//
// This is the canonical complete implementation. Read it AFTER filling in
// your defend-it.md worksheet. Compare it against your implementation to
// see what you got right, what you missed, and why.
//
// READING GUIDE
// ─────────────
// 1. Data layer   → _lib/product.ts     (what is cached and why)
// 2. Static shell → _components/ProductShell.tsx  (prerendered at build time)
// 3. Dynamic holes→ _components/{LiveInventory,Recommendations,Reviews}.tsx
// 4. Error boundary→ [slug]/error.tsx  (what it catches, what it doesn't)
// 5. Route loading → [slug]/loading.tsx (route-level vs manual Suspense)
// 6. This file    → how the pieces compose into a ◐ PPR page

import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductShellData } from "../_lib/product";
import { ProductShell, ProductNotFound } from "../_components/ProductShell";
import { LiveInventory, LiveInventorySkeleton } from "../_components/LiveInventory";
import { Recommendations, RecommendationsSkeleton } from "../_components/Recommendations";
import { Reviews, ReviewsSkeleton } from "../_components/Reviews";

// ────────────────────────────────────────────────────────────────────────────
// Metadata
// The metadata generator uses the CACHED product data accessor. It runs at
// build time for statically-known slugs, or per-request for unknown slugs
// (first access). Because the accessor is 'use cache', the data is fetched
// once and reused by both generateMetadata and the page component.
// ────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductShellData(slug);

  if (!product) return { title: "Product not found — C03 PPR" };
  return {
    title: `${product.name} — C03 PPR`,
    description: product.description,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default async function C03ProductPPRPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // KEY DECISION: params is awaited BEFORE any conditional returns.
  // Next.js 16 makes params a Promise — must be awaited. This is NOT a
  // dynamic read (it's the route parameter, not a request header/cookie),
  // so it does not force the page into "dynamic" territory.
  const { slug } = await params;

  // CACHED read — the ONLY data access at page top level.
  // 'use cache' inside getProductShellData means this call goes through the
  // cache. Safe to call outside <Suspense> because it is cached.
  const product = await getProductShellData(slug);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <p className="text-xs font-mono text-indigo-500">c03-product-ppr / [slug]</p>
        <ProductNotFound slug={slug} />
      </div>
    );
  }

  // KEY INSIGHT: everything below the opening <div> that does NOT involve an
  // async component is the STATIC SHELL. It is prerendered to HTML at build
  // time (or on first request, then cached) and streamed first. The Suspense
  // boundaries below each mark the start of a DYNAMIC HOLE.

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <p className="text-xs font-mono text-indigo-500">c03-product-ppr / [slug]</p>

      {/* ── STATIC SHELL ── data comes from cached getProductShellData */}
      <ProductShell product={product} />

      {/* ── DYNAMIC HOLE #1: stock status ──
           Uncached — every request gets a fresh stock count.
           The <Suspense> fallback is shown in the initial HTML for this hole.
           When LiveInventory resolves, React streams the replacement HTML. */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Live Inventory</h2>
        <Suspense fallback={<LiveInventorySkeleton />}>
          <LiveInventory slug={slug} />
        </Suspense>
      </section>

      {/* ── DYNAMIC HOLE #2: recommendations ──
           Uncached — simulates per-user personalisation.
           Note that the shell above and hole #1 are already visible to the
           user while hole #2 is still resolving. Holes are CONCURRENT. */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">You Might Also Like</h2>
        <Suspense fallback={<RecommendationsSkeleton />}>
          <Recommendations currentSlug={slug} categoryId={product.categoryId} />
        </Suspense>
      </section>

      {/* ── DYNAMIC HOLE #3: reviews ──
           Uncached — new reviews should appear immediately without invalidation. */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Customer Reviews</h2>
        <Suspense fallback={<ReviewsSkeleton />}>
          <Reviews productId={product.id} />
        </Suspense>
      </section>

      {/* ── ERROR DEMO ──
           StreamErrorDemo throws AFTER the shell is flushed. The error is
           contained by its own try-catch — the route error.tsx is not invoked,
           and the HTTP status stays 200. */}
      <section className="rounded-xl border border-orange-100 bg-orange-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-orange-900">Error-after-flush Demo</h2>
        <Suspense fallback={<div className="h-16 rounded-lg bg-orange-100 animate-pulse" />}>
          <StreamErrorDemo />
        </Suspense>
      </section>
    </div>
  );
}

// ── Error demo ─────────────────────────────────────────────────────────────

async function StreamErrorDemo() {
  await new Promise((resolve) => setTimeout(resolve, 60));
  try {
    throw new Error("Simulated error after shell flush");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="rounded-lg border border-orange-200 bg-white p-4 text-sm text-orange-700 space-y-1">
        <p className="font-medium">Error caught inside the component (not by error.tsx):</p>
        <p className="font-mono text-xs bg-orange-50 rounded p-2">{message}</p>
        <p className="text-xs text-gray-500">HTTP status: 200 — check Network tab.</p>
      </div>
    );
  }
}
