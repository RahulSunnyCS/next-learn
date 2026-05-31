// ─── app/(challenges)/c19-two-sources-of-truth/page.tsx ───────────────────────
//
// C19 — Two Sources of Truth + Cross-Tab Sync
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true) — same shape as
// the canonical c01-auth/page.tsx:
//   - The page is a STATIC SHELL. Dynamic reads happen inside <Suspense> holes.
//   - NO `export const dynamic` directive — incompatible with cacheComponents.
//   - Opt INTO caching with 'use cache'; dynamic is the default.
//
// ARCHITECTURE:
//   This page teaches the "two sources of truth" problem by showing two panels:
//
//   Left panel  — TanStack Query (client-side cache, in the browser, React state)
//   Right panel — RSC server render (server-side 'use cache' boundary, HTML from Node.js)
//
//   A mutation (Server Action) updates the data store and calls revalidateTag()
//   on the server side, but the TanStack client cache is NOT automatically told
//   about the change. This makes the divergence visible.
//
//   The CachedServerPanel component is wrapped in <Suspense> and uses 'use cache'
//   to demonstrate the server-side cache. The ReconciledList (client component)
//   sits beside it via LocalQueryProvider and demonstrates the client-side cache,
//   the reconciliation strategy, and BroadcastChannel cross-tab sync.

import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheTag, cacheLife } from "next/cache";
import { connection } from "next/server";
import LocalQueryProvider from "./_components/QueryProvider";
import ReconciledList from "./_components/ReconciledList";
import { getSavedItems } from "./_lib/actions";
// savedItemsTag lives in a separate non-"use server" module — see _lib/tags.ts
import { savedItemsTag } from "./_lib/tags";

export const metadata: Metadata = {
  title: "C19 — Two Sources of Truth + Cross-Tab Sync",
};

// ─── Page (static shell) ──────────────────────────────────────────────────────

export default function C19Page() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">

      {/* ── Header (static) ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-rose-500 mb-1">
          c19-two-sources-of-truth
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Two Sources of Truth + Cross-Tab Sync
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          The staff-level cache problem: the same data lives in a TanStack Query
          client cache AND a Next.js{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          server cache. After a mutation, they diverge. This challenge shows you
          how to make that divergence visible, understand why it happens, and
          implement the reconciliation strategies to fix it — including live
          cross-tab sync.
        </p>
      </div>

      {/* ── Mental model (static explainer) ────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">
          The Two-Cache Problem
        </h2>
        <div className="text-xs text-gray-700 space-y-2">
          <p>
            In a Next.js App Router app you often have the <em>same data</em> in
            two places simultaneously:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Server-side:</strong> a{" "}
              <code className="font-mono bg-gray-100 rounded px-1">
                &apos;use cache&apos;
              </code>{" "}
              boundary caches the RSC output (rendered HTML / React payload) on
              the server. It is invalidated by{" "}
              <code className="font-mono bg-gray-100 rounded px-1">
                revalidateTag()
              </code>
              .
            </li>
            <li>
              <strong>Client-side:</strong> a TanStack Query{" "}
              <code className="font-mono bg-gray-100 rounded px-1">
                useQuery
              </code>{" "}
              hook caches the data in browser memory, keyed by{" "}
              <code className="font-mono bg-gray-100 rounded px-1">
                queryKey
              </code>
              . It is invalidated by{" "}
              <code className="font-mono bg-gray-100 rounded px-1">
                invalidateQueries()
              </code>
              .
            </li>
          </ul>
          <p>
            These two systems are <strong>completely independent</strong>. A
            Server Action that calls{" "}
            <code className="font-mono bg-gray-100 rounded px-1">
              revalidateTag()
            </code>{" "}
            does NOT tell TanStack Query to refetch. A TanStack mutation that
            calls{" "}
            <code className="font-mono bg-gray-100 rounded px-1">
              invalidateQueries()
            </code>{" "}
            does NOT re-render the Server Component. The moment you mutate data
            through a Server Action, they can diverge.
          </p>
        </div>
      </section>

      {/* ── Live Demo: divergence + reconciliation ─────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-1">
            Live Demo — Watch the Caches Diverge and Reconcile
          </h2>
          <p className="text-xs text-gray-500">
            Both panels show the same &quot;saved items&quot; list. Save or remove an
            item and watch the panels diverge. Then click &quot;Reconcile&quot; to converge
            them.
          </p>
        </div>

        {/*
          LocalQueryProvider wraps the client components in a QueryClientProvider.
          It is local to this challenge — no other challenge uses this provider.
          The Suspense below is the DYNAMIC HOLE for the server-cached data.
          Reading from the data store is non-deterministic (uses delay() internally),
          so it must live inside Suspense under cacheComponents: true.
        */}
        <LocalQueryProvider>
          <Suspense fallback={<DivergenceDemoSkeleton />}>
            <DivergenceDemo />
          </Suspense>
        </LocalQueryProvider>
      </section>

      {/* ── Cross-tab sync explanation (static) ────────────────────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-indigo-900">
          Cross-Tab Sync via BroadcastChannel
        </h2>
        <div className="text-xs text-indigo-800 space-y-2">
          <p>
            Open this page in <strong>two browser tabs</strong>. Save an item in
            Tab 1. Within ~100ms, Tab 2&apos;s TanStack panel updates automatically —
            no manual reload required.
          </p>
          <p>
            This works via{" "}
            <code className="font-mono bg-indigo-100 rounded px-1">
              BroadcastChannel
            </code>
            , a browser API that lets scripts on the same origin post structured
            messages to all other tabs. The hook (
            <code className="font-mono bg-indigo-100 rounded px-1">
              useCrossTabSync
            </code>{" "}
            in{" "}
            <code className="font-mono bg-indigo-100 rounded px-1">
              _lib/sync.ts
            </code>
            ) subscribes to the channel on mount, calls{" "}
            <code className="font-mono bg-indigo-100 rounded px-1">
              invalidateQueries()
            </code>{" "}
            when a message arrives, and broadcasts after mutations. A{" "}
            <code className="font-mono bg-indigo-100 rounded px-1">
              localStorage
            </code>{" "}
            storage-event fallback handles Safari Private Browsing where
            BroadcastChannel messages may not cross tab boundaries.
          </p>
          <p className="text-xs text-indigo-600">
            Note: Cross-tab sync only works within the same browser profile and
            origin. A second device or incognito window is invisible to it.
          </p>
        </div>
      </section>

      {/* ── Strategy comparison (static) ────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">
          Reconciliation Strategies
        </h2>
        <div className="text-xs text-gray-700 space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
            <p className="font-semibold text-green-800">
              Strategy 1 (used here): Full-Stack Reconcile
            </p>
            <p>
              Server Action calls{" "}
              <code className="font-mono bg-green-100 rounded px-1">
                revalidateTag()
              </code>
              . Client calls{" "}
              <code className="font-mono bg-green-100 rounded px-1">
                invalidateQueries()
              </code>{" "}
              +{" "}
              <code className="font-mono bg-green-100 rounded px-1">
                router.refresh()
              </code>
              . Both caches converge in one user action.
            </p>
            <p className="text-green-700 italic">
              Tradeoff: two round trips (API refetch + RSC refresh). Best when
              you need BOTH the client component AND the Server Component to stay
              in sync.
            </p>
          </div>

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-1">
            <p className="font-semibold text-purple-800">
              Strategy 2: Server as Single Source
            </p>
            <p>
              Abandon TanStack Query for this data. Use only Server Components +{" "}
              <code className="font-mono bg-purple-100 rounded px-1">
                revalidateTag()
              </code>
              . No client cache means no divergence.
            </p>
            <p className="text-purple-700 italic">
              Tradeoff: no optimistic UI, no client-side interactivity (search,
              filter), and cross-tab sync requires SSE or polling.
            </p>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
            <p className="font-semibold text-blue-800">
              Strategy 3: Client as Single Source
            </p>
            <p>
              All reads go through TanStack Query (API route). Never put this
              data in{" "}
              <code className="font-mono bg-blue-100 rounded px-1">
                &apos;use cache&apos;
              </code>
              . Mutations go through API routes or Server Actions that do NOT
              call{" "}
              <code className="font-mono bg-blue-100 rounded px-1">
                revalidateTag()
              </code>
              . No second cache means no divergence.
            </p>
            <p className="text-blue-700 italic">
              Tradeoff: data is not in the RSC tree, so you lose SSR
              prerendering of this content. Best for highly interactive UI state
              (shopping carts, filters, drag-to-reorder).
            </p>
          </div>
        </div>
      </section>

      {/* ── Defend-It reminder (static) ─────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">
          Before reading the reference solution:
        </p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c19-two-sources-of-truth/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c19-two-sources-of-truth/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─── Dynamic hole: server-rendered cached items ───────────────────────────────
//
// This async Server Component reads from the 'use cache' boundary.
// Wrapped in <Suspense> above so the static shell prerenders immediately.
//
// WHY 'use cache' here:
//   We want to demonstrate that the server HAS a cached version of the list
//   that survives across requests. Without 'use cache', every RSC render would
//   re-read from the data store, and we could not show the "stale server cache"
//   scenario — the server would always be fresh.
//
// WHY await connection():
//   Under cacheComponents: true, any non-deterministic call (like getSavedItems
//   which uses delay() internally) must be inside a Suspense hole. connection()
//   establishes the dynamic-render boundary so synchronous non-deterministic
//   code after it does not run during prerender (see cache-components-rules.md §7).
async function DivergenceDemo() {
  // Opt into dynamic rendering — required before any non-deterministic call.
  await connection();

  // Read from the server-side cached accessor.
  const serverItems = await getCachedSavedItems("demo-user");
  const cachedAt = new Date().toISOString();

  return (
    <ReconciledList
      initialServerItems={serverItems}
      serverCachedAt={cachedAt}
    />
  );
}

/**
 * Server-side cached accessor for saved items.
 *
 * The 'use cache' directive here means Next.js will:
 *   1. Cache the return value keyed by (function identity + arguments).
 *   2. Tag the entry with savedItemsTag(userId) so revalidateTag() can target it.
 *   3. Expire the entry after "seconds" (very short TTL to keep the demo fresh
 *      across restarts, while still demonstrating the stale-cache lag).
 *
 * After a Server Action calls revalidateTag(savedItemsTag(userId)), this entry
 * is marked stale. On the NEXT request to render this component, it re-executes.
 * But the current page view still shows the OLD HTML until router.refresh() fires.
 * That is the divergence made visible.
 */
async function getCachedSavedItems(userId: string): Promise<string[]> {
  "use cache";
  cacheTag(savedItemsTag(userId));
  // Very short TTL: ensures the cache doesn't persist stale data for long,
  // while still being long enough to demonstrate the divergence during the demo.
  cacheLife("seconds");
  return getSavedItems(userId);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DivergenceDemoSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-24 rounded-xl bg-gray-100 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 rounded-xl bg-blue-50 animate-pulse" />
        <div className="h-40 rounded-xl bg-purple-50 animate-pulse" />
      </div>
    </div>
  );
}
