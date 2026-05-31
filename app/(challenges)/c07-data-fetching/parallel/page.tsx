// ─── app/(challenges)/c07-data-fetching/parallel/page.tsx ────────────────────
//
// C07 — Parallel Demo: Promise.all fixes the waterfall.
//
// CACHE COMPONENTS PATTERN:
//   Same shape as the waterfall page — static shell + one Suspense-wrapped
//   dynamic hole for the data. All lib/data reads are inside the async
//   ParallelData component below.
//
// NO `export const dynamic` — disallowed under cacheComponents.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getProductRaw, listCategoriesRaw, listReviewsMemo } from "../_lib/queries";

export const metadata: Metadata = {
  title: "C07 — Parallel (fast)",
};

// ─── STATIC SHELL ─────────────────────────────────────────────────────────────

export default function ParallelPageShell() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Static header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            href="/c07-data-fetching"
            className="text-xs font-mono text-indigo-500 hover:underline"
          >
            ← c07-data-fetching
          </Link>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Fixed
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            Parallel — Promise.all
          </h1>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          The same three independent data reads, now executed with{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">Promise.all</code>.
          All three start simultaneously. Total time ≈ max(latencies), not N &times; max-latency.
        </p>
      </div>

      {/* Code comparison — static */}
      <ParallelCodePanel />

      {/* Dynamic hole: the parallel fetch */}
      <Suspense fallback={<ParallelSkeleton />}>
        <ParallelData />
      </Suspense>

      {/* Static explainer */}
      <section className="rounded-xl border border-green-100 bg-green-50 p-5 text-sm text-green-800 space-y-2">
        <p className="font-semibold">Why this is fast:</p>
        <p>
          <code className="font-mono text-xs bg-green-100 rounded px-1">Promise.all</code>{" "}
          starts all three fetches simultaneously at t=0. The page waits only
          until the <em>slowest</em> one resolves. If each takes ~80ms, the
          total is ~80ms (not ~240ms).
        </p>
        <p>
          The time savings scale linearly with N: 10 independent fetches with
          sequential awaits take ~10 × latency; with{" "}
          <code className="font-mono text-xs bg-green-100 rounded px-1">Promise.all</code>{" "}
          they still take ~max(latency).
        </p>
        <p>
          Compare with the{" "}
          <Link href="/c07-data-fetching/waterfall" className="underline font-medium">
            waterfall version
          </Link>
          {" "}to see the timing difference.
        </p>
      </section>

      {/* Hoisted-promise variant — static code panel */}
      <HoistedVariantPanel />
    </div>
  );
}

// ─── STATIC CODE PANEL ───────────────────────────────────────────────────────

function ParallelCodePanel() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 text-sm">The fix — two equivalent patterns:</h2>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Option A: Promise.all</p>
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto text-gray-800 leading-relaxed">
            {`// ✅ PARALLEL — all three start at t=0
const [product, categories, reviews] = await Promise.all([
  getProductRaw(id),
  listCategoriesRaw(),
  listReviewsMemo(id),
]);
// total ≈ max(latency1, latency2, latency3)`}
          </pre>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">
            Option B: Hoisted promise variables (equivalent)
          </p>
          <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto text-gray-800 leading-relaxed">
            {`// ✅ ALSO PARALLEL — promises start immediately on declaration
const productPromise    = getProductRaw(id);     // ← starts now
const categoriesPromise = listCategoriesRaw();   // ← starts now
const reviewsPromise    = listReviewsMemo(id);   // ← starts now

// Await separately — all three are already in flight
const product    = await productPromise;
const categories = await categoriesPromise;
const reviews    = await reviewsPromise;`}
          </pre>
          <p className="text-xs text-gray-500 mt-1">
            Useful when the three values are needed in different branches
            of the same function, or when you want to add error handling
            per-promise.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── DYNAMIC HOLE: the parallel fetch ────────────────────────────────────────
// Uses the SAME raw accessors as the waterfall page so the timing comparison
// is fair. The only difference is Promise.all vs sequential await.

async function ParallelData() {
  const startMs = Date.now();

  // ── PARALLEL: all three start at the same moment ──────────────────────────
  const [product, categories, reviews] = await Promise.all([
    getProductRaw("p-elec-001"),      // starts at t=0
    listCategoriesRaw(),              // starts at t=0 (same moment)
    listReviewsMemo("p-elec-001"),    // starts at t=0 (same moment)
  ]);

  const totalMs = Date.now() - startMs;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
          Parallel
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total time: <span className="text-green-600">{totalMs}ms</span>
        </span>
        <span className="text-xs text-gray-500">
          (≈ max of the three latencies)
        </span>
      </div>

      <div className="space-y-3 text-sm">
        {product && (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">Product:</span>
              {" "}{product.name}
              <span className="ml-2 text-xs text-gray-500">${(product.priceCents / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-800">Categories:</span>
            {" "}{categories.map(c => c.name).join(", ")}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-800">Reviews:</span>
            {" "}{reviews.length} reviews for this product
          </div>
        </div>
      </div>

      <div className="rounded-md bg-green-50 border border-green-100 p-3 text-xs text-green-700">
        <p className="font-medium mb-1">Timeline (parallel):</p>
        <p>
          t=0 → product, categories, and reviews all start →
          slowest resolves at t≈{totalMs}ms → done
        </p>
        <p className="mt-1">
          Compare with{" "}
          <Link href="/c07-data-fetching/waterfall" className="underline font-medium">
            /waterfall
          </Link>
          {" "}where the total time is latency1 + latency2 + latency3.
        </p>
      </div>
    </div>
  );
}

// ─── STATIC: hoisted variant explanation ─────────────────────────────────────

function HoistedVariantPanel() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm text-indigo-900">
      <h3 className="font-semibold">When to use hoisted promises vs Promise.all:</h3>
      <div className="grid gap-3 sm:grid-cols-2 text-xs">
        <div className="bg-white rounded-md border border-indigo-200 p-3 space-y-1">
          <p className="font-medium">Use Promise.all when:</p>
          <ul className="space-y-1 list-disc list-inside text-indigo-800">
            <li>All values are needed together</li>
            <li>You want the cleanest syntax</li>
            <li>Failure of any = failure of all (default)</li>
          </ul>
        </div>
        <div className="bg-white rounded-md border border-indigo-200 p-3 space-y-1">
          <p className="font-medium">Use hoisted promises when:</p>
          <ul className="space-y-1 list-disc list-inside text-indigo-800">
            <li>Values needed in different branches</li>
            <li>Per-promise error handling needed</li>
            <li>Combining with Promise.allSettled</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-indigo-700">
        Both patterns start all fetches at the same time — the performance is
        identical. Choose based on readability and error-handling needs.
      </p>
    </section>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function ParallelSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-gray-50 rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-gray-50 rounded animate-pulse" />
      </div>
    </div>
  );
}
