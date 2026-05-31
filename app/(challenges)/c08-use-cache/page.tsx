// ─── app/(challenges)/c08-use-cache/page.tsx ──────────────────────────────
//
// C08 — Current Caching Model: 'use cache'
//
// ═══════════════════════════════════════════════════════════════
//  WHAT THIS PAGE TEACHES
// ═══════════════════════════════════════════════════════════════
//
// 1. THREE PLACEMENT LEVELS of 'use cache':
//    a) File-level   — getAllCachedCategories() in _lib/cached.ts
//    b) Function-level — getCachedProductSummary() in _lib/cached.ts
//    c) Component-level — CachedPanel in _components/CachedPanel.tsx
//
// 2. 'use cache' vs React cache():
//    - React cache() memoises within a SINGLE render pass (per-request).
//      At the end of the request the memo is discarded. Two components in
//      the same render that call the same cache()-wrapped function get the
//      same result without a second fetch — but the NEXT request runs fresh.
//    - 'use cache' stores in a DURABLE server-side store that PERSISTS across
//      requests. Cache hits on the next request, and the one after, until the
//      TTL expires or revalidateTag() evicts the entry.
//
// 3. CACHED vs UNCACHED rendering:
//    - A component using 'use cache' data: the page shell is fully
//      prerenderable (○ or ◐). If the route only reads cached data, it is ○.
//    - An uncached component inside <Suspense>: the shell prerenders; the hole
//      runs fresh per-request and streams in. The route shows ◐.
//    - An uncached component OUTSIDE <Suspense> at page top-level: build fails
//      with "Uncached data accessed outside <Suspense>". NEVER do this.
//
// 4. cacheTag + cacheLife:
//    Both must be called BEFORE the first `await` in a 'use cache' boundary.
//
// ─── CACHE COMPONENTS RULES ─────────────────────────────────────────────
// • NO export const dynamic / dynamicParams / revalidate / fetchCache.
// • Dynamic data (uncached reads) → must be inside <Suspense>.
// • Opt INTO caching with 'use cache', not out with directives.

import { Suspense } from "react";
import { cache } from "react"; // per-request dedup, NOT cross-request persistence
import type { Metadata } from "next";
import { connection } from "next/server";
import { getProductById, listProducts } from "@/lib/data";
import type { Product } from "@/lib/data";
import {
  getAllCachedCategories,
  getCachedProductSummary,
} from "./_lib/cached";
import CachedPanel, { CachedPanelSkeleton } from "./_components/CachedPanel";

// ── Metadata (static — part of the shell) ─────────────────────────────────

export const metadata: Metadata = {
  title: "C08 — use cache: Current Caching Model",
};

// ── React cache() — per-request memoisation ───────────────────────────────
//
// React.cache() wraps a function so that if it is called multiple times
// with the SAME arguments in a SINGLE server render, the function body runs
// only once and its result is shared across all callers in that render tree.
//
// KEY DISTINCTION from 'use cache':
//   - React cache() memo lives only for the CURRENT request. At request end
//     it is discarded. No second request ever benefits.
//   - 'use cache' persists to a durable server store, shared across all
//     requests, until the TTL or a revalidateTag() call evicts it.
//
// USE WHEN: avoiding redundant database/API calls within a single render when
// the same data is needed by multiple components. E.g. a user session, or a
// product that appears both in the breadcrumb and in the main panel.
//
// WARNING: getProductById uses Math.random() for simulated latency, so it is
// non-deterministic. We wrap it in React cache() here only to demonstrate the
// per-request dedup semantics. The actual page structure avoids calling it
// at the top level (it goes inside a <Suspense>-wrapped async component).

const deduplicatedGetProduct = cache(async (productId: string): Promise<Product | null> => {
  // This function body runs AT MOST ONCE per request, no matter how many
  // components call deduplicatedGetProduct(productId) with the same id.
  // The second call in the same render returns the memoised result.
  return await getProductById(productId);
});

// ── Page component ─────────────────────────────────────────────────────────

export default async function C08UseCachePage() {
  // CACHED reads — safe at page top level because they go through 'use cache'.
  // Next.js serves them from the cache store without re-running the function,
  // so no non-deterministic code runs here during prerender.
  const categories = await getAllCachedCategories();
  // getCachedProductSummary uses function-level 'use cache' — also safe here.
  const featuredProduct = await getCachedProductSummary("p-elec-001");

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* ── Challenge label ── */}
      <RouteLabel />

      {/* ════════════════════════════════════════════════════════
          SECTION 1: The three 'use cache' placement levels
          ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          badge="Core Concept"
          title="Three Placement Levels of 'use cache'"
          subtitle="The same directive behaves differently depending on where you place it."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Level 1 — File-level */}
          <FileLevelPanel categories={categories} />

          {/* Level 2 — Function-level (data from _lib/cached.ts) */}
          <FunctionLevelPanel product={featuredProduct} />

          {/* Level 3 — Component-level: CachedPanel is itself 'use cache' */}
          {/* Wrapped in Suspense because the first call involves a data fetch.
              On cache-hit requests the component resolves almost instantly
              because Next.js returns the stored RSC payload. */}
          <Suspense fallback={<CachedPanelSkeleton />}>
            <CachedPanel productId="p-elec-002" />
          </Suspense>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 2: React cache() vs 'use cache' contrast
          ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          badge="Key Distinction"
          title="React cache() vs Next.js 'use cache'"
          subtitle="Per-request dedup vs cross-request persistence — choose the right tool."
        />
        <CacheComparisonTable />
        {/* Live demo: two components that call the same React cache()-wrapped
            function. They share one result within this render. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Suspense fallback={<UncachedSkeleton label="cache() caller A" />}>
            <ReactCacheDemoA fetcher={deduplicatedGetProduct} />
          </Suspense>
          <Suspense fallback={<UncachedSkeleton label="cache() caller B" />}>
            <ReactCacheDemoB fetcher={deduplicatedGetProduct} />
          </Suspense>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Both panels above call <code className="font-mono bg-gray-100 rounded px-1">deduplicatedGetProduct(&quot;p-elec-003&quot;)</code>{" "}
          via React&apos;s <code className="font-mono bg-gray-100 rounded px-1">cache()</code>.
          The function body runs only ONCE in this render — the second component
          receives the memoised result. Reload the page and both panels update
          (memo is discarded between requests). Compare to{" "}
          <code className="font-mono bg-gray-100 rounded px-1">&apos;use cache&apos;</code>:
          a &apos;use cache&apos; function would have returned the same result on reload too,
          until its TTL or revalidateTag() expired the entry.
        </p>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 3: Cached vs Uncached — observable difference
          ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          badge="Build Symbol"
          title="Cached vs Uncached — Route Table Impact"
          subtitle="What 'use cache' presence/absence means for the Next.js build output."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cached side — data from _lib/cached.ts ('use cache') */}
          <CachedDataPanel product={featuredProduct} />

          {/* Uncached side — reads @/lib/data DIRECTLY, no 'use cache'.
              MUST be inside <Suspense> because it is a non-deterministic
              uncached read (lib/data uses Math.random() for latency). */}
          <Suspense fallback={<UncachedSkeleton label="Uncached (◐ hole)" />}>
            <UncachedDataPanel productId="p-elec-004" />
          </Suspense>
        </div>
        <BuildSymbolExplainer />
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 4: cacheTag + cacheLife reference
          ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          badge="API Reference"
          title="cacheTag and cacheLife"
          subtitle="Tag for targeted invalidation. Life for time-based revalidation."
        />
        <CacheTagAndLifePanel />
      </section>

      {/* ════════════════════════════════════════════════════════
          SECTION 5: Mental model cheat-sheet (static shell)
          ════════════════════════════════════════════════════════ */}
      <section className="space-y-3">
        <SectionHeader
          badge="Mental Model"
          title="Cheat Sheet: When to Use Each Caching Primitive"
          subtitle="Three questions to pick the right tool for the job."
        />
        <MentalModelCheatSheet />
      </section>

      {/* ── Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c08-use-cache/_meta/defend-it.md
          </code>{" "}
          — especially Q3 (draw the cache-flow diagram). Commit it first, then
          open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c08-use-cache/</code>.
        </p>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 1 PANEL — file-level 'use cache' result
// ═══════════════════════════════════════════════════════════════

function FileLevelPanel({ categories }: { categories: { id: string; name: string }[] }) {
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
          File-level &apos;use cache&apos;
        </span>
      </div>
      <p className="text-xs text-violet-700 leading-relaxed">
        <code className="font-mono bg-violet-100 rounded px-1">&apos;use cache&apos;</code> at the
        top of <code className="font-mono bg-violet-100 rounded px-1">_lib/cached.ts</code> caches
        EVERY async export. <code className="font-mono bg-violet-100 rounded px-1">getAllCachedCategories()</code>{" "}
        inherits it — no inner directive needed.
      </p>
      <div className="space-y-1">
        {categories.slice(0, 4).map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 text-xs text-violet-800">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
            {cat.name}
          </div>
        ))}
        {categories.length > 4 && (
          <p className="text-xs text-violet-500">+{categories.length - 4} more</p>
        )}
      </div>
      <div className="rounded-md bg-white border border-violet-100 p-2 text-xs font-mono text-gray-600">
        <p className="text-gray-400 mb-1">{"// _lib/cached.ts line 1"}</p>
        <p className="text-violet-700">&apos;use cache&apos;;</p>
        <p className="text-gray-400 mt-1">{"// all exports cached"}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEVEL 2 PANEL — function-level 'use cache' result
// ═══════════════════════════════════════════════════════════════

function FunctionLevelPanel({ product }: { product: { id: string; name: string; priceCents: number; currency: string } | null }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
          Function-level &apos;use cache&apos;
        </span>
      </div>
      <p className="text-xs text-blue-700 leading-relaxed">
        <code className="font-mono bg-blue-100 rounded px-1">getCachedProductSummary()</code>{" "}
        has <code className="font-mono bg-blue-100 rounded px-1">&apos;use cache&apos;</code> as its
        FIRST LINE. Only THIS function is cached — others in the same file could
        be uncached.
      </p>
      {product ? (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{product.name}</p>
          <p className="text-xs text-gray-500">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).format(product.priceCents / 100)}
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 italic">Product not found</p>
      )}
      <div className="rounded-md bg-white border border-blue-100 p-2 text-xs font-mono text-gray-600">
        <p className="text-gray-400 mb-1">{"// inside function body"}</p>
        <p className="text-blue-700">&apos;use cache&apos;;</p>
        <p>cacheTag(tags.product(id));</p>
        <p>cacheLife(&apos;hours&apos;);</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// React cache() DEMO — two callers, one fetch per request
// ═══════════════════════════════════════════════════════════════

// Both components receive the SAME deduplicatedGetProduct function reference
// (wrapped with React.cache()). Calling it with the same argument twice in
// a single render tree runs the underlying fetch exactly once.

async function ReactCacheDemoA({
  fetcher,
}: {
  fetcher: (id: string) => Promise<Product | null>;
}) {
  // connection() establishes the dynamic context before any lib/data call.
  // React.cache() does NOT add 'use cache' semantics — it's per-request dedup,
  // not a cached boundary, so Math.random() in lib/data is still non-deterministic.
  await connection();
  const product = await fetcher("p-elec-003");
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          React cache() — Caller A
        </span>
      </div>
      <p className="text-xs text-amber-700">
        Per-request dedup. This result lives only for this render.
      </p>
      <p className="text-sm font-medium text-gray-800">{product?.name ?? "Not found"}</p>
      <p className="text-xs text-gray-500 font-mono">id: p-elec-003</p>
    </div>
  );
}

async function ReactCacheDemoB({
  fetcher,
}: {
  fetcher: (id: string) => Promise<Product | null>;
}) {
  // connection() is required here too — same reason as ReactCacheDemoA above.
  // Even if caller A's connection() already fired, each dynamic component needs
  // its own connection() to satisfy the cacheComponents constraint.
  await connection();
  // Same call — same arg — function body runs only once this render.
  // Caller A already executed it; this call receives the memoised result.
  const product = await fetcher("p-elec-003");
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
          React cache() — Caller B
        </span>
      </div>
      <p className="text-xs text-amber-700">
        Same id, same render — got the MEMOISED result. Zero extra fetches.
      </p>
      <p className="text-sm font-medium text-gray-800">{product?.name ?? "Not found"}</p>
      <p className="text-xs text-gray-500 font-mono">id: p-elec-003 (deduped)</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CACHED vs UNCACHED — side-by-side comparison panels
// ═══════════════════════════════════════════════════════════════

// This panel uses data already fetched via 'use cache' — no new fetch needed.
function CachedDataPanel({ product }: { product: { id: string; name: string; priceCents: number; currency: string } | null }) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 ring-1 ring-green-200">
          ○ / ◐  Cached
        </span>
      </div>
      <p className="text-xs text-green-700 leading-relaxed">
        Data served from <code className="font-mono bg-green-100 rounded px-1">&apos;use cache&apos;</code>.
        This panel is part of the STATIC SHELL — prerendered, served instantly.
        The function body does not run on cache-hit requests.
      </p>
      {product ? (
        <p className="text-sm font-semibold text-gray-900">{product.name}</p>
      ) : (
        <p className="text-xs text-gray-500 italic">No product</p>
      )}
      <p className="text-xs text-gray-500">
        Route table: <code className="font-mono bg-gray-100 rounded px-1">◐</code> because
        the page also has an uncached hole (right panel).
      </p>
    </div>
  );
}

// This component has NO 'use cache'. It calls lib/data directly → uncached,
// non-deterministic (Math.random latency). MUST be inside <Suspense>.
async function UncachedDataPanel({ productId }: { productId: string }) {
  // connection() establishes the dynamic context before the uncached lib/data call.
  // listProducts() uses Math.random() for latency simulation — non-deterministic.
  // UNCACHED read — runs on every request, no cache hit possible.
  // If placed OUTSIDE a <Suspense> at the page top-level, the build would
  // fail: "Uncached data was accessed outside of <Suspense>".
  await connection();
  const product = await listProducts({ pageSize: 1 });
  const item = product.items[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
          ◐  Uncached hole
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">
        <strong>No <code className="font-mono bg-gray-100 rounded px-1">&apos;use cache&apos;</code></strong> — this component
        re-runs on EVERY request. The simulated latency from{" "}
        <code className="font-mono bg-gray-100 rounded px-1">@/lib/data</code> is always incurred.
        It streams in AFTER the shell.
      </p>
      {item ? (
        <p className="text-sm font-semibold text-gray-900">{item.name}</p>
      ) : (
        <p className="text-xs text-gray-500 italic">No product</p>
      )}
      <p className="text-xs text-gray-500">
        This hole makes the route <code className="font-mono bg-gray-100 rounded px-1">◐</code> instead
        of <code className="font-mono bg-gray-100 rounded px-1">○</code>.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BUILD SYMBOL EXPLAINER — static content, part of the shell
// ═══════════════════════════════════════════════════════════════

function BuildSymbolExplainer() {
  const rows = [
    {
      symbol: "○",
      label: "Static",
      description: "All data at route top-level is cached (or no data at all). Prerendered once, served from CDN forever.",
      example: "Marketing page, pricing table, category index with 'use cache'",
      color: "text-emerald-700 bg-emerald-50",
    },
    {
      symbol: "◐",
      label: "Partial Prerender",
      description: "Shell is cached (○ part). One or more Suspense holes contain uncached reads that run per-request.",
      example: "Product detail: shell is cached, live stock / reviews are uncached holes",
      color: "text-indigo-700 bg-indigo-50",
    },
    {
      symbol: "ƒ",
      label: "Dynamic",
      description: "Uncached data accessed at route top-level (outside Suspense). Build fails if cacheComponents is on — fix by wrapping in Suspense.",
      example: "API route handler, route that reads cookies at top level without Suspense",
      color: "text-red-700 bg-red-50",
    },
  ] as const;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {["Symbol", "Strategy", "When you see it", "Real-world example"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.symbol} className="bg-white">
              <td className={`px-3 py-2 font-bold text-base font-mono ${row.color} rounded-l`}>
                {row.symbol}
              </td>
              <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{row.label}</td>
              <td className="px-3 py-2 text-gray-600 max-w-xs">{row.description}</td>
              <td className="px-3 py-2 text-gray-500 max-w-xs">{row.example}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// cacheTag + cacheLife reference panel — static content
// ═══════════════════════════════════════════════════════════════

function CacheTagAndLifePanel() {
  return (
    <div className="space-y-4">
      {/* cacheTag */}
      <div className="rounded-xl border border-indigo-100 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-sm text-gray-900">
          <code className="font-mono bg-indigo-50 rounded px-1 mr-1">cacheTag(...tags)</code>
          — Targeted Invalidation
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Associates one or more string tags with the cache entry. Call
          <code className="font-mono bg-gray-100 rounded px-1 mx-1">revalidateTag(tag)</code>
          from a Server Action to instantly evict ALL cache entries carrying that tag,
          regardless of their TTL. Supports multiple tags in one call.
        </p>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs font-mono space-y-1 text-gray-700">
          <p className="text-gray-400">{"// single tag"}</p>
          <p>cacheTag(tags.product(slug));</p>
          <p className="text-gray-400 mt-2">{"// multiple tags — both invalidate this entry"}</p>
          <p>cacheTag(tags.product(slug), tags.products);</p>
          <p className="text-gray-400 mt-2">{"// invalidation (in a Server Action):"}</p>
          <p>revalidateTag(tags.product(slug));</p>
        </div>
        <p className="text-xs text-gray-500">
          Tag constants are defined in{" "}
          <code className="font-mono bg-gray-100 rounded px-1">@/lib/data</code> —
          never hard-code tag strings; import from the shared constant.
        </p>
      </div>

      {/* cacheLife built-in profiles */}
      <div className="rounded-xl border border-indigo-100 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-sm text-gray-900">
          <code className="font-mono bg-indigo-50 rounded px-1 mr-1">cacheLife(profile)</code>
          — Time-Based Revalidation
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          Sets a stale window. After the TTL expires, the next request triggers
          a background recompute (stale-while-revalidate semantics). Built-in profiles:
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Profile", "Approx TTL", "Best for"].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["'seconds'", "~30–60 s", "Dev demos, rapidly-changing counters"],
                ["'minutes'", "~5–10 min", "Dashboard metrics, live feeds"],
                ["'hours'", "~1 hour", "Product data, catalog pages (this challenge)"],
                ["'days'", "~24 hours", "Category lists, stable reference data"],
                ["'weeks'", "~7 days", "Evergreen content, infrequent config"],
                ["'max'", "Maximum", "Build-time config, truly static data"],
              ].map(([profile, ttl, use]) => (
                <tr key={profile} className="bg-white">
                  <td className="px-3 py-1.5 font-mono font-medium text-indigo-700">{profile}</td>
                  <td className="px-3 py-1.5 text-gray-600">{ttl}</td>
                  <td className="px-3 py-1.5 text-gray-500">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs font-mono space-y-1 text-gray-700">
          <p className="text-gray-400">{"// Custom profile — defined in next.config.ts:"}</p>
          <p className="text-gray-500">{"// experimental: {"}</p>
          <p className="text-gray-500 pl-4">{"//   cacheLife: {"}</p>
          <p className="text-gray-500 pl-8">{"//   'product-detail': {"}</p>
          <p className="text-gray-500 pl-12">{"//     stale: 30,      // serve stale for 30s"}</p>
          <p className="text-gray-500 pl-12">{"//     revalidate: 3600, // recompute after 1h"}</p>
          <p className="text-gray-500 pl-12">{"//     expire: 86400   // hard-expire after 24h"}</p>
          <p className="text-gray-500 pl-8">{"//   }"}</p>
          <p className="text-gray-500 pl-4">{"//   }"}</p>
          <p className="text-gray-500">{"// }"}</p>
          <p className="mt-2">cacheLife(&apos;product-detail&apos;);</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CACHE COMPARISON TABLE — React cache() vs 'use cache'
// ═══════════════════════════════════════════════════════════════

function CacheComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {["", "React cache()", "Next.js 'use cache'"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-gray-700">
          <tr className="bg-white">
            <td className="px-3 py-2 font-medium text-gray-500">Scope</td>
            <td className="px-3 py-2">Single request (one SSR pass)</td>
            <td className="px-3 py-2 font-medium text-indigo-700">Cross-request (durable server store)</td>
          </tr>
          <tr className="bg-gray-50/50">
            <td className="px-3 py-2 font-medium text-gray-500">Lives until</td>
            <td className="px-3 py-2">Request ends → memo discarded</td>
            <td className="px-3 py-2 font-medium text-indigo-700">TTL expires or revalidateTag() called</td>
          </tr>
          <tr className="bg-white">
            <td className="px-3 py-2 font-medium text-gray-500">Shared between</td>
            <td className="px-3 py-2">Components in the same render tree</td>
            <td className="px-3 py-2 font-medium text-indigo-700">All requests, all users, all server instances</td>
          </tr>
          <tr className="bg-gray-50/50">
            <td className="px-3 py-2 font-medium text-gray-500">Best for</td>
            <td className="px-3 py-2">Avoiding duplicate fetches in one render (e.g. user session)</td>
            <td className="px-3 py-2 font-medium text-indigo-700">Reusing stable data across many requests (e.g. product catalog)</td>
          </tr>
          <tr className="bg-white">
            <td className="px-3 py-2 font-medium text-gray-500">Syntax</td>
            <td className="px-3 py-2 font-mono">const fn = cache(async () =&gt; ...)</td>
            <td className="px-3 py-2 font-mono text-indigo-700">async function fn() {"{  'use cache'; ... }"}</td>
          </tr>
          <tr className="bg-gray-50/50">
            <td className="px-3 py-2 font-medium text-gray-500">Invalidation</td>
            <td className="px-3 py-2">Automatic (request boundary)</td>
            <td className="px-3 py-2 font-medium text-indigo-700">Explicit: revalidateTag() or TTL</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MENTAL MODEL CHEAT-SHEET — static content, part of shell
// ═══════════════════════════════════════════════════════════════

function MentalModelCheatSheet() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
      {/* Decision tree */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">
          Pick the right primitive — 3 questions
        </h3>
        <ol className="space-y-3 text-xs text-gray-700">
          <li className="flex gap-3">
            <span className="font-bold text-indigo-600 shrink-0">1.</span>
            <div>
              <p className="font-medium">Do you need this result in the NEXT request too?</p>
              <p className="text-gray-500 mt-0.5">
                <strong>No</strong> → use React <code className="font-mono bg-gray-100 rounded px-1">cache()</code> for intra-render dedup.<br />
                <strong>Yes</strong> → use <code className="font-mono bg-gray-100 rounded px-1">&apos;use cache&apos;</code>.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-indigo-600 shrink-0">2.</span>
            <div>
              <p className="font-medium">Where are you placing <code className="font-mono bg-gray-100 rounded px-1">&apos;use cache&apos;</code>?</p>
              <p className="text-gray-500 mt-0.5">
                <strong>Every export in a module should be cached</strong> → file-level (first line of the <code className="font-mono bg-gray-100 rounded px-1">.ts</code> file).<br />
                <strong>One specific function needs caching</strong> → function-level (first line of the function body).<br />
                <strong>Cache the entire rendered component output</strong> → component-level (first line of the async Server Component body).
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-indigo-600 shrink-0">3.</span>
            <div>
              <p className="font-medium">How long should the cached result live?</p>
              <p className="text-gray-500 mt-0.5">
                <strong>Until a mutation happens</strong> → use <code className="font-mono bg-gray-100 rounded px-1">cacheTag()</code> + <code className="font-mono bg-gray-100 rounded px-1">revalidateTag()</code> from a Server Action.<br />
                <strong>For a fixed time window</strong> → use <code className="font-mono bg-gray-100 rounded px-1">cacheLife(&apos;hours&apos;)</code> (or the right profile).<br />
                <strong>Both (belt-and-suspenders)</strong> → apply <strong>both</strong> — tag for push-invalidation, life for TTL fallback.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* File vs function vs component quick table */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">
          File vs Function vs Component — quick table
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {["Level", "Directive location", "Unit cached", "Use when"].map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr className="bg-white">
                <td className="px-3 py-2 font-medium text-violet-700">File</td>
                <td className="px-3 py-2 font-mono">First line of module</td>
                <td className="px-3 py-2">Return value of every async export</td>
                <td className="px-3 py-2 text-gray-500">All functions in the module are lookup helpers</td>
              </tr>
              <tr className="bg-gray-50/50">
                <td className="px-3 py-2 font-medium text-blue-700">Function</td>
                <td className="px-3 py-2 font-mono">First line inside function</td>
                <td className="px-3 py-2">Return value of that function</td>
                <td className="px-3 py-2 text-gray-500">Fine-grained control; mixed module</td>
              </tr>
              <tr className="bg-white">
                <td className="px-3 py-2 font-medium text-emerald-700">Component</td>
                <td className="px-3 py-2 font-mono">First line of Server Component</td>
                <td className="px-3 py-2">Serialised RSC payload (rendered output)</td>
                <td className="px-3 py-2 text-gray-500">Cache the rendered tree; no user-specific content</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* The golden rule */}
      <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-800">
        <p className="font-semibold mb-1">The golden rule of Cache Components</p>
        <p>
          Everything is <strong>dynamic by default</strong>. You opt INTO caching with{" "}
          <code className="font-mono bg-indigo-100 rounded px-1">&apos;use cache&apos;</code>.
          You NEVER opt out with <code className="font-mono bg-indigo-100 rounded px-1">export const dynamic</code>{" "}
          — that directive is disallowed in this app (<code className="font-mono bg-indigo-100 rounded px-1">cacheComponents: true</code>).
          Dynamic data that must stay fresh lives inside{" "}
          <code className="font-mono bg-indigo-100 rounded px-1">&lt;Suspense&gt;</code> — never at the page top level.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UI helpers — static shell
// ═══════════════════════════════════════════════════════════════

function RouteLabel() {
  return (
    <div>
      <p className="text-xs font-mono text-indigo-500 mb-1">c08-use-cache</p>
      <h1 className="text-lg font-bold text-gray-900 mb-1">
        Current Caching Model: <code className="font-mono bg-indigo-50 rounded px-1">&apos;use cache&apos;</code>
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        Next.js 16 Cache Components — file-level, function-level, and component-level
        <code className="font-mono bg-gray-100 rounded px-1 mx-1">&apos;use cache&apos;</code>
        side by side. Plus: React{" "}
        <code className="font-mono bg-gray-100 rounded px-1">cache()</code> vs{" "}
        <code className="font-mono bg-gray-100 rounded px-1">&apos;use cache&apos;</code>,
        and what makes a route ○, ◐, or ƒ.
      </p>
    </div>
  );
}

function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 shrink-0">
        {badge}
      </span>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function UncachedSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-pulse space-y-2">
      <div className="h-4 w-28 bg-gray-200 rounded" />
      <div className="h-3 w-full bg-gray-100 rounded" />
      <div className="h-3 w-2/3 bg-gray-100 rounded" />
      <p className="text-xs text-gray-400 font-mono">{label}</p>
    </div>
  );
}
