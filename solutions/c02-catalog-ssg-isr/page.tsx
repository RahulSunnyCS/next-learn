// ─── solutions/c02-catalog-ssg-isr/page.tsx ───────────────────────────────
//
// REFERENCE SOLUTION — C02 Catalog index page.
//
// This is the SOLVED version of app/(challenges)/c02-catalog-ssg-isr/page.tsx.
// Study it AFTER completing the challenge and filling in defend-it.md.
//
// Key difference from the challenge skeleton:
//   The catalog.ts helpers are NOT fixed here (they are in _lib/catalog.ts).
//   The page shape is identical to the challenge file.  The reference value is
//   in the NOTES.md and cache-flow.md explanations.
//
// This file is read-only documentation — it is never served as a Next.js route.

import { Suspense } from "react";
import Link from "next/link";

// NOTE: In the actual challenge these imports come from the local _lib and
// _components. The solution file is standalone documentation and does NOT
// have Next.js router context, so imports here are illustrative only.

export const metadata = {
  title: "C02 — Catalog: SSG + ISR (SOLUTION)",
};

// The page is a static shell.  No data reads at the top level.
// All async data reads are inside <Suspense> boundaries.
export default function C02CatalogPageSolution() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Static shell */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c02-catalog-ssg-isr (solution)
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Catalog: SSG + ISR with Cache Components
        </h1>
      </div>

      {/*
        SOLUTION NOTES — CategoryNav inside Suspense:

        listCachedCategories() is wrapped in 'use cache'.  Even though the
        result is cached and will be near-instant after the first request, it
        is still an async read.  Under cacheComponents, EVERY async data read
        must live inside a <Suspense> boundary or the build fails.

        This is why CategoryNav is its own async Server Component rendered
        inside <Suspense> rather than being inlined in the page function.
      */}
      <Suspense fallback={<div className="h-8 bg-gray-100 rounded-full animate-pulse w-48" />}>
        {/* CategoryNav would be here: <CategoryNav activeCategorySlug={null} /> */}
        <div className="text-sm text-gray-500 italic">
          [CategoryNav — async, inside Suspense, reads listCachedCategories()]
        </div>
      </Suspense>

      {/*
        SOLUTION NOTES — ProductGrid inside Suspense:

        listCachedProducts() is the key fixed function.  With 'use cache' +
        cacheTag(tags.products) + cacheLife('hours'), it:
          1. Runs once at build time (or first request) and stores the result.
          2. Serves the cached result for up to 1 hour without re-running.
          3. After 1 hour, the next request triggers background revalidation
             (stale-while-revalidate pattern = ISR).
      */}
      <Suspense fallback={<div className="h-64 bg-gray-100 rounded-xl animate-pulse" />}>
        {/* ProductGrid would be here: <ProductGrid /> */}
        <div className="text-sm text-gray-500 italic">
          [ProductGrid — async, inside Suspense, reads listCachedProducts()]
        </div>
      </Suspense>

      <div className="p-4 border rounded-xl bg-gray-50 text-sm text-gray-700 space-y-2">
        <p className="font-semibold">See NOTES.md and cache-flow.md for the full explanation.</p>
        <p>
          The key fix is in{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            _lib/catalog.ts
          </code>
          : adding{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &apos;use cache&apos;
          </code>
          ,{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            cacheTag(tags.products)
          </code>
          , and{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            cacheLife(&apos;hours&apos;)
          </code>{" "}
          to both data helpers.
        </p>
        <p>
          See{" "}
          <Link href="/c02-catalog-ssg-isr" className="underline text-indigo-600">
            the live challenge
          </Link>{" "}
          for the real running page.
        </p>
      </div>
    </div>
  );
}
