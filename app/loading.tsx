// ─── app/loading.tsx ──────────────────────────────────────────────────────
//
// App-level loading UI. Next.js renders this automatically as a React
// Suspense fallback for the root layout segment. It appears during:
//   - Client-side route transitions (after the link is clicked, before the
//     new page's data resolves).
//   - The initial shell of any route that uses <Suspense> internally.
//
// This is a Server Component (no "use client") — it is rendered at build
// time as a static skeleton. It must not contain any dynamic reads.
//
// Design decision: the skeleton matches the approximate layout of the
// challenge index (hero block + grid of cards) to prevent CLS. Using a
// generic spinner would cause layout shift once the real content loads.

export default function RootLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden="true">
      {/* Hero placeholder */}
      <div className="space-y-3">
        <div className="h-8 w-56 bg-gray-200 rounded" />
        <div className="h-4 w-80 bg-gray-100 rounded" />
      </div>

      {/* Tier section placeholders — render 3 skeleton tiers */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          {/* Tier heading */}
          <div className="h-3 w-40 bg-gray-100 rounded" />
          {/* Card grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4 h-20"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
