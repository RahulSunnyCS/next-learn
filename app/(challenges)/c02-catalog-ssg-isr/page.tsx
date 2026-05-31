// ─── app/(challenges)/c02-catalog-ssg-isr/page.tsx ────────────────────────
//
// C02 — Catalog: SSG + ISR challenge page.
//
// RENDERING STRATEGY (Cache Components model, Next.js 16):
//   This page is a STATIC SHELL.  It has no top-level dynamic data reads.
//   The product grid is wrapped in <Suspense>, which is where the async
//   data fetch actually runs.
//
//   The ISR behaviour comes from the data helper in _lib/catalog.ts:
//   once the challenge is solved, listCachedProducts() is wrapped in
//   'use cache' + cacheLife('hours').  The route itself needs no special
//   config — it is statically generated at build time and served stale-then-
//   fresh at runtime.
//
// WHY NO `export const dynamic` OR `export const revalidate`:
//   Both are incompatible with cacheComponents: true (dynamic) or superseded
//   by 'use cache' (revalidate).  Neither is used here.
//   See: docs/cache-components-rules.md, rule 1.
//
// WHAT IS STATIC vs DYNAMIC ON THIS PAGE:
//   Static shell (prerenders immediately):
//     - Page title, description, learning notes
//     - Category navigation buttons (uses listCachedCategories inside Suspense)
//   Dynamic hole (streams in after static shell):
//     - <ProductGrid> — calls listCachedProducts (async, simulated latency)
//     - CategoryNav  — calls listCachedCategories (async, simulated latency)
//
// NOTE: Category nav is ALSO inside Suspense even though category data is
//       "static-ish".  Under cacheComponents, any async data read — even a
//       cached one — must be inside Suspense to be safe.  The cache ensures
//       the await resolves near-instantly after the first request.

import { Suspense } from "react";
import type { Metadata } from "next";
import { ProductGrid, ProductGridSkeleton } from "./_components/ProductGrid";
import { listCachedCategories } from "./_lib/catalog";
import Link from "next/link";

export const metadata: Metadata = {
  title: "C02 — Catalog: SSG + ISR",
};

// ---------------------------------------------------------------------------
// Page (static shell)
// ---------------------------------------------------------------------------

export default function C02CatalogPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── STATIC SHELL: challenge header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c02-catalog-ssg-isr
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Catalog: SSG + ISR with Cache Components
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches Static Site Generation (SSG) and Incremental
          Static Regeneration (ISR) under Next.js 16&apos;s Cache Components
          model. The product grid below is pre-rendered at build time and
          refreshed on an hourly schedule using{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          +{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            cacheLife(&apos;hours&apos;)
          </code>
          .
        </p>
      </div>

      {/* ── DYNAMIC HOLE: category navigation ── */}
      <Suspense fallback={<CategoryNavSkeleton />}>
        <CategoryNav activeCategorySlug={null} />
      </Suspense>

      {/* ── Learning note: ISR mechanism ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800 space-y-2">
        <p className="font-semibold text-indigo-900">How ISR works here</p>
        <p>
          The product data is cached via{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          inside{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            listCachedProducts()
          </code>
          .{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            cacheLife(&apos;hours&apos;)
          </code>{" "}
          sets a ~1-hour stale window. After the cache entry expires, the next
          request triggers a background revalidation — the visitor sees stale
          HTML immediately, and fresh data appears for subsequent visitors.
        </p>
        <p>
          This is ISR behaviour without{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            export const revalidate
          </code>
          . The lifetime is declared at the data-function level, not the route
          level — meaning different functions on the same page can have different
          lifetimes.
        </p>
      </section>

      {/* ── DYNAMIC HOLE: product grid, wrapped in Suspense ── */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductGrid />
      </Suspense>

      {/* ── STATIC SHELL: dynamicParams explainer ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800 space-y-2">
        <p className="font-semibold text-amber-900">
          The <code className="font-mono text-xs">dynamicParams</code> gotcha
        </p>
        <p>
          Navigate to{" "}
          <Link
            href="/c02-catalog-ssg-isr/electronics"
            className="underline hover:text-amber-600"
          >
            /c02-catalog-ssg-isr/electronics
          </Link>{" "}
          (a pre-generated slug) — served as static HTML.
        </p>
        <p>
          Then try{" "}
          <Link
            href="/c02-catalog-ssg-isr/gadgets"
            className="underline hover:text-amber-600"
          >
            /c02-catalog-ssg-isr/gadgets
          </Link>{" "}
          (an unknown slug). With{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            dynamicParams = true
          </code>{" "}
          (the default) it renders on demand. With{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            dynamicParams = false
          </code>{" "}
          it returns a 404. See{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            [slug]/page.tsx
          </code>
          .
        </p>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            _meta/defend-it.md
          </code>{" "}
          with your own answers to the 5 questions, commit it, and only then
          open{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            solutions/c02-catalog-ssg-isr/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryNav — async Server Component inside Suspense
// ---------------------------------------------------------------------------

async function CategoryNav({
  activeCategorySlug,
}: {
  activeCategorySlug: string | null;
}) {
  // listCachedCategories() is async and (once the challenge is solved) wrapped
  // in 'use cache'.  It is safe here INSIDE Suspense — the cache ensures the
  // await completes quickly after the first request.
  const categories = await listCachedCategories();

  return (
    <nav aria-label="Category filter" className="flex flex-wrap gap-2">
      {/* "All" pill — active when no category is selected */}
      <Link
        href="/c02-catalog-ssg-isr"
        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
          activeCategorySlug === null
            ? "bg-indigo-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        All
      </Link>

      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/c02-catalog-ssg-isr/${cat.slug}`}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategorySlug === cat.slug
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function CategoryNavSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-8 rounded-full bg-gray-100 animate-pulse"
          style={{ width: `${60 + i * 10}px` }}
        />
      ))}
    </div>
  );
}
