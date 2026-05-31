// ─── app/(challenges)/c16-url-state/page.tsx ──────────────────────────────
//
// C16 — URL as Single Source of Truth
//
// ARCHITECTURE: static shell + Suspense hole (identical to C01 canonical pattern)
//
// Under cacheComponents: true the page is a STATIC SHELL.  The dynamic work
// (reading `await searchParams`, calling listProducts with random latency, and
// listing categories) lives inside `<CatalogContent>`, which is wrapped in
// `<Suspense>`.
//
// WHY IS searchParams DYNAMIC?
//   `await searchParams` is per-request data — a fresh Promise resolved by
//   the Next.js runtime for every incoming request.  Accessing it at the
//   route top level (outside Suspense) would break the static-shell invariant.
//   The Suspense boundary isolates the dynamic read so the shell prerenders
//   immediately.
//
// ALSO: listProducts from lib/data uses Math.random() (simulated latency).
// Under cacheComponents that is a non-deterministic call, which also requires
// running inside Suspense (or behind 'use cache').  We call it inside the
// dynamic hole so the build succeeds.
//
// NO `export const dynamic` directive — that is forbidden by cacheComponents.

import { Suspense } from "react";
import type { Metadata } from "next";
import FilterBar from "./_components/FilterBar";
import Pagination from "./_components/Pagination";
import { parseSearchParams } from "./_lib/search-params";
import { listProducts, listCategories } from "@/lib/data";
import type { Product } from "@/lib/data";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "C16 — URL as Source of Truth",
};

// The page receives searchParams as a Promise — awaiting it inside <Suspense>
// is required by cacheComponents.
export default function C16UrlStatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c16-url-state</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          URL as Single Source of Truth
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          All filter, sort, and pagination state lives in the URL{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            ?category=&amp;sort=&amp;page=&amp;q=
          </code>
          . The server reads{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            searchParams
          </code>{" "}
          and renders the filtered list — the result is shareable, bookmarkable,
          and restorable on refresh. No client store needed.
        </p>
      </div>

      {/* ── STATIC SHELL: teaching notes ────────────────────────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm">
        <h2 className="font-semibold text-indigo-900">
          Why URL state beats a client store for filters
        </h2>
        <ul className="space-y-2 text-indigo-800 list-disc list-inside">
          <li>
            <strong>Shareable:</strong> copy the URL, send it — the recipient
            sees the exact same filtered view.
          </li>
          <li>
            <strong>Server-rendered:</strong> the server component reads
            searchParams and renders the filtered HTML before JS runs. No
            &ldquo;loading flicker&rdquo; on first paint.
          </li>
          <li>
            <strong>No hydration mismatch:</strong> the server and client agree
            on what is rendered because they read the same URL.
          </li>
          <li>
            <strong>Back/forward works natively:</strong> the browser history
            stack IS the state history. Press Back → previous filter state is
            restored automatically.
          </li>
          <li>
            <strong>Limit:</strong> URL has a length cap (~2000 chars) and
            parameters are user-visible. Not suitable for sensitive or very long
            state.
          </li>
        </ul>
      </section>

      {/* ── DYNAMIC HOLE: categories + FilterBar + product list ─────────── */}
      {/*
        FilterBar and CatalogContent both need categories.  We fetch them
        inside the Suspense hole because listCategories also uses Math.random()
        (simulated latency) and is therefore non-deterministic.  Keeping them
        together in one async hole avoids fetching categories twice.
      */}
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>

      {/* ── STATIC SHELL: defend-it reminder ────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c16-url-state/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c16-url-state/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────
//
// This async Server Component:
//   1. `await connection()` — signals to Next.js that this component accesses
//      dynamic request-time data.  This MUST be called before any synchronous
//      non-deterministic code (like the Math.random() inside listProducts).
//      Without it, the random latency simulation runs during prerender and the
//      build fails with a Cache Components error.
//   2. `await searchParams` — reads the per-request URL params.
//   3. Calls listProducts and listCategories with the parsed params.
//   4. Renders FilterBar (client) + product grid + Pagination (client).
//
// FilterBar and Pagination are "use client" components but they are rendered
// HERE (from the server), which means Next.js sends their initial HTML from
// the server.  Their event handlers are wired up during client hydration.
// This is the normal RSC + Client Component composition pattern.
async function CatalogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Must come before any synchronous non-deterministic call (Math.random inside
  // listProducts).  connection() is the correct signal under cacheComponents.
  await connection();

  // Await both data fetches in parallel to avoid a waterfall.
  const [rawParams, categories] = await Promise.all([
    searchParams,
    listCategories(),
  ]);

  // Parse URL params into typed, validated values.
  const parsed = parseSearchParams(rawParams);

  // Resolve category slug → id for the data layer.
  // The URL stores category as a slug (user-readable); the repository filters
  // by categoryId.  We look up the mapping here on the server.
  const matchedCategory = parsed.category
    ? categories.find((c) => c.slug === parsed.category)
    : undefined;

  // Fetch filtered, sorted, paginated products.
  const result = await listProducts({
    categoryId: matchedCategory?.id,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: 9, // 3-column grid, 3 rows per page looks clean at this breakpoint
    q: parsed.q,
  });

  return (
    <div className="space-y-4">
      {/* Client controls bar — reads the URL and updates it */}
      <FilterBar categories={categories} />

      {/* Result count + sort context */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {result.totalCount === 0
            ? "No products found"
            : `${result.totalCount} product${result.totalCount !== 1 ? "s" : ""}`}
          {parsed.q && (
            <span>
              {" "}for &ldquo;{parsed.q}&rdquo;
            </span>
          )}
          {parsed.category && matchedCategory && (
            <span> in {matchedCategory.name}</span>
          )}
        </span>
        <span className="text-xs font-mono text-gray-400">
          server-rendered, page {result.page}/{result.totalPages}
        </span>
      </div>

      {/* Product grid — rendered on the server from searchParams */}
      {result.items.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-sm">
            No products match your filters. Try clearing some filters above.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      )}

      {/* Pagination — client component, updates URL */}
      <Pagination
        totalPages={result.totalPages}
        currentPage={result.page}
        totalCount={result.totalCount}
      />
    </div>
  );
}

// ─── PRODUCT CARD ──────────────────────────────────────────────────────────
// Pure presentational server component. No dynamic data here.
function ProductCard({ product }: { product: Product }) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: product.currency,
  }).format(product.priceCents / 100);

  return (
    <li className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
      {/* Product image placeholder */}
      <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-300 text-3xl">
        {/* Use a simple emoji placeholder so we don't need external images */}
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

// ─── SKELETON ─────────────────────────────────────────────────────────────
function CatalogSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Filter bar skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 h-24" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white h-56"
          />
        ))}
      </div>
    </div>
  );
}
