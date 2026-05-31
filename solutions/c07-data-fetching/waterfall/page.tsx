// ─── solutions/c07-data-fetching/waterfall/page.tsx ──────────────────────────
//
// REFERENCE SOLUTION — Waterfall anti-pattern
//
// This is the deliberate anti-pattern implementation. It is here as the
// canonical "before" state so you can compare its timing with the parallel
// solution. In a real codebase, this pattern should be replaced.

import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getProductRaw, listCategoriesRaw, listReviewsMemo } from "../../../app/(challenges)/c07-data-fetching/_lib/queries";

export default function WaterfallPageShell() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-gray-400 mb-1">
          solutions/c07-data-fetching/waterfall
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            Anti-pattern (reference)
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            Waterfall — Sequential Awaits
          </h1>
        </div>
        <p className="text-gray-600 text-sm">
          Three independent reads with sequential <code className="font-mono text-xs bg-gray-100 rounded px-1">await</code>s.
          Total ≈ latency1 + latency2 + latency3.
        </p>
      </div>

      <Suspense fallback={<Skeleton />}>
        <WaterfallData />
      </Suspense>

      <Link
        href="/solutions/c07-data-fetching/parallel"
        className="inline-block rounded-md bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700"
      >
        See the fix →
      </Link>
    </div>
  );
}

// ─── WATERFALL — the anti-pattern ────────────────────────────────────────────

async function WaterfallData() {
  // connection() must precede Date.now() under cacheComponents:true.
  // It signals dynamic intent so the framework allows reading the current time.
  await connection();
  // eslint-disable-next-line react-hooks/purity -- intentional: async Server Component timing demo
  const startMs = Date.now();

  // ❌ Sequential: each awaits blocks the next.
  // None of these fetches depend on each other, yet they run serially.
  const product    = await getProductRaw("p-elec-001");
  const categories = await listCategoriesRaw();
  const reviews    = await listReviewsMemo("p-elec-001");

  // eslint-disable-next-line react-hooks/purity -- intentional: timing measurement
  const totalMs = Date.now() - startMs;

  return (
    <div className="rounded-xl border border-red-200 bg-white p-6 space-y-4">
      <p className="text-sm font-semibold text-red-700">
        Total time: {totalMs}ms (sequential)
      </p>
      <p className="text-xs text-gray-600">
        Product: {product?.name ?? "not found"} |
        Categories: {categories.length} |
        Reviews: {reviews.length}
      </p>
      <div className="rounded-md bg-red-50 p-3 text-xs text-red-700">
        <p className="font-medium">Anti-pattern explanation:</p>
        <p>
          The three fetches above are independent but run in series.
          Each <code className="font-mono">await</code> holds up the next.
          Fix: use <code className="font-mono">Promise.all()</code> — see the
          parallel solution.
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-16 bg-gray-50 rounded animate-pulse" />
    </div>
  );
}
