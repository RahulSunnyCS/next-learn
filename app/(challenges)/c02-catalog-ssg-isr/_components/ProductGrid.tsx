// ─── _components/ProductGrid.tsx ──────────────────────────────────────────
//
// Async Server Component — reads product data and renders product cards.
//
// CACHE COMPONENTS PATTERN:
//   This component is rendered INSIDE a <Suspense> boundary on the parent
//   page.  It calls listCachedProducts() which (once the challenge is solved)
//   is wrapped in 'use cache'.  Under cacheComponents, calling an uncached
//   data function outside Suspense would fail the build — wrapping in Suspense
//   is what allows dynamic/async data to coexist with a static shell.
//
// PRODUCT CARD LINKS:
//   Each card links to /c03-product-ppr/<slug>.  The sibling C03 challenge
//   builds those Product Detail Pages using PPR.  We link by slug; we do NOT
//   create product detail pages in c02.

import Image from "next/image";
import Link from "next/link";
import { listCachedProducts } from "../_lib/catalog";
import type { Product } from "@/lib/data";

interface ProductGridProps {
  /** Filter to a specific category (by categoryId, not slug). */
  categoryId?: string;
}

// The outer component is the async Server Component that fetches data.
export async function ProductGrid({ categoryId }: ProductGridProps) {
  const result = await listCachedProducts({
    categoryId,
    sort: "newest",
    pageSize: 24,
  });

  if (result.items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm mt-1">
          Try selecting a different category or check back later.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Product count summary */}
      <p className="text-sm text-gray-500 mb-4">
        Showing {result.items.length} of {result.totalCount} products
      </p>

      {/* Product grid — responsive: 1 col mobile, 2 col sm, 3 col lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {result.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductCard — pure presentational component (no data fetching)
// ---------------------------------------------------------------------------

function ProductCard({ product }: { product: Product }) {
  const priceFormatted = (product.priceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: product.currency,
  });

  const isOutOfStock = product.stock === 0;

  return (
    // Link to the C03 Product Detail Page (PPR challenge).
    // c02 does NOT implement product detail pages — that is c03's responsibility.
    <Link
      href={`/c03-product-ppr/${product.slug}`}
      className="group block rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Product image */}
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Product info */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-base font-semibold text-gray-900">
            {priceFormatted}
          </span>

          {/* Star rating */}
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span className="text-amber-400">★</span>
            {product.rating.toFixed(1)}
          </span>
        </div>

        {/* Stock indicator */}
        {!isOutOfStock && product.stock <= 10 && (
          <p className="mt-1 text-xs text-orange-600 font-medium">
            Only {product.stock} left
          </p>
        )}
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// ProductGridSkeleton — shown while the async ProductGrid streams in
// ---------------------------------------------------------------------------

export function ProductGridSkeleton() {
  // Render 6 placeholder cards that match the ProductCard layout.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
        >
          {/* Image placeholder */}
          <div className="aspect-square bg-gray-100 animate-pulse" />
          {/* Text placeholders */}
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
