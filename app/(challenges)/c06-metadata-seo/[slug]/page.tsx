// ─── app/(challenges)/c06-metadata-seo/[slug]/page.tsx ───────────────────────
//
// C06 — Metadata & SEO challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page follows the static-shell + Suspense-hole pattern from the
//   canonical example (c01-auth/page.tsx).
//
//   generateMetadata ALSO reads `params` which is a Promise in Next 15+.
//   We await it inside the function before any data access.  The data
//   itself is read via getCachedProduct() which has a `'use cache'`
//   wrapper in _lib/seo.ts — the same cached call is de-duped with the
//   page render by Next.js's internal request memoisation.
//
//   There is NO `export const dynamic` directive — that is banned under
//   cacheComponents. The page renders as ◐ (Partial Prerender): the
//   static shell (product details) prerenders; dynamic holes stream in.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCachedProduct,
  formatPrice,
  truncate,
  type Product,
} from "../_lib/seo";

// ─────────────────────────────────────────────────────────────────────────────
// generateMetadata
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY async AND WHY await params?
//   In Next.js 15+ all segment parameters (params, searchParams) are Promises.
//   The runtime resolves them lazily so that static pages can be prerendered
//   without awaiting every possible dynamic value.  If you forget `await params`
//   you get a TypeScript error in strict mode and a runtime warning in dev.
//
// WHY use getCachedProduct and not getProductBySlug directly?
//   generateMetadata is called on every request.  getCachedProduct wraps the
//   repository call with `'use cache'` + cacheTag + cacheLife so that:
//     1. Repeated calls within the cache window skip the simulated latency.
//     2. Next.js can de-duplicate the call between generateMetadata and the
//        page component render in a single request.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Must await params — it is a Promise in Next 15+.
  const { slug } = await params;

  const product = await getCachedProduct(slug);

  // If the product doesn't exist return minimal metadata.  The page itself
  // will call notFound() and return a 404, but generateMetadata must still
  // return a valid Metadata object.
  if (!product) {
    return {
      title: "Product not found",
      description: "The requested product could not be found.",
    };
  }

  const price = formatPrice(product.priceCents, product.currency);
  // Truncate description to stay within the ~155-char recommendation for
  // search-engine snippets.  Longer descriptions are truncated with "…".
  const description = truncate(
    `${product.description} — ${price}`,
    155
  );

  // The canonical URL points to the authoritative product path.  In this
  // teaching environment we use a placeholder domain; in production this
  // would be the real site origin (process.env.NEXT_PUBLIC_SITE_URL).
  const canonicalUrl = `https://nextmart.dev/products/${slug}`;

  return {
    title: `${product.name} — Nextmart`,
    description,

    // alternates.canonical tells search engines which URL is the
    // "true" address for this content, avoiding duplicate-content
    // penalties when the same product is reachable from multiple paths.
    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: product.name,
      description,
      url: canonicalUrl,
      siteName: "Nextmart",
      type: "website",
      // The OG image is automatically provided by [slug]/opengraph-image.tsx
      // (the file-based metadata convention).  We do NOT need to list it
      // here — Next.js injects it automatically because of that file.
    },

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

export default function C06ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── STATIC SHELL: challenge header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c06-metadata-seo / product
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Metadata & SEO: Dynamic Product Page
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This page demonstrates{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            generateMetadata
          </code>
          ,{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            opengraph-image.tsx
          </code>
          , and canonical URLs.  Open DevTools → Elements to inspect the{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &lt;head&gt;
          </code>{" "}
          tags.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: product data, streamed inside Suspense ──
          The product slug comes from route params (a Promise in Next 15+).
          We wrap the product display in Suspense so the static shell above
          prerenders immediately and the product detail streams in.        */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>

      {/* ── STATIC SHELL: learning notes ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-3">
        <h2 className="font-semibold text-indigo-900">
          How the Metadata Stack Works
        </h2>
        <ol className="text-sm text-indigo-800 space-y-2 list-decimal list-inside">
          <li>
            <strong>generateMetadata</strong> runs server-side before the page
            HTML is sent.  It awaits <code className="font-mono text-xs bg-indigo-100 rounded px-1">params</code>{" "}
            (a Promise in Next 15+) then calls the cached data helper to look
            up the product.
          </li>
          <li>
            <strong>opengraph-image.tsx</strong> is a file-system convention.
            Placing that file in the <code className="font-mono text-xs bg-indigo-100 rounded px-1">[slug]/</code>{" "}
            folder makes Next.js automatically serve the image and inject a
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">{"<meta property=\"og:image\">"}</code> tag.
          </li>
          <li>
            <strong>canonical URL</strong> in{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">alternates.canonical</code>{" "}
            prevents duplicate-content penalties when a product is accessible
            from multiple URL paths.
          </li>
          <li>
            <strong>sitemap.ts / robots.ts</strong> — see{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">_meta/spec.md</code>{" "}
            for why these files belong at{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">app/sitemap.ts</code> and{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">app/robots.ts</code> in
            a real app.
          </li>
        </ol>
      </section>

      {/* ── STATIC SHELL: defend-it reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c06-metadata-seo/_meta/defend-it.md
          </code>{" "}
          with your own answers, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c06-metadata-seo/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dynamic hole component
// ─────────────────────────────────────────────────────────────────────────────
//
// This async component lives inside <Suspense>.  It reads params (a Promise)
// and calls the cached product lookup.  Because it is inside Suspense, the
// static shell above prerenders immediately while this resolves.

async function ProductDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCachedProduct(slug);

  if (!product) {
    // Triggers the nearest not-found boundary (Next.js built-in 404).
    notFound();
  }

  return <ProductCard product={product} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure display components (no data fetching)
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const price = formatPrice(product.priceCents, product.currency);
  const stockLabel =
    product.stock > 0
      ? `${product.stock} in stock`
      : "Out of stock";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      {/* Price badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200 mb-2">
            Live product
          </span>
          <h2 className="text-xl font-semibold text-gray-900">
            {product.name}
          </h2>
        </div>
        <p className="text-2xl font-bold text-indigo-600 shrink-0">{price}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {product.description}
      </p>

      {/* Meta row */}
      <div className="flex gap-6 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <span>Rating: {product.rating} / 5</span>
        <span>{stockLabel}</span>
        <span className="font-mono">slug: {product.slug}</span>
      </div>

      {/* SEO info panel */}
      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-700">
          What the metadata for this page looks like:
        </p>
        <ul className="space-y-0.5 font-mono">
          <li>
            {"<title>"}{product.name} — Nextmart{"</title>"}
          </li>
          <li>
            {"<meta name=\"description\" content=\""}{truncate(product.description, 60)}{"…\">"}
          </li>
          <li>
            {"<link rel=\"canonical\" href=\"https://nextmart.dev/products/"}{product.slug}{"\" />"}
          </li>
          <li>
            {"<meta property=\"og:image\" content=\"…/opengraph-image\" />"}
          </li>
        </ul>
      </div>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
      <div className="h-4 w-3/4 bg-gray-50 rounded animate-pulse" />
    </section>
  );
}
