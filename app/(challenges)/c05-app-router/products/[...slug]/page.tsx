// ─── products/[...slug]/page.tsx — CATCH-ALL SEGMENT ─────────────────────
//
// CATCH-ALL [...slug]:
//   Unlike [id] which captures exactly ONE segment, [...slug] captures
//   ONE OR MORE segments.  It matches any URL of the form:
//     /challenges/c05-app-router/products/*
//     /challenges/c05-app-router/products/*/*
//     /challenges/c05-app-router/products/*/*/*  (etc.)
//
//   The params.slug value is a string[] — each element is one URL segment.
//   Example: URL /products/electronics/keyboards → slug = ["electronics", "keyboards"]
//
// ROUTE PRIORITY: [id] takes priority over [...slug] for a SINGLE segment.
//   So /products/p-elec-001 → [id]/page.tsx (single segment match)
//   And /products/electronics/keyboards → [...slug]/page.tsx (two segments)
//   Both files can coexist in the same products/ folder.
//
// OPTIONAL CATCH-ALL ([[...slug]]):
//   Double brackets would also match /products (zero segments).
//   We use single brackets so /products itself would 404, keeping the
//   route semantics clean for this demo.
//
// CACHE COMPONENTS COMPLIANCE:
//   params is a Promise in v16 — await it inside the Suspense hole.
//   getCatalogCategories is cached in _lib/catalog.ts, so it is safe to
//   call from any Server Component without Suspense.  The slug breakdown
//   is shown as a category-explorer hint based on available categories.
//
// NOTE ON CONFLICT WITH [id]:
//   Next.js resolves routes by specificity.  [id] matches exactly one
//   segment; [...slug] matches one-or-more.  The single-segment case
//   is won by [id], so there is no ambiguity.  This demo page will only
//   be reached when the path has 2+ segments after "products/".

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCatalogCategories } from "../../_lib/catalog";

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: CatchAllPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Browse: ${slug.join(" / ")} — C05 App Router` };
}

export default function CatchAllPage({ params }: CatchAllPageProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Static breadcrumb */}
      <nav className="text-xs text-gray-400 flex gap-1.5 items-center">
        <Link href="/challenges/c05-app-router" className="hover:text-indigo-500">
          c05-app-router
        </Link>
        <span>/</span>
        <span>products</span>
        <span>/</span>
        <span className="text-gray-600">[...slug]</span>
      </nav>

      {/* Dynamic hole: slug breakdown + category list */}
      <Suspense fallback={<CatchAllSkeleton />}>
        <CatchAllContent params={params} />
      </Suspense>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────
async function CatchAllContent({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  // v16: await params before destructuring.
  const { slug } = await params;

  // getCatalogCategories is cached — shows available category slugs as hints.
  const categories = await getCatalogCategories();

  return (
    <div className="space-y-6">
      {/* Catch-all badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono bg-pink-50 text-pink-700 rounded px-2 py-0.5">
          Catch-All [...slug]
        </span>
        <span className="text-xs text-gray-400">
          — rendered by <code className="font-mono">products/[...slug]/page.tsx</code>
        </span>
      </div>

      {/* Visualise how slug resolves */}
      <div className="rounded-xl border border-pink-100 bg-pink-50 p-5 space-y-3">
        <h1 className="text-lg font-bold text-gray-900">
          Browsing: {slug.join(" / ")}
        </h1>

        <div className="space-y-1 text-sm">
          <p className="text-gray-600">
            <strong>params.slug</strong> resolves to an array with{" "}
            <strong>{slug.length}</strong> segment{slug.length !== 1 ? "s" : ""}:
          </p>
          <pre className="bg-white rounded-lg border border-pink-100 p-3 text-xs font-mono overflow-x-auto">
{JSON.stringify(slug, null, 2)}
          </pre>
        </div>

        <div className="text-xs text-pink-700 space-y-1 border-t border-pink-100 pt-3">
          <p className="font-semibold">How the catch-all resolves</p>
          <ul className="space-y-0.5 list-disc list-inside text-pink-600">
            <li><code className="font-mono">products/electronics</code> → [id] wins (1 segment)</li>
            <li><code className="font-mono">products/electronics/keyboards</code> → [...slug] wins (2 segments)</li>
            <li><code className="font-mono">products/a/b/c/d</code> → [...slug] wins (4 segments)</li>
          </ul>
        </div>
      </div>

      {/* Categories hint */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">
          Available category slugs
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/challenges/c05-app-router/products/${cat.slug}/browse`}
              className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-mono text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 transition"
            >
              {cat.slug} / browse
            </Link>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Each link resolves via [...slug] since it has 2 segments.
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

function CatchAllSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 bg-gray-100 rounded" />
      <div className="rounded-xl border border-gray-100 p-5 space-y-3">
        <div className="h-5 w-64 bg-gray-100 rounded" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    </div>
  );
}
