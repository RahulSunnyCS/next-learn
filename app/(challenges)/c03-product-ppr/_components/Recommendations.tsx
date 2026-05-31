// ─── _components/Recommendations.tsx — DYNAMIC HOLE #2 ───────────────────
//
// Personalised product recommendations. In a real app this would call a
// recommendation engine with the current user's browsing/purchase history.
// Here we simulate per-request variance by fetching uncached sibling products
// and picking 3 that are not the current product.
//
// WHY UNCACHED?
//   Two reasons:
//   1. Personalisation: recommendations change per user (even with the same
//      product slug). Caching by slug alone would return the same list to every
//      visitor. We'd need a per-user cache key — non-trivial and out of scope.
//   2. Teaching goal: the simulated latency makes this hole visibly stream in
//      independently of the other dynamic holes, demonstrating that <Suspense>
//      boundaries resolve concurrently, not in sequence.
//
// PPR CONTRACT: rendered inside <Suspense> in the parent page — this is an
// uncached async component that MUST NOT be called at page top level.

import Link from "next/link";
import Image from "next/image";
import { listProducts, tags } from "@/lib/data";
import { formatPrice } from "../_lib/product";

interface RecommendationsProps {
  currentSlug: string;
  categoryId: string;
}

export async function Recommendations({ currentSlug, categoryId }: RecommendationsProps) {
  // UNCACHED read — listProducts runs fresh on every request.
  // We pass categoryId to fetch sibling products (same category), then
  // exclude the current product and take the first 3.
  const { items } = await listProducts({ categoryId, pageSize: 12 });
  const recs = items.filter((p) => p.slug !== currentSlug).slice(0, 3);

  if (recs.length === 0) {
    return (
      <p className="text-sm text-gray-500">No recommendations available.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {recs.map((product) => (
          <Link
            key={product.id}
            href={`/c03-product-ppr/${product.slug}`}
            className="group rounded-lg border border-gray-100 bg-white p-3 hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <div className="relative aspect-square rounded-md overflow-hidden bg-gray-50 mb-2">
              {product.images[0] && (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              )}
            </div>
            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">
              {product.name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPrice(product.priceCents, product.currency)}
            </p>
          </Link>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Fetched fresh per request — no cache, streams in independently.
        Tag used for invalidation: <code className="font-mono bg-gray-100 rounded px-1">{tags.products}</code>
      </p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

export function RecommendationsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-gray-100 bg-white p-3 space-y-2">
          <div className="aspect-square rounded-md bg-gray-100 animate-pulse" />
          <div className="h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
          <div className="h-3 w-2/5 rounded bg-gray-50 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
