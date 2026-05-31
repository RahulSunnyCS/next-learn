// ─── app/(challenges)/c06-metadata-seo/page.tsx ──────────────────────────────
//
// C06 — Metadata & SEO — challenge listing page.
//
// This page is the entry point for the challenge.  It is a STATIC SHELL with
// a Suspense-wrapped product list so learners can navigate to product detail
// pages and observe the generateMetadata output in DevTools.
//
// CACHE COMPONENTS RULES (Next 16, cacheComponents: true):
//   - No `export const dynamic` directive.
//   - Product data read inside <Suspense>.
//   - Data helper uses `'use cache'` in _lib/seo.ts.

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCachedProductsForSitemap } from "./_lib/seo";
import { formatPrice } from "./_lib/seo";

export const metadata: Metadata = {
  title: "C06 — Metadata & SEO",
  description:
    "Learn the Next.js Metadata API: generateMetadata, OG images, canonical URLs, sitemaps, and robots.txt.",
};

export default function C06MetadataPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c06-metadata-seo</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Metadata & SEO
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches the Next.js Metadata API:{" "}
          <strong>generateMetadata</strong>, dynamic OG images via{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            opengraph-image.tsx
          </code>
          , canonical URLs, and the{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            sitemap.ts
          </code>{" "}
          /{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            robots.ts
          </code>{" "}
          file conventions.
        </p>
      </div>

      {/* ── STATIC SHELL: what to do ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-3">
        <h2 className="font-semibold text-indigo-900">What to do</h2>
        <ol className="text-sm text-indigo-800 space-y-2 list-decimal list-inside">
          <li>
            Click a product below to open its detail page.
          </li>
          <li>
            Open DevTools → Elements.  The{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              &lt;head&gt;
            </code>{" "}
            should contain a per-product{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              &lt;title&gt;
            </code>
            ,{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              &lt;meta name="description"&gt;
            </code>
            , and{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              &lt;link rel="canonical"&gt;
            </code>
            .
          </li>
          <li>
            Append{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              /opengraph-image
            </code>{" "}
            to the product URL in the address bar to see the dynamic OG image.
          </li>
          <li>
            Read{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              _meta/spec.md
            </code>{" "}
            for full task instructions.
          </li>
        </ol>
      </section>

      {/* ── DYNAMIC HOLE: product list, streamed inside Suspense ── */}
      <Suspense fallback={<ProductListSkeleton />}>
        <ProductList />
      </Suspense>

      {/* ── STATIC SHELL: defend-it reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            _meta/defend-it.md
          </code>{" "}
          with your answers, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c06-metadata-seo/NOTES.md
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─── Dynamic hole: product list ──────────────────────────────────────────────

async function ProductList() {
  // Uses the cached helper — products are fetched once per cacheLife('days')
  // window.  The simulated repository latency only hits on the first request.
  const products = await getCachedProductsForSitemap();

  // Show first 12 products for the listing.
  const visible = products.slice(0, 12);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">
        Product catalog ({products.length} products)
      </h2>
      <p className="text-xs text-gray-500">
        Click a product to see its metadata in the browser{" "}
        <code className="font-mono">&lt;head&gt;</code>.
      </p>
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {visible.map((product) => (
          <li key={product.id}>
            <Link
              href={`/challenges/c06-metadata-seo/${product.slug}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-indigo-50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 truncate">
                  {product.name}
                </p>
                <p className="text-xs text-gray-400 font-mono truncate">
                  /{product.slug}
                </p>
              </div>
              <span className="text-sm font-semibold text-indigo-600 shrink-0 ml-4">
                {formatPrice(product.priceCents, product.currency)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
      <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3">
            <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
