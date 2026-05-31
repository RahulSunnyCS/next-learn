// ─── [slug]/loading.tsx — ROUTE-LEVEL SUSPENSE ────────────────────────────
//
// WHAT loading.tsx DOES:
//   Next.js App Router wraps every page segment in a Suspense boundary
//   automatically. When you provide a `loading.tsx` file, that component
//   becomes the FALLBACK for that entire route segment's Suspense boundary.
//   It is shown during client-side navigation while the new segment (page)
//   is loading — BEFORE the page component's async work completes.
//
// loading.tsx = ROUTE-LEVEL Suspense:
//   • Wraps the ENTIRE [slug]/page.tsx segment.
//   • Shown briefly during client-side navigation (SPA navigation via
//     next/link) to this route when the page shell isn't cached on the
//     client yet.
//   • Coarse-grained: the whole page is replaced with this skeleton.
//
// Manual <Suspense fallback={<Skeleton/>}> = GRANULAR Suspense:
//   • Wraps only a SPECIFIC async component within the page.
//   • Multiple manual boundaries resolve INDEPENDENTLY and CONCURRENTLY.
//   • The rest of the page (the static shell) remains visible while each
//     hole individually transitions from skeleton → resolved content.
//   • This is the PPR model: the shell is always visible; holes fill in
//     piece by piece.
//
// WHEN TO USE EACH:
//   • loading.tsx: use as a last-resort fallback for the entire route —
//     good for the initial navigation experience before the shell is in
//     the client-side router cache.
//   • Manual <Suspense>: use for fine-grained streaming control inside a
//     page. In PPR pages, you ALWAYS want manual Suspense so the static
//     shell is always visible.
//
// NOTE: On the FIRST REQUEST (not a client-side navigation), PPR means
//   the static shell is already in the HTML. The loading.tsx skeleton is
//   NOT shown for the shell content on first load — only for client-side
//   navigations. This is the key PPR advantage: fast shell on first paint,
//   with granular streaming for the holes.

export default function C03LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-pulse">
      {/* Route label skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-indigo-100" />
        <div className="h-5 w-80 rounded bg-gray-200" />
        <div className="h-3 w-96 rounded bg-gray-100" />
      </div>

      {/* Product shell skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-xl bg-gray-100" />
        <div className="space-y-4">
          <div className="h-4 w-32 rounded-full bg-emerald-100" />
          <div className="h-7 w-full rounded bg-gray-200" />
          <div className="h-4 w-28 rounded bg-amber-100" />
          <div className="h-8 w-24 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-100" />
            <div className="h-3 w-5/6 rounded bg-gray-100" />
            <div className="h-3 w-4/6 rounded bg-gray-100" />
          </div>
        </div>
      </div>

      {/* Dynamic holes skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 rounded-full bg-indigo-50" />
            <div className="h-4 w-36 rounded bg-gray-200" />
          </div>
          <div className="h-12 rounded-lg bg-gray-50" />
        </div>
      ))}

      {/* loading.tsx label — educational annotation */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-1">
        <p className="text-xs font-medium text-blue-700">
          You are seeing loading.tsx (route-level Suspense)
        </p>
        <p className="text-xs text-blue-600">
          This skeleton wraps the entire page segment. It appears during
          client-side navigation. On first load with PPR, only the manual
          Suspense skeletons appear (for the dynamic holes) — the static
          shell is already in the HTML.
        </p>
      </div>
    </div>
  );
}
