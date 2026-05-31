// ─── _components/ProductShell.tsx — STATIC SHELL ─────────────────────────
//
// This component renders the product name, price, images, and description.
// All of its data comes from `getProductShellData` which is wrapped in
// 'use cache' — so this entire component is safe to prerender at build time.
//
// PPR model: this is the PRERENDERED part of the ◐ route. It arrives in the
// very first byte of HTML, before any dynamic holes have resolved. There are
// NO uncached reads here. No cookies, no headers, no per-request variance.
//
// If you add an uncached read here (e.g., calling getProductBySlug directly
// without 'use cache'), the build will fail with:
//   "Uncached data was accessed outside of <Suspense>"

import Image from "next/image";
import type { Product } from "@/lib/data";
import { formatPrice } from "../_lib/product";

// ── Star rating helper ────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="text-amber-400 text-lg">★</span>
      ))}
      {hasHalf && <span className="text-amber-300 text-lg">★</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="text-gray-300 text-lg">★</span>
      ))}
      <span className="ml-1 text-sm text-gray-500 font-medium">{rating.toFixed(1)}</span>
    </span>
  );
}

// ── Product Shell ─────────────────────────────────────────────────────────

interface ProductShellProps {
  product: Product;
}

export function ProductShell({ product }: ProductShellProps) {
  const formattedPrice = formatPrice(product.priceCents, product.currency);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* ── Product image ── */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover"
            // priority: this image is in the prerendered shell, so we want
            // the browser to load it with high priority (no lazy loading).
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No image
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="space-y-4">
        {/* Label showing this is the static/prerendered section */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Static shell — prerendered at build time
        </div>

        <h1 className="text-2xl font-bold text-gray-900 leading-tight">
          {product.name}
        </h1>

        <StarRating rating={product.rating} />

        <div className="text-3xl font-bold text-gray-900">
          {formattedPrice}
        </div>

        <p className="text-gray-600 leading-relaxed text-sm">
          {product.description}
        </p>

        {/* Slug display for easy navigation during the challenge */}
        <div className="text-xs text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 inline-block">
          slug: {product.slug}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton shown while the shell is... wait, there is no skeleton for the shell ──
//
// The shell itself IS the prerendered content. It does not need a skeleton.
// The loading.tsx skeleton is shown at route-level while the entire [slug] page
// segment loads during client-side navigation (not during the initial request).
// The individual <Suspense> skeletons below are for the dynamic holes only.

// ── Not-found placeholder ─────────────────────────────────────────────────

export function ProductNotFound({ slug }: { slug: string }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center space-y-3">
      <p className="text-4xl">404</p>
      <h1 className="text-xl font-semibold text-red-900">Product not found</h1>
      <p className="text-red-700 text-sm">
        No product with slug{" "}
        <code className="font-mono bg-red-100 rounded px-1">{slug}</code>{" "}
        exists in the Nextmart catalog.
      </p>
      <p className="text-gray-500 text-xs mt-4">
        Try one of the slugs from{" "}
        <code className="font-mono bg-gray-100 rounded px-1">lib/data/fixtures.ts</code>,
        e.g.{" "}
        <code className="font-mono bg-gray-100 rounded px-1">
          wireless-noise-cancelling-headphones
        </code>
      </p>
    </div>
  );
}
