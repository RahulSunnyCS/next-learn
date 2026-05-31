// ─── products/[id]/page.tsx — FULL PRODUCT DETAIL PAGE ───────────────────
//
// DYNAMIC SEGMENT [id]: Next.js automatically creates a route for every
// value of [id].  The params object carries { id: string }.
//
// In v16, params is a Promise — always await it before use.
//
// THIS PAGE vs. THE MODAL:
//   - Soft navigation from the listing → intercepting route fires →
//     @modal/(.)products/[id]/page.tsx renders as a modal.  This file is
//     NOT rendered in that case.
//   - Hard-refresh / direct URL → intercepting route does NOT fire →
//     THIS file renders as the full standalone product page.
//   - The <Suspense> + notFound() pattern in ProductDetail below is the
//     canonical way to handle missing resources under cacheComponents.
//
// CACHE COMPLIANCE:
//   getCatalogProductById is cached in _lib/catalog.ts — not a raw uncached
//   dynamic read.  The <Suspense> here is for streaming UX (skeleton while
//   cache warms on first request), not a strict cacheComponents requirement
//   for this call.  However, keeping dynamic-ish work inside Suspense is
//   the recommended PPR pattern regardless.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCatalogProductById } from "../../_lib/catalog";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

// generateMetadata uses the same cached helper — no extra fetch cost.
export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProductById(id);
  if (!product) return { title: "Product not found" };
  return { title: `${product.name} — C05 App Router` };
}

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ── Static breadcrumb shell ── */}
      <nav className="text-xs text-gray-400 flex gap-1.5 items-center">
        <Link href="/challenges/c05-app-router" className="hover:text-indigo-500">
          c05-app-router
        </Link>
        <span>/</span>
        <span>products</span>
        <span>/</span>
        <span className="text-gray-600">[id]</span>
      </nav>

      {/* ── DYNAMIC HOLE: product detail ── */}
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────
async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCatalogProductById(id);

  // notFound() renders not-found.tsx from the nearest ancestor.
  // Here that is c05-app-router/not-found.tsx.
  if (!product) notFound();

  const price = (product.priceCents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* ── Full-page indicator (vs. modal) ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono bg-purple-50 text-purple-700 rounded px-2 py-0.5">
          Full Page
        </span>
        <span className="text-xs text-gray-400">
          — rendered by <code className="font-mono">products/[id]/page.tsx</code>
        </span>
      </div>

      {/* Product image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.images[0]}
        alt={product.name}
        width={600}
        height={400}
        className="w-full h-72 object-cover rounded-2xl shadow"
      />

      {/* Product details */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
        <p className="text-3xl font-semibold text-indigo-600">${price}</p>
        <p className="text-sm text-gray-500">
          Rating: {product.rating} / 5 &middot; {product.stock} in stock
        </p>
      </div>

      <p className="text-gray-700 leading-relaxed">{product.description}</p>

      {/* Dynamic segment explanation */}
      <div className="rounded-lg border border-purple-100 bg-purple-50 p-4 text-xs text-purple-800 space-y-1">
        <p className="font-semibold">Dynamic Segment [id] resolved</p>
        <p>params.id = <code className="font-mono bg-purple-100 rounded px-1">{id}</code></p>
        <p className="text-purple-600 mt-1">
          This URL was reached by hard-refresh or direct link — the intercepting
          route only fires on soft navigation from the listing page.
        </p>
      </div>

      {/* Back link */}
      <Link
        href="/challenges/c05-app-router"
        className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
      >
        &larr; Back to listing
      </Link>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-72 bg-gray-100 rounded-2xl" />
      <div className="space-y-2">
        <div className="h-7 w-3/4 bg-gray-100 rounded" />
        <div className="h-8 w-32 bg-gray-100 rounded" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 w-4/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
