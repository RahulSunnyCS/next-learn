// ─── app/(challenges)/c09-legacy-caches/page.tsx ─────────────────────────
//
// C09 — Legacy Four-Cache Model + Migration challenge page.
//
// ── RENDERING MODEL (cacheComponents: true) ───────────────────────────────
// This page follows the canonical static-shell + Suspense-hole pattern.
// The challenge TEACHES the legacy four-cache model and the migration to
// Cache Components.  The live demo itself runs under the NEW (v16) model.
//
// Static shell: challenge header, four-caches explainer, migration notes.
// Dynamic hole: FeaturedProducts — calls getCachedFeaturedProducts() which
//   is wrapped in 'use cache', so the data is cached but must still be
//   inside <Suspense> because any await of an async function (even cached)
//   must be inside a boundary under cacheComponents rules.
//
// WHY NO `export const revalidate` OR `export const dynamic`:
//   Both are incompatible with cacheComponents: true (the former is superseded
//   by 'use cache'; the latter is disallowed entirely).
//   See: docs/cache-components-rules.md, rules 1 and 3.

import { Suspense } from "react";
import type { Metadata } from "next";
import { getCachedFeaturedProducts } from "./_lib/legacy";
import type { Product } from "@/lib/data";

export const metadata: Metadata = {
  title: "C09 — Legacy Four-Cache Model + Migration",
};

// ─────────────────────────────────────────────────────────────────────────────
// Page — static shell
// ─────────────────────────────────────────────────────────────────────────────

export default function C09LegacyCachesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── STATIC SHELL: challenge header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c09-legacy-caches
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Legacy Four-Cache Model + Migration to Cache Components
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches the pre-v16 &quot;four caches&quot; mental
          model — the architecture you will encounter in existing Next.js
          codebases and classic interview questions — and shows you exactly how
          and why it was replaced by Cache Components in Next.js 16.
        </p>
      </div>

      {/* ── STATIC SHELL: the four caches overview ── */}
      <FourCachesExplainer />

      {/* ── STATIC SHELL: legacy APIs cheatsheet ── */}
      <LegacyAPIsCheatsheet />

      {/* ── DYNAMIC HOLE: live migrated demo ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Live Demo — Migrated to Cache Components
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          The product list below is fetched via{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            getCachedFeaturedProducts()
          </code>
          , which uses{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          +{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            cacheTag(tags.products)
          </code>{" "}
          +{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            cacheLife(&apos;hours&apos;)
          </code>
          . This is the migrated equivalent of the legacy{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            unstable_cache
          </code>{" "}
          pattern — same observable behaviour, explicit implementation.
        </p>
        <Suspense fallback={<FeaturedProductsSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>

      {/* ── STATIC SHELL: migration summary ── */}
      <MigrationSummary />

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            _meta/defend-it.md
          </code>{" "}
          — especially Q1 &quot;draw the four caches&quot; — commit it, and
          only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c09-legacy-caches/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic hole — FeaturedProducts
// ─────────────────────────────────────────────────────────────────────────────

// This is the async Server Component that reads data.  It lives inside
// <Suspense> so the static shell above can prerender without waiting for it.
async function FeaturedProducts() {
  const products = await getCachedFeaturedProducts();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product: Product) => (
        <div
          key={product.id}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900 text-sm leading-tight">
              {product.name}
            </p>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 shrink-0">
              ${product.price.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{product.category}</span>
            <span className="text-xs text-amber-600">
              ★ {product.rating.toFixed(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeaturedProductsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-2 animate-pulse"
        >
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-50 rounded" />
          <div className="h-3 bg-gray-50 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Static components (all prerender immediately, no data reads)
// ─────────────────────────────────────────────────────────────────────────────

function FourCachesExplainer() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <h2 className="font-semibold text-gray-900">
        The Four Caches (Pre-v16 Mental Model)
      </h2>
      <p className="text-sm text-gray-600">
        In Next.js 13–15, the framework maintained four distinct caches. You
        will encounter all four in existing codebases and interview questions.
        Next.js 16 supersedes this model, but understanding it is essential
        for reading legacy code and for interviews.
      </p>
      <div className="space-y-3">
        {[
          {
            name: "1. Request Memoization",
            where: "Server RAM — per request",
            color: "blue",
            detail:
              "A plain Map that de-duplicates identical fetch() or unstable_cache() calls within a single render tree. If two Server Components both call fetch(url), only one network request is made. The Map is discarded when the request ends — it never persists to the next request.",
          },
          {
            name: "2. Data Cache",
            where: "Server disk — persistent",
            color: "indigo",
            detail:
              "A persistent on-disk store (.next/cache/fetch/…) that survives server restarts. Stores resolved fetch() responses and unstable_cache values. Invalidated explicitly by revalidateTag() / revalidatePath(), or by time (revalidate: N seconds). This is the cache that `cacheTag` / `cacheLife` interact with in v16.",
          },
          {
            name: "3. Full Route Cache",
            where: "Server disk — per deployment",
            color: "violet",
            detail:
              "Pre-rendered HTML + RSC payload for statically generated routes. Built at next build and served directly from disk, bypassing rendering entirely. Invalidated when its underlying Data Cache entries are busted (via revalidateTag). In v16 this maps to the PPR static shell.",
          },
          {
            name: "4. Router Cache",
            where: "Browser RAM — session",
            color: "amber",
            detail:
              "The browser's in-memory store for RSC payloads of routes the user has navigated to or prefetched. Makes back/forward instant — no server round-trip. TTL: ~5min for static routes, ~30s for dynamic routes. Cleared on hard reload. Call router.refresh() to invalidate the current route.",
          },
        ].map(({ name, where, color, detail }) => (
          <div
            key={name}
            className={`rounded-lg border p-4 border-${color}-100 bg-${color}-50`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className={`font-medium text-${color}-900 text-sm`}>{name}</p>
              <code
                className={`text-xs font-mono bg-${color}-100 text-${color}-700 rounded px-2 py-0.5`}
              >
                {where}
              </code>
            </div>
            <p className={`text-xs text-${color}-800 leading-relaxed`}>
              {detail}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Full diagrams and interaction flows in{" "}
        <code className="font-mono bg-gray-100 rounded px-1">
          solutions/c09-legacy-caches/cache-flow.md
        </code>
        .
      </p>
    </section>
  );
}

function LegacyAPIsCheatsheet() {
  return (
    <section className="rounded-xl border border-orange-100 bg-orange-50 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Legacy — not used in this app
        </span>
        <h2 className="font-semibold text-orange-900">
          Pre-v16 Caching APIs (Code Samples Only)
        </h2>
      </div>
      <p className="text-sm text-orange-800">
        These APIs are superseded by Cache Components. They are shown here as
        code samples so you can recognise them in existing codebases. They do
        NOT run in this app (
        <code className="font-mono text-xs bg-orange-100 rounded px-1">
          cacheComponents: true
        </code>{" "}
        disables implicit fetch caching entirely).
      </p>

      {/* unstable_cache */}
      <div className="rounded-lg bg-white border border-orange-200 p-4 space-y-2">
        <p className="font-medium text-sm text-gray-800">
          Pattern 1:{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            unstable_cache
          </code>{" "}
          — wrapping non-fetch data sources
        </p>
        <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700 whitespace-pre">
          {`// LEGACY (Next.js 14) — reads Data Cache + tags + revalidate
// This file would be a live module in a v14 app.

import { unstable_cache } from "next/cache";
import { listProducts } from "@/lib/data";

// unstable_cache wraps ANY async function (not just fetch).
// The second arg is the cache key array.
// The third arg sets cache lifetime and tags.
export const getFeaturedProducts = unstable_cache(
  async () => {
    const result = await listProducts({ pageSize: 6 });
    return result.items;
  },
  ["c09-featured-products"],      // ← key: manual, error-prone
  {
    revalidate: 3600,             // ← 1-hour stale window
    tags: ["products"],           // ← for revalidateTag()
  }
);`}
        </pre>
      </div>

      {/* implicit fetch caching */}
      <div className="rounded-lg bg-white border border-orange-200 p-4 space-y-2">
        <p className="font-medium text-sm text-gray-800">
          Pattern 2: Implicit{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            fetch
          </code>{" "}
          caching — automatic Data Cache via fetch options
        </p>
        <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700 whitespace-pre">
          {`// LEGACY (Next.js 13/14) — fetch was cached by default (force-cache).
// In v14, this single fetch call would hit all four caches:

async function getProducts() {
  // Default in v13/14: cache: 'force-cache' (stored in Data Cache forever).
  const res = await fetch("https://api.example.com/products", {
    next: {
      revalidate: 3600,           // ← override: stale-while-revalidate 1h
      tags: ["products"],         // ← for revalidateTag()
    },
  });
  return res.json();
}

// To OPT OUT of caching (always fetch live):
async function getLiveStock() {
  const res = await fetch("https://api.example.com/stock", {
    cache: "no-store",            // ← bypass Data Cache entirely
  });
  return res.json();
}`}
        </pre>
      </div>

      {/* export const revalidate */}
      <div className="rounded-lg bg-white border border-orange-200 p-4 space-y-2">
        <p className="font-medium text-sm text-gray-800">
          Pattern 3:{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            export const revalidate
          </code>{" "}
          — route-level ISR
        </p>
        <pre className="text-xs font-mono bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700 whitespace-pre">
          {`// LEGACY (Next.js 13/14/15) — route segment config for ISR.
// NOT ALLOWED in this app (cacheComponents: true forbids it).
// See docs/cache-components-rules.md, rule 1.

// page.tsx (v14 style)
export const revalidate = 3600; // ← revalidate ALL fetches on this route every 1h

// Note: this is a BLUNT instrument — it sets the same lifetime for every
// fetch on the page.  In v16, different functions can have different lifetimes
// via cacheLife() inside each 'use cache' function.`}
        </pre>
      </div>

      <p className="text-xs text-orange-700">
        See{" "}
        <code className="font-mono bg-orange-100 rounded px-1">
          solutions/c09-legacy-caches/legacy/page.tsx
        </code>{" "}
        for a complete legacy page example and{" "}
        <code className="font-mono bg-orange-100 rounded px-1">
          solutions/c09-legacy-caches/migration-notes.md
        </code>{" "}
        for the full migration story.
      </p>
    </section>
  );
}

function MigrationSummary() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-3">
      <h2 className="font-semibold text-indigo-900">
        Why Next.js Moved to Cache Components
      </h2>
      <div className="space-y-2 text-sm text-indigo-800">
        <p>
          <strong>1. Implicit magic → explicit intent.</strong> In v14,
          whether a fetch was cached depended on which options were passed, in
          which order, and whether a parent route had already cached the same
          URL. Developers spent significant time fighting invisible cache hits.
          In v16,{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          makes the intent explicit: if you see the directive, the function is
          cached; if you don&apos;t, it is not.
        </p>
        <p>
          <strong>2. Route-level → function-level lifetime.</strong>{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            export const revalidate = 3600
          </code>{" "}
          was a blunt instrument — one setting for the whole route. With{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            cacheLife()
          </code>{" "}
          you set the lifetime inside each function. Product prices can
          revalidate every minute while category names revalidate every day.
        </p>
        <p>
          <strong>3. Arguments auto-keyed.</strong>{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            unstable_cache
          </code>{" "}
          required you to manually include function arguments in the cache key
          array — easy to forget and a source of subtle bugs.{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          uses the React compiler to automatically derive the cache key from the
          function&apos;s arguments.
        </p>
        <p>
          <strong>4. PPR compatibility.</strong> Partial Prerendering (PPR)
          requires knowing at build time which parts of a page are static and
          which are dynamic. The implicit caching model made this ambiguous.
          Cache Components make the static/dynamic boundary explicit at the
          component level.
        </p>
      </div>
    </section>
  );
}
