// ─── _components/CachedPanel.tsx — C08 'use cache': COMPONENT-LEVEL ─────────
//
// This file demonstrates Level 3: 'use cache' at the COMPONENT level.
//
// What "component-level" means:
//   'use cache' is placed as the first line inside an async Server Component's
//   function body. Next.js caches the RENDERED OUTPUT of the component — not
//   just raw data, but the serialised React Server Component (RSC) payload.
//   Subsequent requests that match the same props receive the cached payload
//   without re-running the function or the underlying data fetches.
//
// When to use component-level vs function-level:
//   • Use function-level ('use cache' on a data fetch) when the same data is
//     consumed by multiple components — cache once, render fresh each time.
//   • Use component-level when the rendered output itself is stable and
//     identical for all users given the same props — essentially caching the
//     HTML fragment + RSC tree. Useful for expensive-to-render, shared widgets.
//
// WARNING on component-level caching:
//   The cached output must NOT contain user-specific content (session data,
//   personalised text, etc.). If it does, one user's output would be served
//   to another user. This component is safe: it renders public product data.
//
// ─── CACHE COMPONENTS RULES ───────────────────────────────────────────────
// • No `export const dynamic` or route-segment config exports.
// • cacheTag / cacheLife called before the first `await`.
// • Tag uses constants from @/lib/data.

import { cacheTag, cacheLife } from "next/cache";
import { getProductById, tags } from "@/lib/data";
import type { Product } from "@/lib/data";

// ---------------------------------------------------------------------------
// Formatting helper
// ---------------------------------------------------------------------------

function formatPrice(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// CachedPanel — a component-level 'use cache' Server Component
// ---------------------------------------------------------------------------

interface CachedPanelProps {
  productId: string;
}

export default async function CachedPanel({ productId }: CachedPanelProps) {
  // COMPONENT-LEVEL 'use cache': the FIRST LINE of the function body.
  // Next.js will cache the serialised RSC output of this entire component,
  // keyed on the `productId` prop. Identical prop values share one cache slot.
  "use cache";

  // Tag and lifetime MUST be called before any await.
  // - tags.product(productId): invalidate when this specific product is updated
  // - cacheLife('hours'): TTL of ~1 hour, belt-and-suspenders against missed
  //   invalidations (e.g. a price change that didn't trigger a Server Action)
  cacheTag(tags.product(productId));
  cacheLife("hours");

  // Data fetch — wrapped in the component-level cache boundary.
  // In a real app this product lookup might involve several joins or expensive
  // computations. Caching the component output means those never re-run for
  // a cache-hit request.
  const product: Product | null = await getProductById(productId);

  if (!product) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4">
        <p className="text-xs text-red-700">
          Product <code className="font-mono bg-red-100 rounded px-1">{productId}</code>{" "}
          not found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      {/* Cache strategy label */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
          Component-level &apos;use cache&apos;
        </span>
        <span className="text-xs text-emerald-700 font-mono">{productId}</span>
      </div>

      {/* Product data — this entire rendered tree is cached */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight">
          {product.name}
        </p>
        <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
        <div className="flex items-center gap-3 pt-1">
          <span className="text-base font-bold text-gray-900">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              product.stock > 0
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </span>
        </div>
      </div>

      {/* What is being cached — explanation box */}
      <div className="rounded-md bg-white border border-emerald-100 p-3 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-700">What is cached here:</p>
        <ul className="space-y-0.5 text-gray-500">
          <li>
            <span className="font-mono bg-gray-50 rounded px-1">key</span>
            {" "}&rarr; prop <code className="font-mono">productId = &quot;{productId}&quot;</code>
          </li>
          <li>
            <span className="font-mono bg-gray-50 rounded px-1">tag</span>
            {" "}&rarr; <code className="font-mono">product:{productId}</code>
          </li>
          <li>
            <span className="font-mono bg-gray-50 rounded px-1">life</span>
            {" "}&rarr; <code className="font-mono">&apos;hours&apos;</code> (~1 hour TTL)
          </li>
          <li>
            <span className="font-mono bg-gray-50 rounded px-1">unit</span>
            {" "}&rarr; serialised RSC payload (entire component output)
          </li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton shown while CachedPanel is loading (for use in <Suspense>)
// ---------------------------------------------------------------------------
// Note: if this component is used INSIDE a <Suspense> boundary, the skeleton
// is displayed until the async component resolves. For a cached component, the
// first request incurs latency; subsequent requests hit the cache and resolve
// nearly instantly — the skeleton may flash only briefly.

export function CachedPanelSkeleton() {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3 animate-pulse">
      <div className="h-5 w-40 bg-emerald-100 rounded" />
      <div className="space-y-1">
        <div className="h-4 w-3/4 bg-emerald-100 rounded" />
        <div className="h-3 w-full bg-emerald-50 rounded" />
        <div className="h-3 w-2/3 bg-emerald-50 rounded" />
      </div>
    </div>
  );
}
