"use client";
// ─── LazyChart.tsx ────────────────────────────────────────────────────────
//
// Client-component wrapper that owns the `next/dynamic` call with `ssr:false`.
//
// WHY THIS FILE EXISTS:
//   In Next.js 16 (cacheComponents: true), `next/dynamic` with `ssr: false`
//   is only allowed inside Client Components — not Server Components.  The
//   parent page (page.tsx) is a Server Component, so the dynamic() call was
//   moved here.  This wrapper is a "use client" boundary; it re-exports the
//   dynamically-imported HeavyAnalyticsChart so page.tsx can render it as a
//   plain React element without knowing about the code-splitting internals.
//
//   The teaching lesson is preserved: when a developer looks at the code, they
//   see the dynamic() call with ssr:false and the loading skeleton here, which
//   is exactly what they need to understand per-route code splitting.  The only
//   change from the original is that the split point lives in a Client Component
//   rather than at the Server Component module level.

import dynamic from "next/dynamic";

// The actual dynamic import — split into a separate JS chunk at build time.
// ssr: false because HeavyAnalyticsChart uses useState (client-only state).
// loading: shown while the chunk is being fetched from the server.
const HeavyAnalyticsChart = dynamic(
  () => import("./HeavyAnalyticsChart"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-pulse h-40 flex items-center justify-center text-sm text-gray-400">
        Loading chart chunk…
      </div>
    ),
  }
);

// Re-export as LazyChart so page.tsx imports one clear symbol.
export function LazyChart() {
  return <HeavyAnalyticsChart />;
}
