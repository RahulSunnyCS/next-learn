// ─── _lib/preload.ts — Preload pattern for C07 ───────────────────────────────
//
// THE PRELOAD PATTERN:
//   In a React Server Component tree, the parent can kick off a data fetch
//   BEFORE rendering the child component that will consume the result. By the
//   time the child component renders and awaits the data, it is already resolved
//   (or nearly so). This eliminates the latency that would otherwise occur if
//   the child triggered the fetch itself mid-render.
//
//   This only works because React cache() gives us a stable memoised promise:
//   calling preloadProduct(slug) in the parent stores the in-flight promise in
//   the React request-scoped cache; the child later calls getProductBySlugMemo(slug)
//   and receives the same promise (already resolved or nearly resolved).
//
//   WITHOUT the preload pattern:
//     Parent renders → child mounts → child calls getProductBySlug(slug) → wait 30–120ms.
//
//   WITH the preload pattern:
//     Parent calls preloadProduct(slug) → (fetch starts)
//     → parent renders child → child calls getProductBySlugMemo(slug) → already done.
//
//   The savings compound in deeper trees (the fetch is kicked off higher up and
//   the child does not add its own latency on top of the parent's render time).
//
// RELATIONSHIP TO 'use cache':
//   The preload pattern uses React cache() (per-request), NOT 'use cache'
//   (cross-request). It is a request-scoped micro-optimisation. In a real app
//   you would combine both: the 'use cache' function returns a cached value
//   instantly across requests; within a single request, React cache() deduplicates
//   multiple reads of that already-fast cached call. For fresh/uncached reads
//   (like the dynamic holes in this challenge), preload is the primary tool.

import { getProductBySlugMemo, listCategoriesMemo } from "./queries";

// ---------------------------------------------------------------------------
// Preload helpers
// ---------------------------------------------------------------------------

/**
 * preloadProduct — kick off a product fetch early without awaiting it.
 *
 * Call this at the top of a parent Server Component (before any conditional
 * logic or child rendering). The memoised promise is stored in the React
 * request cache. When the consuming child later calls getProductBySlugMemo(),
 * it receives the same promise — which may already be settled.
 *
 * IMPORTANT: This function must NOT be awaited by the caller — the whole
 * point is to start the fetch non-blocking and let it resolve in parallel
 * with any other synchronous work the parent does.
 */
export function preloadProduct(slug: string): void {
  // Void the promise intentionally — we are not consuming the value here.
  // ESLint/TypeScript might warn about floating promises; the void keyword
  // signals "I know this is a promise and I am intentionally not awaiting it."
  void getProductBySlugMemo(slug);
}

/**
 * preloadCategories — kick off a category list fetch early.
 * Same pattern as preloadProduct but for the full category list.
 */
export function preloadCategories(): void {
  void listCategoriesMemo();
}
