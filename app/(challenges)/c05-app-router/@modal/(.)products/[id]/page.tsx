// ─── @modal/(.)products/[id]/page.tsx — INTERCEPTING ROUTE ───────────────
//
// HOW INTERCEPTING ROUTES WORK:
//
// The (.) prefix means "intercept a route at the SAME level as this slot's
// parent segment."  The parent of @modal is c05-app-router/, so (.)products
// intercepts c05-app-router/products/[id].
//
// SOFT NAVIGATION (clicking a <Link> inside the app):
//   1. The Next.js router sees the outgoing URL matches the intercepting route.
//   2. It renders THIS page (the modal) instead of products/[id]/page.tsx.
//   3. The browser URL updates to /challenges/c05-app-router/products/[id].
//   4. The layout keeps the @children slot (product listing) mounted in the
//      background — only the @modal slot changes.
//   Result: modal overlay with listing visible behind it; URL is shareable.
//
// HARD REFRESH / DEEP LINK:
//   1. No prior navigation context → intercepting routes do NOT fire.
//   2. Next.js resolves the URL normally: products/[id]/page.tsx.
//   3. @modal slot has no matching page → falls back to @modal/default.tsx (null).
//   Result: full standalone product detail page (no modal).
//
// CACHE COMPONENTS COMPLIANCE:
//   This page is a static shell.  The dynamic product lookup (getProductById,
//   which ultimately reads from an in-memory store simulating I/O) is wrapped
//   in a cached function in _lib/catalog.ts using 'use cache'.  Because
//   getCatalogProductById is a cached read (not an uncached dynamic read), it
//   does NOT need to be inside <Suspense>.  However, we still wrap it in
//   <Suspense> for the loading skeleton — it gives a better UX while the
//   cached function warms up on first request.
//
// NOTE: notFound() is called inside the async ModalProductDetail component
// rather than at the page's top level, to comply with the PPR rule (dynamic
// calls inside Suspense).

import { Suspense } from "react";
import { notFound } from "next/navigation";
import QuickViewModal from "@/app/(challenges)/c05-app-router/_components/QuickViewModal";
import { getCatalogProductById } from "@/app/(challenges)/c05-app-router/_lib/catalog";

interface ModalProductPageProps {
  params: Promise<{ id: string }>;
}

export default function ModalProductPage({ params }: ModalProductPageProps) {
  return (
    <QuickViewModal>
      <Suspense fallback={<ModalSkeleton />}>
        <ModalProductDetail params={params} />
      </Suspense>
    </QuickViewModal>
  );
}

// ─── DYNAMIC HOLE (cached read, inside Suspense for streaming) ────────────
async function ModalProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await params — required by Next.js v16 (async params API).
  const { id } = await params;

  // getCatalogProductById is cached via 'use cache' in _lib/catalog.ts.
  // The in-memory data layer has a simulated delay, so this benefits from
  // the cache warming: subsequent requests return instantly.
  const product = await getCatalogProductById(id);

  if (!product) {
    // notFound() inside Suspense boundary is safe under cacheComponents.
    notFound();
  }

  const price = (product.priceCents / 100).toFixed(2);

  return (
    <div className="space-y-4 pt-2">
      {/* Modal header badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono bg-indigo-50 text-indigo-600 rounded px-2 py-0.5">
          Quick View
        </span>
        <span className="text-xs text-gray-400">
          — intercepted at <code className="font-mono">@modal/(.)products/[id]</code>
        </span>
      </div>

      {/* Product image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.images[0]}
        alt={product.name}
        width={600}
        height={300}
        className="w-full h-48 object-cover rounded-xl"
      />

      {/* Product info */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
        <p className="text-2xl font-semibold text-indigo-600 mt-1">
          ${price}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Rating: {product.rating} / 5 &middot; {product.stock} in stock
        </p>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed">
        {product.description}
      </p>

      {/* Link to full product page */}
      <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
        <a
          href={`/challenges/c05-app-router/products/${id}`}
          className="underline hover:text-indigo-600"
        >
          View full product page &rarr;
        </a>
        <span className="ml-2">(opens full page — no modal)</span>
      </div>
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="space-y-4 pt-2 animate-pulse">
      <div className="h-4 w-48 bg-gray-100 rounded" />
      <div className="h-48 bg-gray-100 rounded-xl" />
      <div className="h-6 w-3/4 bg-gray-100 rounded" />
      <div className="h-4 w-1/2 bg-gray-100 rounded" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 w-4/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
