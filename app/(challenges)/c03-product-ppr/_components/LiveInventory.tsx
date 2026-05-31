// ─── _components/LiveInventory.tsx — DYNAMIC HOLE #1 ─────────────────────
//
// This component reads the current stock count UNCACHED — it runs on every
// request so visitors always see up-to-date inventory status.
//
// WHY NOT CACHED?
//   Stock changes every time an order is placed. If we cached this for even
//   a few minutes, a user could see "42 in stock" when the actual count is 0.
//   This is the prototypical dynamic-data use case: correctness beats speed.
//
// PPR CONTRACT: This component MUST be rendered inside a <Suspense> boundary
// in the parent page. Calling getProductBySlug (an uncached read) outside of
// <Suspense> would fail the build under cacheComponents:true.
//
// The simulated latency in repository.ts (30–120ms) makes the streaming
// behaviour visible: the static shell arrives first, then this hole fills in
// independently of the other two holes.

import { getProductBySlug } from "@/lib/data";

// ── Stock status badge ────────────────────────────────────────────────────

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700 ring-1 ring-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block mr-2" />
        Out of stock
      </span>
    );
  }
  if (stock <= 5) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-2 animate-pulse" />
        Only {stock} left in stock — order soon
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-green-200">
      <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2" />
      {stock} in stock — ready to ship
    </span>
  );
}

// ── LiveInventory component ───────────────────────────────────────────────

interface LiveInventoryProps {
  slug: string;
}

export async function LiveInventory({ slug }: LiveInventoryProps) {
  // UNCACHED read — runs on every request to return a fresh stock count.
  // No 'use cache' here. This is what makes this a "dynamic hole" in the PPR model.
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <p className="text-sm text-gray-500">Product data unavailable.</p>
    );
  }

  return (
    <div className="space-y-2">
      <StockBadge stock={product.stock} />
      <p className="text-xs text-gray-400">
        Stock checked live on every request — never cached.
      </p>
    </div>
  );
}

// ── Skeleton shown in <Suspense fallback> ─────────────────────────────────

export function LiveInventorySkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-7 w-48 rounded-full bg-gray-100 animate-pulse" />
      <div className="h-3 w-36 rounded bg-gray-50 animate-pulse" />
    </div>
  );
}
