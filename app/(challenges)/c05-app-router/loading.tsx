// ─── loading.tsx — STREAMED SKELETON ─────────────────────────────────────
//
// loading.tsx is a special App Router file.  Next.js automatically wraps
// every page in this layout subtree with a <Suspense> boundary when this
// file is present.  It is shown while the page's async server work resolves.
//
// HOW IT DIFFERS FROM <Suspense> IN THE PAGE:
//   - <Suspense> in a page wraps a SPECIFIC component (fine-grained).
//   - loading.tsx wraps the ENTIRE page — it fires on the first navigation
//     to any route in this subtree (before the page's own Suspense boundaries
//     have a chance to run).
//
// This skeleton is generic enough to match any page in the challenge subtree.
// The product listing page also has its own inner skeleton (ProductGridSkeleton)
// which shows after loading.tsx resolves and the page shell has streamed in.

export default function C05Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-indigo-100 rounded" />
        <div className="h-7 w-72 bg-gray-200 rounded" />
        <div className="h-4 w-full max-w-md bg-gray-100 rounded" />
      </div>

      {/* Convention navigator skeleton */}
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="h-5 w-28 bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="h-36 bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
