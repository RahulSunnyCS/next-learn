// ─── app/(challenges)/c02-catalog-ssg-isr/[slug]/page.tsx ─────────────────
//
// C02 — Category page (SSG + dynamicParams gotcha).
//
// This route pre-renders every known category slug at build time via
// generateStaticParams.  The SLUG here is a CATEGORY slug (e.g. "electronics"),
// not a product slug.  Product detail pages belong to the sibling C03 challenge.
//
// ── SSG via generateStaticParams ──────────────────────────────────────────
//   Next.js calls generateStaticParams() during `next build`.  For each
//   returned { slug }, it renders this page and writes a static HTML file to
//   .next/.  At runtime those routes are served as pre-built HTML — no server
//   compute, fast, CDN-cacheable.
//
// ── The dynamicParams gotcha ──────────────────────────────────────────────
//   generateStaticParams only pre-renders KNOWN slugs.  What about a slug that
//   was NOT in the list?  That is governed by `dynamicParams`:
//
//     export const dynamicParams = true;   // (the default)
//       → Unknown slugs render on demand (SSR for that request).
//       → Good when new categories can be added after build time.
//
//     export const dynamicParams = false;
//       → Unknown slugs return 404 immediately.
//       → Good when the set of valid slugs is fixed and known at build time.
//
//   This is a ROUTE SEGMENT CONFIG (not a cache directive) and IS permitted
//   under cacheComponents: true.  Only `export const dynamic = ...` is banned.
//
//   CHALLENGE: Change dynamicParams to false and run `next build`, then visit
//   /c02-catalog-ssg-isr/not-a-real-category.  Observe the 404.  Change back
//   to true and observe the on-demand render.
//
// ── What is static vs dynamic on this page ───────────────────────────────
//   Static shell (prerenders immediately): page header, learning notes.
//   Dynamic hole (inside Suspense):        CategoryNav, ProductGrid.
//   The Suspense holes stream in; the static wrapper HTML is served instantly.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  listCachedCategories,
  listCachedProducts,
  getCachedCategoryBySlug,
} from "../_lib/catalog";
import { ProductGrid, ProductGridSkeleton } from "../_components/ProductGrid";

// ─── Route segment config ─────────────────────────────────────────────────
//
// dynamicParams = true  → unknown slugs render on demand (default behaviour)
// dynamicParams = false → unknown slugs return 404
//
// Flip this to `false` to observe the 404 behaviour for unknown slugs.
// The production default is `true` (new categories can be added after build).
//
// THIS IS ALLOWED under cacheComponents — only `export const dynamic` is
// forbidden.  dynamicParams is a different config key.
export const dynamicParams = true;

// ─── generateStaticParams ─────────────────────────────────────────────────
//
// Called once during `next build`.  Returns one { slug } object per known
// category.  Next.js pre-renders this page for each, writing static HTML to
// .next/server/app/(challenges)/c02-catalog-ssg-isr/<slug>/index.html.
//
// After build, the Route table shows ○ (Static) for these slugs.
//
// CHALLENGE: Add this function, or verify it is present and returning the
// correct slugs from listCachedCategories().
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // listCachedCategories() is (once the challenge is solved) wrapped in
  // 'use cache'.  At build time this is a cold call — the cache is empty —
  // so the actual data fetch runs once and populates the cache.
  const categories = await listCachedCategories();
  return categories.map((cat) => ({ slug: cat.slug }));
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  // Must await params in v16 (async request APIs rule).
  const { slug } = await params;
  const category = await getCachedCategoryBySlug(slug);
  if (!category) {
    return { title: "Category Not Found" };
  }
  return {
    title: `${category.name} — C02 Catalog`,
    description: `Browse ${category.name} products in the Nextmart catalog SSG + ISR demo.`,
  };
}

// ─── Page component ───────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Must await params — v16 async request APIs rule.
  const { slug } = await params;

  // Look up the category.  If not found AND dynamicParams = false, Next.js
  // would have already returned 404 before reaching here.  With
  // dynamicParams = true, we reach here for unknown slugs and must handle
  // them gracefully.
  const category = await getCachedCategoryBySlug(slug);

  if (!category) {
    // Demonstrate the "not found" path for unknown slugs when
    // dynamicParams = true.  This renders a proper 404 response
    // rather than crashing with an unhandled null.
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* ── STATIC SHELL: breadcrumb + header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c02-catalog-ssg-isr / {slug}
        </p>
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <Link href="/c02-catalog-ssg-isr" className="hover:text-indigo-600 hover:underline">
            All Products
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">{category.name}</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {category.name}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Browsing the{" "}
          <strong>{category.name}</strong> category — pre-rendered at build
          time via{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            generateStaticParams
          </code>
          , served as static HTML.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: category navigation ── */}
      <Suspense fallback={<CategoryNavSkeleton />}>
        <CategoryNav activeCategorySlug={slug} />
      </Suspense>

      {/* ── Learning note: SSG + dynamicParams ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800 space-y-2">
        <p className="font-semibold text-indigo-900">
          SSG + <code className="font-mono text-xs">dynamicParams</code>
        </p>
        <p>
          This page was pre-rendered at build time because{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            {slug}
          </code>{" "}
          was returned by{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            generateStaticParams()
          </code>
          . It is served as static HTML — no server compute on this request.
        </p>
        <p>
          Currently{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            dynamicParams = true
          </code>
          . Try visiting{" "}
          <Link
            href="/c02-catalog-ssg-isr/gadgets"
            className="underline hover:text-indigo-600"
          >
            /c02-catalog-ssg-isr/gadgets
          </Link>{" "}
          (an unknown slug). Flip{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            dynamicParams = false
          </code>{" "}
          in this file to observe 404 behaviour instead.
        </p>
      </section>

      {/* ── DYNAMIC HOLE: product grid filtered to this category ── */}
      <Suspense fallback={<ProductGridSkeleton />}>
        {/* Pass categoryId (not slug) — that is what listProducts filters on. */}
        <ProductGrid categoryId={category.id} />
      </Suspense>

      {/* ── STATIC SHELL: back link ── */}
      <div>
        <Link
          href="/c02-catalog-ssg-isr"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to all products
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryNav — async Server Component, rendered inside Suspense
// ---------------------------------------------------------------------------

async function CategoryNav({
  activeCategorySlug,
}: {
  activeCategorySlug: string | null;
}) {
  const categories = await listCachedCategories();

  return (
    <nav aria-label="Category filter" className="flex flex-wrap gap-2">
      <Link
        href="/c02-catalog-ssg-isr"
        className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
      >
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/c02-catalog-ssg-isr/${cat.slug}`}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategorySlug === cat.slug
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name}
        </Link>
      ))}
    </nav>
  );
}

function CategoryNavSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-8 rounded-full bg-gray-100 animate-pulse"
          style={{ width: `${60 + i * 10}px` }}
        />
      ))}
    </div>
  );
}
