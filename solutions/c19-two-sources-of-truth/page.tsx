// ─── solutions/c19-two-sources-of-truth/page.tsx ─────────────────────────────
//
// Reference solution for C19 — Two Sources of Truth + Cross-Tab Sync.
//
// This file is intentionally a readable summary of what the learner should
// have built, with explanatory annotations on each key decision point.
//
// KEY DECISIONS:
//
// 1. LOCAL QueryClientProvider (not shared with other challenges)
//    Each challenge is self-contained. A shared provider would couple the cache
//    lifetimes of unrelated challenges. The local provider wraps only the
//    components that need TanStack Query.
//
// 2. 'use cache' with a SHORT cacheLife("seconds")
//    In production, use "minutes" or "hours". We use "seconds" here so the
//    challenge demo does not get stuck with a stale server cache between test
//    runs. The tradeoff is documented explicitly.
//
// 3. DUAL INVALIDATION in handleReconcile():
//    invalidateQueries() + router.refresh() must run together. Either alone
//    leaves one panel stale. startTransition batches them for a single render.
//
// 4. BroadcastChannel + localStorage fallback in useCrossTabSync
//    See solutions/c19-two-sources-of-truth/_lib/sync.ts for detailed notes.
//
// 5. API route for TQ reads (not direct Server Action import)
//    Server Actions are POST-only. TanStack Query needs a GET endpoint.
//    The route handler at api/saved-items/route.ts serves this role.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// WHAT THE LEARNER SHOULD UNDERSTAND AFTER THIS CHALLENGE:
//
//   Q: "Why did my RSC panel not update after I called invalidateQueries?"
//   A: invalidateQueries updates the TanStack client cache. It does NOT trigger
//      a new RSC render. You need router.refresh() for that.
//
//   Q: "Why did my TanStack panel not update after I called revalidateTag()?"
//   A: revalidateTag marks the server cache stale. It does NOT tell the client
//      to refetch. You need invalidateQueries() for that.
//
//   Q: "My cart count in Tab B is wrong after checking out in Tab A."
//   A: Classic cross-tab sync failure. BroadcastChannel + invalidateQueries
//      fixes the TQ panel in Tab B. If Tab B shows an RSC component with the
//      cart count, you also need router.refresh() in Tab B — or move the cart
//      count to a TQ-only client component so it only needs invalidateQueries.
//
// ─────────────────────────────────────────────────────────────────────────────
//
// The full working implementation lives in:
//   app/(challenges)/c19-two-sources-of-truth/
//
// This file is a REFERENCE annotated copy — not a separate working route.
// The actual route serving /c19-two-sources-of-truth is the challenge page.

export default function C19SolutionReference() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">
        C19 — Reference Solution Notes
      </h1>
      <p className="text-sm text-gray-600">
        This directory contains the reference solution notes and the
        cache-flow diagram. The working implementation is in{" "}
        <code className="font-mono text-xs bg-gray-100 rounded px-1">
          app/(challenges)/c19-two-sources-of-truth/
        </code>
        .
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Files</h2>
        <ul className="text-xs text-gray-600 space-y-1 font-mono">
          <li>NOTES.md — reconciliation strategy rationale + design decisions</li>
          <li>cache-flow.md — ASCII cache-flow diagram (two caches, divergence, reconciliation)</li>
          <li>_lib/sync.ts — reference useCrossTabSync with annotated decision notes</li>
          <li>page.tsx — this annotated reference summary</li>
        </ul>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        <p className="font-semibold mb-1">Remember the dual-invalidation rule:</p>
        <p>
          If data lives in BOTH a{" "}
          <code className="font-mono bg-amber-100 rounded px-1">
            &apos;use cache&apos;
          </code>{" "}
          server boundary AND a TanStack Query client cache, every mutation must
          touch BOTH:{" "}
          <code className="font-mono bg-amber-100 rounded px-1">
            revalidateTag()
          </code>{" "}
          on the server side AND{" "}
          <code className="font-mono bg-amber-100 rounded px-1">
            invalidateQueries()
          </code>{" "}
          +{" "}
          <code className="font-mono bg-amber-100 rounded px-1">
            router.refresh()
          </code>{" "}
          on the client side.
        </p>
      </section>
    </div>
  );
}
