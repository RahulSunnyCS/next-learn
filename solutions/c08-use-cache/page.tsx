// ─── solutions/c08-use-cache/page.tsx — Reference solution overview ──────
//
// This file summarises the reference solution decisions. The actual page
// implementation lives in app/(challenges)/c08-use-cache/page.tsx — the
// challenge page IS the reference solution for this educational challenge
// (the goal is to understand caching by reading and running the code, not
// by starting from a broken skeleton).
//
// ─── WHAT THE SOLUTION DEMONSTRATES ─────────────────────────────────────
//
// 1. FILE-LEVEL 'use cache' (solutions/c08-use-cache/_lib/cached.ts)
//    'use cache' as the first line of a .ts module. Every async export is
//    cached. cacheTag() and cacheLife() still need to be called inside each
//    function to annotate the specific cache entry.
//
// 2. FUNCTION-LEVEL 'use cache' (_lib/cached.ts → getCachedProductSummary)
//    'use cache' inside one function body. The inner directive is explicit even
//    when the file-level one would cover it — to demonstrate the syntax clearly.
//    The cache key is the function's argument (productId). Different arguments
//    produce separate entries.
//
// 3. COMPONENT-LEVEL 'use cache' (_components/CachedPanel.tsx → CachedPanel)
//    'use cache' as the first line of an async Server Component. Next.js caches
//    the serialised RSC PAYLOAD (the rendered output), not just raw data. The
//    component does not re-render on cache-hit requests.
//
// 4. REACT cache() (page.tsx → deduplicatedGetProduct)
//    React.cache() wraps a function for per-request memoisation only. Two
//    components in the same render that call the wrapped function with the same
//    argument share one result — the function body runs once. At request end the
//    memo is discarded. No subsequent request benefits.
//
//    Contrast: 'use cache' is durable (persists across requests). React cache()
//    is ephemeral (lives only for the current render pass).
//
// 5. UNCACHED COMPONENT IN Suspense (page.tsx → UncachedDataPanel)
//    A component that calls @/lib/data directly with no 'use cache'. Because
//    lib/data uses Math.random() for latency, it is non-deterministic and MUST
//    live inside <Suspense>. Without Suspense, the build would fail with:
//    "Uncached data was accessed outside of <Suspense>".
//    This component is what makes the route show ◐ (Partial Prerender) rather
//    than ○ (Static) in the build output.
//
// ─── KEY DECISIONS ───────────────────────────────────────────────────────
//
// WHY file-level for _lib/cached.ts?
//   The module is a pure "cached data layer" — every function is a read-only
//   lookup that benefits from caching. File-level expresses that intent clearly.
//   If any function were a mutation or needed to be uncached, we would switch to
//   function-level only.
//
// WHY add the inner 'use cache' on getCachedProductSummary()?
//   Pedagogy: to explicitly show what function-level syntax looks like. In a
//   real codebase you would not add a redundant inner directive — the file-level
//   one is sufficient. But for a teaching challenge, explicit is better.
//
// WHY is CachedPanel wrapped in <Suspense>?
//   On the FIRST request (cache miss) the component must fetch data, which
//   involves the lib/data Math.random() latency. Suspense lets the static shell
//   stream immediately while the first-hit data load completes. On cache-HIT
//   requests the component resolves nearly instantly (RSC payload served from
//   cache), but wrapping in Suspense is the right discipline regardless.
//
// WHY React.cache() and not 'use cache' for the dedup demo?
//   To show the distinction explicitly. If we used 'use cache' for both callers
//   they would go through the SAME cache store — the difference in lifetime would
//   not be observable in this page. React.cache() gives a clear "this memo is
//   per-request only" signal that is easier to reason about in a teaching context.
//
// ─── WHAT IS NOT IMPLEMENTED HERE ────────────────────────────────────────
//
// - revalidateTag() Server Action: invalidation is explained but not wired up,
//   because the challenge is about understanding caching, not building a full
//   mutation flow. See C03 (PPR) for the revalidation pattern.
// - Custom cacheLife profile: next.config.ts is read-only in this repo. The
//   spec.md shows the syntax for custom profiles; see docs/cache-components-rules.md.
// - generateStaticParams: not relevant here — the route has no dynamic segments.

export {};
