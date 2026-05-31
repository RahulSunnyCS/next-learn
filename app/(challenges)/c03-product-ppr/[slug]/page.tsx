// ─── app/(challenges)/c03-product-ppr/[slug]/page.tsx ────────────────────
//
// C03 — Product Detail: Partial Prerendering (PPR) + Streaming SSR
//
// ═══════════════════════════════════════════════════════════════
//  WHAT THIS PAGE TEACHES
// ═══════════════════════════════════════════════════════════════
//
// 1. STATIC SHELL + DYNAMIC HOLES (PPR)
//    The page renders in two parts:
//      a) Static shell — product name, price, images, description.
//         This is prerendered at BUILD TIME (from a 'use cache' function) and
//         arrives in the very first byte of HTML. Zero per-request latency.
//      b) Dynamic holes — live inventory, recommendations, reviews.
//         These are uncached async components wrapped in <Suspense>. They
//         stream in AFTER the shell, each independently and concurrently.
//
//    Result: the route table shows ◐ (Partial Prerender), not ƒ (Dynamic).
//
// 2. NO `export const dynamic`
//    Under cacheComponents:true, that directive is disallowed. Dynamic is the
//    DEFAULT; you opt INTO caching with 'use cache'. NEVER use
//    `export const dynamic = "force-dynamic"` — the build will reject it.
//
// 3. loading.tsx vs MANUAL <Suspense>
//    [slug]/loading.tsx = route-level Suspense. Next.js shows it for the WHOLE
//    page segment during client-side navigation. It is coarse-grained.
//    Manual <Suspense fallback={<Skeleton/>}> wraps only one component. It is
//    fine-grained. Multiple manual boundaries stream independently — which is
//    what gives PPR its concurrency advantage.
//    Use loading.tsx as the last-resort fallback, manual <Suspense> for control.
//
// 4. ERROR-AFTER-FLUSH GOTCHA
//    Once the shell HTML bytes are flushed to the browser, the HTTP status code
//    is LOCKED at 200. An error thrown inside a <Suspense> boundary after the
//    shell has been sent cannot change the status to 500.
//    The route error.tsx boundary ONLY catches errors thrown during the
//    INITIAL render of the shell (before any byte is sent).
//    To handle errors in dynamic holes gracefully, wrap the async component in
//    a try-catch inside the component itself, or use a client-side error boundary
//    around the specific hole. This page demonstrates both approaches.
//
// ═══════════════════════════════════════════════════════════════

import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductShellData } from "../_lib/product";
import { ProductShell, ProductNotFound } from "../_components/ProductShell";
import { LiveInventory, LiveInventorySkeleton } from "../_components/LiveInventory";
import { Recommendations, RecommendationsSkeleton } from "../_components/Recommendations";
import { Reviews, ReviewsSkeleton } from "../_components/Reviews";

// ── Metadata ───────────────────────────────────────────────────────────────
//
// generateMetadata runs at build time for PPR pages (for the known static
// params) and at request time for unknown params. It uses the CACHED data
// accessor — same 'use cache' function as the shell — so the metadata fetch
// is free (already in cache).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Params must be awaited in Next.js 16 — they are a Promise.
  const { slug } = await params;
  const product = await getProductShellData(slug);

  if (!product) {
    return { title: "Product not found — C03 PPR" };
  }

  return {
    title: `${product.name} — C03 PPR`,
    description: product.description,
  };
}

// ── Page component ─────────────────────────────────────────────────────────

export default async function C03ProductPPRPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Await params before using slug — Next.js 16 async request APIs.
  // This await is safe at page top level because params is STATIC data
  // (the route segment, not a dynamic request header/cookie). The build
  // does NOT classify this as a dynamic read.
  const { slug } = await params;

  // CACHED read — this is the only data access at the page's top level.
  // It goes through 'use cache' + cacheTag + cacheLife so it is safe to
  // call outside a <Suspense>. The resulting data forms the static shell.
  const product = await getProductShellData(slug);

  // ── 404 case ──────────────────────────────────────────────────────────────
  // If the slug doesn't match any product, render a not-found shell.
  // We do NOT call notFound() here because that throws and would prevent
  // the error demo below from rendering — we want the full page to be visible.
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <RouteLabel />
        <ProductNotFound slug={slug} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* ── Challenge label ── */}
      <RouteLabel />

      {/* ════════════════════════════════════════════════════════
          STATIC SHELL — prerendered at build time
          These components use only cached data and render
          in the first byte of the HTTP response.
          ════════════════════════════════════════════════════════ */}
      <section>
        <ProductShell product={product} />
      </section>

      {/* ════════════════════════════════════════════════════════
          DYNAMIC HOLES — stream in after the shell
          Each is wrapped in its own <Suspense> so they resolve
          CONCURRENTLY, not in sequence. The skeleton is shown
          for each hole until its async component resolves.
          ════════════════════════════════════════════════════════ */}

      {/* ── Dynamic hole #1: Live inventory / stock ── */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <DynamicHoleLabel
          number={1}
          title="Live Inventory"
          reason="Stock changes with every order — must be fresh on every request."
        />
        <Suspense fallback={<LiveInventorySkeleton />}>
          {/* UNCACHED read — getProductBySlug called without 'use cache' inside */}
          <LiveInventory slug={slug} />
        </Suspense>
      </section>

      {/* ── Dynamic hole #2: Personalised recommendations ── */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <DynamicHoleLabel
          number={2}
          title="You Might Also Like"
          reason="Personalised per-user in a real app — simulated as uncached here."
        />
        <Suspense fallback={<RecommendationsSkeleton />}>
          {/* UNCACHED read — listProducts called without 'use cache' inside */}
          <Recommendations
            currentSlug={slug}
            categoryId={product.categoryId}
          />
        </Suspense>
      </section>

      {/* ── Dynamic hole #3: Customer reviews ── */}
      <section className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
        <DynamicHoleLabel
          number={3}
          title="Customer Reviews"
          reason="New reviews should appear immediately — uncached to always be fresh."
        />
        <Suspense fallback={<ReviewsSkeleton />}>
          {/* UNCACHED read — listReviews called without 'use cache' inside */}
          <Reviews productId={product.id} />
        </Suspense>
      </section>

      {/* ════════════════════════════════════════════════════════
          ERROR-AFTER-FLUSH DEMO
          This Suspense hole throws an error intentionally.
          Because the shell has ALREADY been flushed by the time
          this hole's async work runs, the error:
            1. Cannot change the HTTP status (it is already 200).
            2. Is NOT caught by error.tsx (that only catches shell errors).
            3. IS caught by the try-catch inside StreamErrorDemo itself,
               which replaces the hole with an error fallback.
          ════════════════════════════════════════════════════════ */}
      <section className="rounded-xl border border-orange-100 bg-orange-50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
            Error Demo
          </span>
          <h2 className="font-semibold text-orange-900 text-sm">
            Error-after-flush gotcha
          </h2>
        </div>
        <p className="text-xs text-orange-700 leading-relaxed">
          The hole below intentionally throws after the shell has been sent.
          Notice: the HTTP status is still <strong>200</strong> (check DevTools
          Network tab). The route <code className="font-mono bg-orange-100 rounded px-1">error.tsx</code>{" "}
          boundary was NOT invoked — the rest of the page renders normally.
          Only the hole itself shows a fallback.
        </p>
        <Suspense fallback={<ErrorDemoSkeleton />}>
          {/* This component has an internal try-catch, not an error boundary */}
          <StreamErrorDemo />
        </Suspense>
      </section>

      {/* ════════════════════════════════════════════════════════
          STRATEGY COMPARISON TABLE
          Static reference — no dynamic data, part of the shell.
          ════════════════════════════════════════════════════════ */}
      <StrategyTable />

      {/* ── Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c03-product-ppr/_meta/defend-it.md
          </code>{" "}
          with your own answers — especially Q3 (the error-after-flush timeline
          diagram) and Q4 (loading.tsx vs manual Suspense). Commit it first,
          then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c03-product-ppr/</code>.
        </p>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ERROR-AFTER-FLUSH DEMO component
// ═══════════════════════════════════════════════════════════════
//
// This is an async Server Component that throws intentionally to demonstrate
// the "error after flush" behaviour. It is NOT a Client Component error
// boundary — it uses a plain try-catch so the error is contained within the
// component itself rather than propagating to error.tsx.
//
// A React error boundary (like error.tsx) only catches errors thrown during
// the synchronous render of the boundary's children. For a Suspense hole that
// resolves AFTER the HTTP shell has been flushed, the error boundary is no
// longer the right tool — you need defensive coding inside the async component
// (try-catch, null checks, etc.).
//
// REAL-WORLD PATTERN: wrap each dynamic hole in a try-catch and return a
// meaningful fallback, rather than letting the hole cause a page-level error.

async function StreamErrorDemo() {
  // Simulate async work (like a fetch) before the error
  await new Promise((resolve) => setTimeout(resolve, 60));

  // This try-catch contains the error inside this component.
  // The error does NOT propagate to the <Suspense> boundary's error fallback
  // (there is none set here) nor to error.tsx (already flushed).
  try {
    // Intentionally throw to demonstrate the after-flush behaviour.
    throw new Error("Simulated error in a streamed Suspense hole (after shell flush)");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      <div className="rounded-lg border border-orange-200 bg-white p-4 space-y-2">
        <p className="text-sm font-medium text-orange-800">
          Component threw after the shell was flushed
        </p>
        <p className="text-xs text-orange-600 font-mono bg-orange-50 rounded p-2">
          {message}
        </p>
        <p className="text-xs text-gray-500">
          The HTTP response is still <strong>200 OK</strong>. Check the Network
          tab — you will not see a 500. The route <code className="font-mono bg-gray-100 rounded px-1">error.tsx</code>{" "}
          was never invoked. This error was caught here inside the component.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          <strong>Key rule:</strong> once a byte of the HTTP response has been
          written, the status code is immutable. Design your dynamic holes to
          handle their own errors — do not rely on the route error boundary.
        </p>
      </div>
    );
  }
}

function ErrorDemoSkeleton() {
  return (
    <div className="h-20 rounded-lg bg-orange-100 animate-pulse" />
  );
}

// ═══════════════════════════════════════════════════════════════
// STRATEGY COMPARISON TABLE — static content, part of the shell
// ═══════════════════════════════════════════════════════════════

function StrategyTable() {
  const rows = [
    {
      strategy: "CSR",
      where: "Browser (JS)",
      when: "After JS bundle downloads",
      cached: "Nothing",
      firstPaint: "Blank / loading spinner",
      dynamic: "Full (client fetches)",
    },
    {
      strategy: "SSR",
      where: "Server",
      when: "Per request",
      cached: "Nothing (by default)",
      firstPaint: "Full page HTML",
      dynamic: "Full (per-request)",
    },
    {
      strategy: "SSG",
      where: "Server",
      when: "Build time",
      cached: "Entire page",
      firstPaint: "Full static HTML",
      dynamic: "No (static snapshot)",
    },
    {
      strategy: "ISR",
      where: "Server",
      when: "Build + revalidation timer",
      cached: "Entire page (TTL-based)",
      firstPaint: "Full (slightly stale)",
      dynamic: "Limited (stale-while-revalidate)",
    },
    {
      strategy: "Streaming SSR",
      where: "Server",
      when: "Per request, chunked",
      cached: "Nothing (by default)",
      firstPaint: "Shell HTML first",
      dynamic: "Full (streams in)",
    },
    {
      strategy: "PPR ◐",
      where: "Server (build + runtime)",
      when: "Shell at build; holes per-request",
      cached: "Shell fully, holes never",
      firstPaint: "Prerendered shell instantly",
      dynamic: "Full (holes stream in)",
    },
  ] as const;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900">
        Name the Strategy — Rendering Model Comparison
      </h2>
      <p className="text-xs text-gray-500">
        Where is the page rendered? When? What gets cached? What does the user
        see first? Use this table to internalise the tradeoffs.
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Strategy", "Rendered where", "Rendered when", "What's cached", "First paint", "Dynamic data"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, i) => (
              <tr
                key={row.strategy}
                className={row.strategy === "PPR ◐" ? "bg-indigo-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
              >
                <td className={`px-3 py-2 font-medium whitespace-nowrap ${row.strategy === "PPR ◐" ? "text-indigo-700" : "text-gray-900"}`}>
                  {row.strategy}
                </td>
                <td className="px-3 py-2 text-gray-600">{row.where}</td>
                <td className="px-3 py-2 text-gray-600">{row.when}</td>
                <td className="px-3 py-2 text-gray-600">{row.cached}</td>
                <td className="px-3 py-2 text-gray-600">{row.firstPaint}</td>
                <td className="px-3 py-2 text-gray-600">{row.dynamic}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// UI helpers — part of the static shell
// ═══════════════════════════════════════════════════════════════

function RouteLabel() {
  return (
    <div>
      <p className="text-xs font-mono text-indigo-500 mb-1">c03-product-ppr / [slug]</p>
      <h1 className="text-lg font-bold text-gray-900 mb-1">
        Partial Prerendering (PPR) + Streaming SSR
      </h1>
      <p className="text-sm text-gray-500 leading-relaxed">
        The static shell (product name, price, image) arrives in the first byte.
        The three dynamic holes stream in independently. Open DevTools → Network
        to watch the response chunks arrive.
      </p>
    </div>
  );
}

function DynamicHoleLabel({
  number,
  title,
  reason,
}: {
  number: number;
  title: string;
  reason: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 shrink-0">
        Hole {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{reason}</p>
      </div>
    </div>
  );
}
