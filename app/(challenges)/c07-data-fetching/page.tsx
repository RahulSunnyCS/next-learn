// ─── app/(challenges)/c07-data-fetching/page.tsx ─────────────────────────────
//
// C07 — Data Fetching Patterns: Memoisation, Waterfalls, and Preloading
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a STATIC SHELL. It renders headers, explanations, and nav
//   links immediately (static content). Each data-fetching demo is a child
//   async component wrapped in <Suspense> — those are the dynamic holes that
//   stream in.
//
//   The preload pattern is demonstrated here: preloadProduct() is called at
//   the top of the page function (before any child renders), so that by the
//   time <MemoDemo> renders and awaits getProductBySlugMemo(), the promise
//   is already in flight (or settled).
//
// NO `export const dynamic` — disallowed under cacheComponents.
// All uncached lib/data reads are inside <Suspense> child components below.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { preloadCategories } from "./_lib/preload";
import {
  getProductByIdMemo,
  listCategoriesMemo,
  underlyingFetchCount,
  resetFetchCount,
} from "./_lib/queries";
import type { Product, Category } from "@/lib/data";

export const metadata: Metadata = {
  title: "C07 — Data Fetching Patterns",
};

// ─── DEMO PRODUCT ──────────────────────────────────────────────────────────
// Using a stable, known product id from lib/data/fixtures.ts. Hardcoded so
// the static shell can refer to it without any runtime read.
const DEMO_PRODUCT_ID = "p-elec-001";
const DEMO_PRODUCT_SLUG = "wireless-noise-cancelling-headphones";

// ─── PAGE COMPONENT (static shell) ────────────────────────────────────────
//
// Under cacheComponents:true the static shell MUST NOT call any non-deterministic
// functions (Math.random, Date.now) or uncached data helpers — that includes
// preload helpers that delegate to lib/data (which simulates latency with
// Math.random). These calls must happen inside a Suspense-wrapped async
// component.
//
// The preload pattern is demonstrated inside MemoDemo below: the component
// calls preloadCategories() (a fire-and-forget) before its own awaits,
// so the category list is in-flight when CategoryListPanel renders later.
// The parent-before-child principle still holds — just scoped to within the
// dynamic rendering pass, not the static shell pass.

export default function C07DataFetchingPage() {
  // No connection() or preload calls here — this is the static prerender shell.

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c07-data-fetching</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Data Fetching Patterns
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Three patterns every Next.js App Router developer must know:
          request memoisation with <code className="font-mono text-xs bg-gray-100 rounded px-1">React.cache()</code>,
          fixing data-fetch waterfalls with{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">Promise.all</code>,
          and the preload pattern. The simulated latency in{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">@/lib/data</code>{" "}
          makes the timing differences observable in the Network tab.
        </p>
      </div>

      {/* ── STATIC SHELL: cache() vs 'use cache' explainer ── */}
      <CacheConceptExplainer />

      {/* ── DYNAMIC HOLE: memoisation demo ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Pattern 1 — Request Memoisation with <code className="font-mono text-sm">React.cache()</code>
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Three components below each call{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">getProductByIdMemo(&quot;{DEMO_PRODUCT_ID}&quot;)</code>.
          Despite three callers, only one underlying data read fires — proven
          by the fetch counter.
        </p>
        <Suspense fallback={<MemoDemoSkeleton />}>
          {/* MemoDemo reads underlyingFetchCount after all three callers run */}
          <MemoDemo productId={DEMO_PRODUCT_ID} />
        </Suspense>
      </section>

      {/* ── STATIC SHELL: preload explanation ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Pattern 3 — Preload Pattern
        </h2>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 space-y-3 text-sm text-blue-900">
          <p className="font-medium">How the preload works on this page:</p>
          <p>
            At the top of <code className="font-mono text-xs bg-blue-100 rounded px-1">MemoDemo</code>{" "}
            (the first dynamic component to render, BEFORE it awaits its own data),
            a fire-and-forget call is made:
          </p>
          <pre className="bg-white rounded border border-blue-200 p-3 text-xs overflow-x-auto">
            {`// Inside MemoDemo — first line, before any await:\npreloadCategories(); // starts the category fetch immediately`}
          </pre>
          <p>
            When{" "}
            <code className="font-mono text-xs bg-blue-100 rounded px-1">CategoryListPanel</code>{" "}
            later renders inside its own{" "}
            <code className="font-mono text-xs bg-blue-100 rounded px-1">&lt;Suspense&gt;</code>{" "}
            boundary and calls{" "}
            <code className="font-mono text-xs bg-blue-100 rounded px-1">listCategoriesMemo()</code>,
            the category promise is already in flight — eliminating that
            component&apos;s startup latency.
          </p>
          <p className="text-xs text-blue-700">
            <strong>Why not in the page shell?</strong>{" "}
            Under <code className="font-mono bg-blue-100 rounded px-1">cacheComponents:true</code>,
            the static page shell cannot call lib/data helpers (they use{" "}
            <code className="font-mono bg-blue-100 rounded px-1">Math.random()</code> for
            simulated latency — non-deterministic). The preload must fire inside
            a dynamic component. The parent-before-child principle still holds:
            the preload fires at the top of <code className="font-mono bg-blue-100 rounded px-1">MemoDemo</code>,
            before <code className="font-mono bg-blue-100 rounded px-1">CategoryListPanel</code>
            renders.
          </p>
          <p className="text-xs text-blue-700">
            Mechanism: <code className="font-mono bg-blue-100 rounded px-1">React.cache()</code>{" "}
            memoises the promise keyed by argument. The preload call
            stores the in-flight promise; <code className="font-mono bg-blue-100 rounded px-1">CategoryListPanel</code>{" "}
            retrieves the same promise. No second fetch fires.
          </p>
        </div>
      </section>

      {/* ── DYNAMIC HOLE: category list (benefits from preloadCategories) ── */}
      <Suspense fallback={<CategoryListSkeleton />}>
        <CategoryListPanel />
      </Suspense>

      {/* ── STATIC SHELL: navigation to sub-routes ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Pattern 2 — Waterfall vs. Parallel
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Navigate to the sub-routes below to see sequential awaits (slow) vs.
          <code className="font-mono text-xs bg-gray-100 rounded px-1 mx-1">Promise.all</code>
          (fast) side by side with live timing.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/c07-data-fetching/waterfall"
            className="block rounded-xl border border-red-200 bg-red-50 p-5 hover:border-red-400 transition-colors"
          >
            <p className="font-semibold text-red-700 mb-1">Waterfall (slow)</p>
            <p className="text-xs text-red-600 leading-relaxed">
              Three sequential <code className="font-mono bg-red-100 rounded px-0.5">await</code> calls.
              Total time ≈ N &times; max-latency.
              Each fetch waits for the previous one to finish.
            </p>
          </Link>
          <Link
            href="/c07-data-fetching/parallel"
            className="block rounded-xl border border-green-200 bg-green-50 p-5 hover:border-green-400 transition-colors"
          >
            <p className="font-semibold text-green-700 mb-1">Parallel (fast)</p>
            <p className="text-xs text-green-600 leading-relaxed">
              <code className="font-mono bg-green-100 rounded px-0.5">Promise.all</code> — all
              three start simultaneously. Total time ≈ max(latencies).
              The fix for every waterfall.
            </p>
          </Link>
        </div>
      </section>

      {/* ── STATIC SHELL: defend-it reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c07-data-fetching/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c07-data-fetching/</code>.
        </p>
      </section>
    </div>
  );
}

// ─── STATIC EXPLAINER (no data reads) ────────────────────────────────────────

function CacheConceptExplainer() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4 text-sm">
      <h2 className="text-base font-semibold text-indigo-900">
        <code className="font-mono">React.cache()</code> vs <code className="font-mono">&apos;use cache&apos;</code> — the critical distinction
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-lg border border-indigo-200 p-4 space-y-2">
          <p className="font-semibold text-indigo-700">React.cache()</p>
          <p className="text-xs text-indigo-800 leading-relaxed">
            <strong>Per-request memoisation.</strong> Deduplicates identical calls
            within one server render. Cache is discarded after the response is sent.
          </p>
          <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
            <li>Scope: one request</li>
            <li>Safe for user-specific data</li>
            <li>No tags or lifetimes</li>
            <li>Imported from <code className="font-mono bg-indigo-100 rounded px-0.5">&quot;react&quot;</code></li>
          </ul>
        </div>
        <div className="bg-white rounded-lg border border-indigo-200 p-4 space-y-2">
          <p className="font-semibold text-indigo-700">&apos;use cache&apos; directive</p>
          <p className="text-xs text-indigo-800 leading-relaxed">
            <strong>Cross-request persistence.</strong> Result survives beyond
            the current request and is shared across users. Tagged for
            targeted invalidation.
          </p>
          <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
            <li>Scope: server cache (cross-request)</li>
            <li>Public data only</li>
            <li>Requires cacheTag + cacheLife</li>
            <li>Covered in depth in C08</li>
          </ul>
        </div>
      </div>
      <p className="text-xs text-indigo-700">
        <strong>Use both together</strong> for public data: <code className="font-mono bg-indigo-100 rounded px-0.5">&apos;use cache&apos;</code>{" "}
        persists the result across requests; <code className="font-mono bg-indigo-100 rounded px-0.5">React.cache()</code>{" "}
        deduplicates within one request. See{" "}
        <code className="font-mono bg-indigo-100 rounded px-0.5">solutions/c07-data-fetching/cache-flow.md</code>{" "}
        for the full diagram.
      </p>
    </section>
  );
}

// ─── DYNAMIC HOLE: memoisation demo ──────────────────────────────────────────
// This async component intentionally calls getProductByIdMemo three times to
// prove deduplication. In a real app the three callers would be separate child
// components; here they are consolidated into one component so the
// underlyingFetchCount is readable after all three resolve.

async function MemoDemo({ productId }: { productId: string }) {
  // Establish the dynamic context first. Under cacheComponents:true, any call
  // that triggers Math.random() (including all lib/data helpers, which use it
  // for simulated latency) must happen AFTER an await of a dynamic signal.
  // connection() is the canonical dynamic signal for components that don't
  // need cookies/headers but still read non-deterministic data.
  await connection();

  // PRELOAD PATTERN: fire-and-forget category fetch BEFORE our own awaits.
  // Now that connection() has established the dynamic context, preloadCategories()
  // can safely call lib/data (Math.random latency). By the time CategoryListPanel
  // renders and calls listCategoriesMemo(), the promise is already in flight.
  // The parent-before-child principle holds — MemoDemo IS the parent here.
  preloadCategories();

  // Reset the counter before this render context so we get a clean reading.
  // NOTE: In a parallel-Suspense scenario you cannot reliably reset across
  // boundaries; this demo places all three calls in one component for clarity.
  resetFetchCount();

  // Three separate calls to the MEMOISED accessor.
  // underlyingFetchCount will be 1 after all three resolve (not 3).
  const product1 = await getProductByIdMemo(productId);
  const product2 = await getProductByIdMemo(productId); // hits memo — no new fetch
  const product3 = await getProductByIdMemo(productId); // hits memo — no new fetch

  // All three references point to the same object (same identity, not just equal).
  const isSameRef = product1 === product2 && product2 === product3;
  const finalCount = underlyingFetchCount;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          finalCount === 1
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : "bg-red-50 text-red-700 ring-1 ring-red-200"
        }`}>
          {finalCount === 1 ? "Deduplicated" : `${finalCount} calls fired`}
        </span>
        <span className="text-sm text-gray-600">
          3 component calls → <strong>{finalCount}</strong> underlying data read
          {finalCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 font-mono text-xs space-y-1">
        <p className="text-gray-500">{"// All three calls return the same product:"}</p>
        <p className="text-gray-800">
          product1.id = <span className="text-indigo-600">&quot;{product1?.id ?? "null"}&quot;</span>
        </p>
        <p className="text-gray-800">
          product2.id = <span className="text-indigo-600">&quot;{product2?.id ?? "null"}&quot;</span>
        </p>
        <p className="text-gray-800">
          product3.id = <span className="text-indigo-600">&quot;{product3?.id ?? "null"}&quot;</span>
        </p>
        <p className="text-gray-500 mt-2">{"// Same object reference?"}</p>
        <p className="text-gray-800">
          product1 === product2 === product3 →{" "}
          <span className={isSameRef ? "text-green-600" : "text-red-600"}>
            {String(isSameRef)}
          </span>
        </p>
      </div>

      <div className="rounded-md bg-indigo-50 border border-indigo-100 p-4 text-xs text-indigo-800 space-y-2">
        <p className="font-medium">What just happened:</p>
        <p>
          <code className="font-mono bg-indigo-100 rounded px-0.5">getProductByIdMemo</code>{" "}
          is wrapped with <code className="font-mono bg-indigo-100 rounded px-0.5">React.cache()</code>.
          The first call fetches from the data layer (fires the random delay).
          Calls 2 and 3 return the memoised promise — no additional delay, no
          additional data-layer hit.
        </p>
        <p>
          <code className="font-mono bg-indigo-100 rounded px-0.5">underlyingFetchCount</code>{" "}
          in <code className="font-mono bg-indigo-100 rounded px-0.5">_lib/queries.ts</code>{" "}
          increments only inside the raw accessor. With memo: it increments once.
          Without memo (using <code className="font-mono bg-indigo-100 rounded px-0.5">getProductRaw</code>):
          it would increment three times.
        </p>
      </div>

      {product1 && (
        <div className="text-sm text-gray-700">
          <span className="font-medium">Product loaded:</span> {product1.name}
          {" "}— ${(product1.priceCents / 100).toFixed(2)}
        </div>
      )}
    </div>
  );
}

// ─── DYNAMIC HOLE: category list (preload demo) ───────────────────────────────

async function CategoryListPanel() {
  // connection() establishes the dynamic context before any lib/data call.
  // Required under cacheComponents:true because listCategoriesMemo() triggers
  // Math.random() (simulated latency in lib/data). If MemoDemo already ran
  // preloadCategories(), this call returns the memoised in-flight promise
  // (no second fetch fires — React cache() deduplicates it).
  await connection();
  const categories = await listCategoriesMemo();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
          Preloaded
        </span>
        <h3 className="font-semibold text-gray-900 text-sm">
          Categories (preload demo)
        </h3>
      </div>
      <p className="text-xs text-gray-500">
        Fetched via <code className="font-mono bg-gray-100 rounded px-0.5">listCategoriesMemo()</code>,
        which was preloaded by the parent page before this component rendered.
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map((cat: Category) => (
          <li
            key={cat.id}
            className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700 font-medium"
          >
            {cat.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── SKELETONS ────────────────────────────────────────────────────────────────

function MemoDemoSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mb-4" />
      <div className="h-24 bg-gray-50 rounded animate-pulse mb-3" />
      <div className="h-16 bg-indigo-50 rounded animate-pulse" />
    </div>
  );
}

function CategoryListSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="grid grid-cols-3 gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
