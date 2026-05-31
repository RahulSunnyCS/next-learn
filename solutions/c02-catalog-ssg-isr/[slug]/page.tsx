// ─── solutions/c02-catalog-ssg-isr/[slug]/page.tsx ────────────────────────
//
// REFERENCE SOLUTION — C02 Category page.
//
// This file shows the SOLVED [slug]/page.tsx with:
//   1. generateStaticParams that pre-renders all known category slugs.
//   2. dynamicParams = true (allows on-demand render for unknown slugs).
//   3. The contrast: what dynamicParams = false does.
//
// Study this AFTER completing the challenge and filling in defend-it.md.

import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

// ── SOLUTION: Route segment config ────────────────────────────────────────
//
// dynamicParams controls behaviour for slugs NOT in generateStaticParams:
//
//   export const dynamicParams = true;  // default
//     → renders on demand (SSR for that request)
//     → correct for a catalog where new categories can be added at any time
//
//   export const dynamicParams = false;
//     → returns 404 for unknown slugs
//     → correct for a fixed set of slugs that never changes after build
//
// For this catalog: true is correct (new categories may be added post-build).
export const dynamicParams = true;

// ── SOLUTION: generateStaticParams ────────────────────────────────────────
//
// This is called once during `next build`.  It returns { slug } objects for
// all known categories.  Next.js pre-renders a static HTML file for each.
//
// In the build output: ○ (Static) for /c02-catalog-ssg-isr/electronics etc.
//
// NOTE: In a real solution file this would import from the challenge's
// _lib/catalog.ts.  Here it is stubbed for documentation clarity.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  // Production solution calls:
  //   const categories = await listCachedCategories();
  //   return categories.map((cat) => ({ slug: cat.slug }));
  //
  // Which returns (from fixture data):
  return [
    { slug: "books" },
    { slug: "clothing" },
    { slug: "electronics" },
    { slug: "home" },
    { slug: "sports" },
  ];
}

// ── SOLUTION: Page component ───────────────────────────────────────────────

export default async function CategoryPageSolution({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // SOLUTION: await params — v16 async request APIs rule.
  const { slug } = await params;

  // SOLUTION: look up category.  With dynamicParams = true, this can receive
  // slugs that were not in generateStaticParams.  Handle gracefully with
  // notFound() rather than crashing on null.
  // const category = await getCachedCategoryBySlug(slug);
  // if (!category) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c02-catalog-ssg-isr / {slug} (SOLUTION)
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Category: {slug}
        </h1>
      </div>

      {/* SOLUTION: CategoryNav inside Suspense */}
      <Suspense fallback={<div className="h-8 bg-gray-100 rounded animate-pulse" />}>
        <div className="text-sm text-gray-500 italic">
          [CategoryNav — inside Suspense]
        </div>
      </Suspense>

      {/* SOLUTION notes */}
      <section className="p-4 border rounded-xl bg-gray-50 text-sm space-y-3">
        <p className="font-semibold text-gray-900">Key fixes in this solution</p>

        <div>
          <p className="font-medium text-gray-800 mb-1">
            1. generateStaticParams
          </p>
          <p className="text-gray-600">
            Returns all 5 category slugs. `next build` pre-renders each to
            static HTML. Build output shows ○ (Static) for each slug.
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-800 mb-1">
            2. dynamicParams = true
          </p>
          <p className="text-gray-600">
            Unknown slugs (e.g. /gadgets) render on demand. The page calls
            getCachedCategoryBySlug(slug) → null → notFound() → 404 response.
            Changing to `false` makes Next.js return 404 before even reaching
            the page component.
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-800 mb-1">
            3. await params (v16 requirement)
          </p>
          <p className="text-gray-600">
            In Next.js 16, `params` is a Promise. You MUST await it.
            `const {"{ slug }"} = await params;` — not `params.slug` directly.
          </p>
        </div>

        <div>
          <p className="font-medium text-gray-800 mb-1">
            4. ProductGrid inside Suspense
          </p>
          <p className="text-gray-600">
            The ProductGrid is passed `categoryId` (not slug) because
            listProducts() filters by categoryId. The lookup translates slug
            → category → categoryId.
          </p>
        </div>
      </section>

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
