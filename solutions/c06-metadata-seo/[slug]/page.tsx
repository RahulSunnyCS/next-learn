// ─── solutions/c06-metadata-seo/[slug]/page.tsx ───────────────────────────────
//
// REFERENCE SOLUTION — C06 Metadata & SEO
//
// This file is the annotated reference for the product detail page.  It shows
// the complete, correct implementation of generateMetadata for a dynamic route.
//
// KEY DECISIONS EXPLAINED:
//
//   1. WHY async generateMetadata?
//      generateMetadata must be async because it needs to await params (Promise
//      in Next 15+) and may call async data functions.  Next.js runs it server-
//      side before the page HTML is sent to the client.
//
//   2. WHY await params inside generateMetadata?
//      In Next.js 15+ ALL segment parameters (params, searchParams) are Promises
//      so that static pages can be prerendered without awaiting every dynamic
//      value.  Forgetting await gives a TypeScript error in strict mode.
//
//   3. WHY getCachedProduct and not getProductBySlug directly?
//      getCachedProduct wraps the call in `'use cache'`.  This means:
//        a. The same product data is shared between generateMetadata and the
//           page render component in a single request (React de-duplication).
//        b. Subsequent requests within cacheLife('hours') skip the simulated
//           repository latency entirely.
//
//   4. WHY alternates.canonical?
//      A product can be reachable from multiple paths (e.g. /products/x,
//      /shop/x, /sale/x).  Without canonical, Google may split PageRank across
//      those URLs.  Canonical tells crawlers which URL is authoritative.
//
//   5. WHY is og.image NOT listed in generateMetadata?
//      Because [slug]/opengraph-image.tsx is present.  Next.js auto-injects
//      the og:image tag from that file.  Listing it manually in generateMetadata
//      would produce a duplicate tag.
//
//   6. WHY is there NO `export const dynamic` directive?
//      The cacheComponents: true config (cache-components-rules.md, rule 1)
//      makes `export const dynamic` illegal.  Dynamic is the default under PPR;
//      you opt INTO caching with `'use cache'`, not out with a directive.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// These helpers live in the challenge's _lib, not here.
// Solutions reference the challenge implementation to avoid duplication.
import {
  getCachedProduct,
  formatPrice,
  truncate,
  type Product,
} from "../../app/(challenges)/c06-metadata-seo/_lib/seo";

// ─────────────────────────────────────────────────────────────────────────────
// generateMetadata — the heart of this challenge
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Step 1: await params (required in Next 15+).
  const { slug } = await params;

  // Step 2: fetch the product via the cached helper.
  const product = await getCachedProduct(slug);

  // Step 3: handle 404 gracefully — generateMetadata must always return a
  // valid Metadata object, even if the page will notFound().
  if (!product) {
    return {
      title: "Product not found — Nextmart",
      description: "The requested product could not be found.",
    };
  }

  const price = formatPrice(product.priceCents, product.currency);
  // Truncate at 155 chars — the SEO-recommended description length.
  const description = truncate(`${product.description} — ${price}`, 155);
  const canonicalUrl = `https://nextmart.dev/products/${slug}`;

  return {
    // title is rendered as <title> in the <head>.
    title: `${product.name} — Nextmart`,

    // description maps to <meta name="description">.
    description,

    // alternates.canonical → <link rel="canonical" href="…">
    alternates: {
      canonical: canonicalUrl,
    },

    // openGraph tags control the link preview card on social platforms.
    openGraph: {
      title: product.name,
      description,
      url: canonicalUrl,
      siteName: "Nextmart",
      type: "website",
      // og:image is NOT listed here — it is injected automatically by
      // [slug]/opengraph-image.tsx (the file-system metadata convention).
    },

    // Twitter card metadata (also used by other platforms).
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);
  if (!product) notFound();
  return <ProductCard product={product} />;
}

function ProductCard({ product }: { product: Product }) {
  const price = formatPrice(product.priceCents, product.currency);
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
        <p className="text-2xl font-bold text-indigo-600 shrink-0">{price}</p>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
    </section>
  );
}
