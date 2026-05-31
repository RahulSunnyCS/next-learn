// ─── app/(challenges)/c07-data-fetching/waterfall/page.tsx ───────────────────
//
// C07 — Waterfall Demo: intentionally sequential awaits to show the anti-pattern.
//
// CACHE COMPONENTS PATTERN:
//   This is a fully dynamic demo page (all data is dynamic). The page itself
//   IS the dynamic component — it is wrapped in an outer Suspense by the
//   parent layout or by Next.js streaming. All data reads are inside this
//   async component which IS inside a Suspense boundary provided by the outer
//   layout shell.
//
//   We use a single dynamic component here (not the static shell + Suspense
//   hole pattern from C01/C03) because the entire point of this page is to
//   show sequential timing — splitting into a static shell would obscure the
//   lesson.
//
//   The outer <Suspense> boundary is provided by the WaterfallPageShell
//   static component below.
//
// NO `export const dynamic` — disallowed under cacheComponents.
// The dynamic content is wrapped in Suspense below.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getProductRaw, listCategoriesRaw, listReviewsMemo } from "../_lib/queries";

export const metadata: Metadata = {
  title: "C07 — Waterfall (slow)",
};

// ─── STATIC SHELL ─────────────────────────────────────────────────────────────

export default function WaterfallPageShell() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Static header — prerenders immediately */}
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
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            Anti-pattern
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            Waterfall — Sequential Awaits
          </h1>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">
          Three independent data reads executed with sequential{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">await</code>s.
          Each fetch waits for the previous one to finish — even though they
          are completely independent. Total time ≈ N &times; max-latency.
        </p>
      </div>

      {/* Code comparison — static, no data needed */}
      <WaterfallCodePanel />

      {/* Dynamic hole: the actual waterfall fetch */}
      <Suspense fallback={<WaterfallSkeleton />}>
        <WaterfallData />
      </Suspense>

      {/* Static explainer */}
      <section className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-800 space-y-2">
        <p className="font-semibold">Why this is slow:</p>
        <p>
          <code className="font-mono text-xs bg-red-100 rounded px-1">await getProductRaw()</code>{" "}
          blocks until the product resolves (~30–120ms). Only then does{" "}
          <code className="font-mono text-xs bg-red-100 rounded px-1">await listCategoriesRaw()</code>{" "}
          start. Only then do reviews start. The three latencies stack:
          if each takes ~80ms, the total is ~240ms.
        </p>
        <p>
          Compare with the{" "}
          <Link href="/c07-data-fetching/parallel" className="underline font-medium">
            parallel version
          </Link>
          {" "}which does the same work in ~max(80ms) ≈ 80ms.
        </p>
      </section>
    </div>
  );
}

// ─── STATIC CODE PANEL ───────────────────────────────────────────────────────

function WaterfallCodePanel() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
      <h2 className="font-semibold text-gray-900 text-sm">The anti-pattern:</h2>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs overflow-x-auto text-gray-800 leading-relaxed">
        {`// ❌ SEQUENTIAL — each await blocks the next
const product    = await getProductRaw(id);    // wait...
const categories = await listCategoriesRaw();  // wait more...
const reviews    = await listReviewsMemo(id);  // wait even more...
//                                   ↑ total ≈ N × latency`}
      </pre>
      <p className="text-xs text-gray-500">
        These three reads are completely independent — none depends on the
        result of the others. Sequential awaits are only justified when one
        fetch genuinely depends on the result of a previous one.
      </p>
    </section>
  );
}

// ─── DYNAMIC HOLE: the waterfall ─────────────────────────────────────────────
// This async component deliberately uses sequential awaits to demonstrate the
// anti-pattern. We use getProductRaw / listCategoriesRaw (not memoised) so
// each fires its own independent latency. Using the memoised versions would
// deduplicate and obscure the timing lesson.

async function WaterfallData() {
  // connection() signals to Next.js that this component reads dynamic data
  // (request-time). This must come before Date.now() — under cacheComponents,
  // calling Date.now() before any dynamic data access is disallowed during
  // prerender (it would make the static shell non-deterministic). Calling
  // connection() first establishes the dynamic context.
  await connection();
  // eslint-disable-next-line react-hooks/purity -- intentional: async Server Component timing demo
  const startMs = Date.now();

  // ── WATERFALL: each await is sequential ───────────────────────────────────
  // Step 1: product. Starts at t=0, finishes at ~t+latency1.
  const product = await getProductRaw("p-elec-001");

  // Step 2: categories. Starts ONLY after product is done. Finishes at ~t+latency1+latency2.
  const categories = await listCategoriesRaw();

  // Step 3: reviews. Starts ONLY after categories are done.
  const reviews = await listReviewsMemo("p-elec-001");

  // eslint-disable-next-line react-hooks/purity -- intentional: timing measurement
  const totalMs = Date.now() - startMs;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
          Sequential
        </span>
        <span className="text-sm font-semibold text-gray-900">
          Total time: <span className="text-red-600">{totalMs}ms</span>
        </span>
        <span className="text-xs text-gray-500">
          (≈ latency1 + latency2 + latency3)
        </span>
      </div>

      <div className="space-y-3 text-sm">
        {product && (
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
            <div>
              <span className="font-medium text-gray-800">Product:</span>
              {" "}{product.name}
              <span className="ml-2 text-xs text-gray-500">${(product.priceCents / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-800">Categories:</span>
            {" "}{categories.map(c => c.name).join(", ")}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
          <div>
            <span className="font-medium text-gray-800">Reviews:</span>
            {" "}{reviews.length} reviews for this product
          </div>
        </div>
      </div>

      <div className="rounded-md bg-red-50 border border-red-100 p-3 text-xs text-red-700">
        <p className="font-medium mb-1">Timeline (sequential):</p>
        <p>
          t=0 → product starts → product resolves →
          categories start → categories resolve →
          reviews start → reviews resolve → done at t={totalMs}ms
        </p>
        <p className="mt-1">
          Compare with{" "}
          <Link href="/c07-data-fetching/parallel" className="underline font-medium">
            /parallel
          </Link>
          {" "}where all three start at t=0 and the page resolves in ~max(latencies).
        </p>
      </div>
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function WaterfallSkeleton() {
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
