// ─── solutions/c07-data-fetching/parallel/page.tsx ───────────────────────────
//
// REFERENCE SOLUTION — Parallel fetch with Promise.all
//
// This is the correct implementation. Compare its timing with the waterfall
// solution at solutions/c07-data-fetching/waterfall/page.tsx.

import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getProductRaw, listCategoriesRaw, listReviewsMemo } from "../../../app/(challenges)/c07-data-fetching/_lib/queries";

export default function ParallelPageShell() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-gray-400 mb-1">
          solutions/c07-data-fetching/parallel
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Solution
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            Parallel — Promise.all
          </h1>
        </div>
        <p className="text-gray-600 text-sm">
          The same three independent reads with{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">Promise.all</code>.
          Total ≈ max(latency1, latency2, latency3).
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <ParallelData />
      </Suspense>

      <Link
        href="/solutions/c07-data-fetching/waterfall"
        className="inline-block rounded-md bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700"
      >
        ← See the anti-pattern
      </Link>
    </div>
  );
}

// ─── PARALLEL — the fix ───────────────────────────────────────────────────────

async function ParallelData() {
  // connection() must precede Date.now() under cacheComponents:true.
  // It signals dynamic intent so the framework allows reading the current time.
  await connection();
  // eslint-disable-next-line react-hooks/purity -- intentional: async Server Component timing demo
  const startMs = Date.now();

  // ✅ Parallel: all three start at t=0, page waits for the slowest.
  const [product, categories, reviews] = await Promise.all([
    getProductRaw("p-elec-001"),
    listCategoriesRaw(),
    listReviewsMemo("p-elec-001"),
  ]);

  // eslint-disable-next-line react-hooks/purity -- intentional: timing measurement
  const totalMs = Date.now() - startMs;

  return (
    <div className="rounded-xl border border-green-200 bg-white p-6 space-y-4">
      <p className="text-sm font-semibold text-green-700">
        Total time: {totalMs}ms (parallel)
      </p>
      <p className="text-xs text-gray-600">
        Product: {product?.name ?? "not found"} |
        Categories: {categories.length} |
        Reviews: {reviews.length}
      </p>
      <div className="rounded-md bg-green-50 p-3 text-xs text-green-700">
        <p className="font-medium">Why this is correct:</p>
        <p>
          <code className="font-mono">Promise.all</code> starts all three
          promises simultaneously. The <code className="font-mono">await</code>{" "}
          waits only until the slowest resolves. For 3 fetches of ~80ms each,
          the total drops from ~240ms to ~80ms.
        </p>
      </div>
    </div>
  );
}

// ─── HOISTED VARIANT (same performance, shown as a comment) ──────────────────
//
// If you need the three values in different branches, hoist the promises:
//
//   const productP    = getProductRaw("p-elec-001");   // starts immediately
//   const categoriesP = listCategoriesRaw();            // starts immediately
//   const reviewsP    = listReviewsMemo("p-elec-001");  // starts immediately
//
//   // ...other synchronous work...
//
//   const product    = await productP;
//   const categories = await categoriesP;
//   const reviews    = await reviewsP;
//
// This is functionally equivalent to Promise.all — all three start at t=0.
// The difference is syntactic: hoisted promises are useful when you want
// per-promise error handling or when the values are needed far apart in the
// function body.

function Skeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-16 bg-gray-50 rounded animate-pulse" />
    </div>
  );
}
