// ─── solutions/c16-url-state/page.tsx — Reference solution ────────────────
//
// This is the full reference solution for C16 — URL as Single Source of Truth.
// It is self-contained: it re-implements FilterBar, Pagination, and the page
// inline so the solution can be studied as one file without jumping around.
//
// KEY DECISIONS (see NOTES.md for the full explanation):
//
// 1. STATIC SHELL + SUSPENSE HOLE
//    The page component itself is a static shell (no dynamic reads at top
//    level). CatalogContent is an async Server Component wrapped in <Suspense>
//    that reads `await searchParams` and calls listProducts.
//
// 2. CLIENT WRITES ↔ SERVER READS SPLIT
//    FilterBar ("use client") reads useSearchParams() and writes with
//    router.replace().  The page server component reads searchParams and
//    renders the grid.  There is no shared client store — the URL IS the store.
//
// 3. DEBOUNCE WITH useRef
//    The search input timer is kept in a useRef, not useState, to avoid
//    re-renders on clearTimeout + setTimeout calls.
//
// 4. router.replace NOT router.push
//    All URL updates use replace() so rapid input (typing, clicking) does not
//    flood the history stack.  Back button undoes a logical action, not a
//    character.
//
// 5. await connection() BEFORE listProducts
//    connection() signals per-request execution to the Cache Components
//    runtime.  Without it, Math.random() inside the simulated delay runs
//    during prerender and the build fails.

import { Suspense } from "react";
import { connection } from "next/server";
import { listProducts, listCategories } from "@/lib/data";
import type { Category, Product } from "@/lib/data";
import { parseSearchParams, buildSearchParams, PARAM_KEYS, DEFAULTS } from "./_lib/search-params";
import type { ParsedSearchParams } from "./_lib/search-params";

// Client component imports — inline implementations below.
// (In the challenge, these live in _components/. Here they are inline for
// readability as a single-file reference solution.)
import FilterBarSolution from "./FilterBarSolution";
import PaginationSolution from "./PaginationSolution";

export default function C16SolutionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          solutions/c16-url-state
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          C16 Reference Solution — URL State
        </h1>
        <p className="text-gray-600 text-sm">
          All filter/sort/pagination state lives in the URL. The server reads
          searchParams; the client controls bar writes to the URL.
        </p>
      </div>

      <Suspense fallback={<SolutionCatalogSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Must precede any synchronous non-deterministic call (Math.random in listProducts).
  await connection();

  const [rawParams, categories] = await Promise.all([
    searchParams,
    listCategories(),
  ]);

  const parsed = parseSearchParams(rawParams);

  const matchedCategory = parsed.category
    ? categories.find((c) => c.slug === parsed.category)
    : undefined;

  const result = await listProducts({
    categoryId: matchedCategory?.id,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: 9,
    q: parsed.q,
  });

  return (
    <div className="space-y-4">
      <FilterBarSolution categories={categories} />

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {result.totalCount === 0
            ? "No products found"
            : `${result.totalCount} product${result.totalCount !== 1 ? "s" : ""}`}
          {parsed.q && <span> for &ldquo;{parsed.q}&rdquo;</span>}
          {parsed.category && matchedCategory && (
            <span> in {matchedCategory.name}</span>
          )}
        </span>
        <span className="text-xs font-mono text-gray-400">
          server-rendered, page {result.page}/{result.totalPages}
        </span>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">
            No products match your filters.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.items.map((product) => (
            <SolutionProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}

      <PaginationSolution
        totalPages={result.totalPages}
        currentPage={result.page}
        totalCount={result.totalCount}
      />
    </div>
  );
}

function SolutionProductCard({ product }: { product: Product }) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.priceCents / 100);

  return (
    <li className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">
        📦
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
          {product.name}
        </p>
        <p className="text-xs text-gray-500 line-clamp-2 flex-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-semibold text-gray-900 text-sm">{price}</span>
          <span className="text-xs text-amber-600">
            ★ {product.rating.toFixed(1)}
          </span>
        </div>
        {product.stock === 0 && (
          <span className="text-xs text-red-600 font-medium">Out of stock</span>
        )}
      </div>
    </li>
  );
}

function SolutionCatalogSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl border border-gray-200 bg-white p-4 h-24" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white h-56" />
        ))}
      </div>
    </div>
  );
}

// Re-export the types used by the inline client components so they can be
// imported from this file.
export type { Category, ParsedSearchParams };
export { buildSearchParams, parseSearchParams, PARAM_KEYS, DEFAULTS };
