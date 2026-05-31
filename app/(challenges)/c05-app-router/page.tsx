// ─── app/(challenges)/c05-app-router/page.tsx ─────────────────────────────
//
// C05 — App Router Architecture challenge page.
//
// CACHE COMPONENTS PATTERN (matches c01-auth canonical shape):
//   The page is a STATIC SHELL. The product listing reads from the shared
//   in-memory data layer which has simulated latency.  We wrap it in a
//   cached helper (_lib/catalog.ts) so it does NOT count as an "uncached
//   dynamic read" — but we still use <Suspense> to stream the listing in
//   and show a skeleton while the cache warms on the first request.
//
// ROUTE GROUP: this file lives under app/(challenges)/c05-app-router.
//   The (challenges) folder is a ROUTE GROUP — the parentheses make it
//   invisible in the URL.  So this page renders at /challenges/c05-app-router
//   (not /challenges/(challenges)/c05-app-router).
//
// WHAT THIS PAGE DEMONSTRATES:
//   - Route groups (invisible (challenges) segment)
//   - Listing page that coexists with parallel @modal slot
//   - Product cards that trigger the intercepting-route modal on click
//   - Links to [id] and [...slug] sub-routes

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCatalogProducts } from "./_lib/catalog";
import type { Product } from "@/lib/data";

export const metadata: Metadata = {
  title: "C05 — App Router Architecture",
};

export default function C05AppRouterPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ─── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c05-app-router</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          App Router Architecture
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Explore the core file-system routing conventions of the Next.js App
          Router: route groups, dynamic and catch-all segments, parallel routes,
          and intercepting routes (modal-via-URL pattern).
        </p>
      </div>

      {/* ── STATIC SHELL: Convention Navigator ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Routing Conventions Used in This Challenge</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2">
            <code className="font-mono text-xs bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 shrink-0">(challenges)</code>
            <span className="text-gray-600">Route group — parentheses make this segment invisible in the URL.</span>
          </li>
          <li className="flex gap-2">
            <code className="font-mono text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5 shrink-0">[id]</code>
            <span className="text-gray-600">Dynamic segment — captures a single path part, e.g. <code className="font-mono text-xs">products/p-elec-001</code>.</span>
          </li>
          <li className="flex gap-2">
            <code className="font-mono text-xs bg-pink-50 text-pink-700 rounded px-1.5 py-0.5 shrink-0">[...slug]</code>
            <span className="text-gray-600">Catch-all segment — captures one or more parts, e.g. <code className="font-mono text-xs">products/electronics/keyboards/mechanical</code>.</span>
          </li>
          <li className="flex gap-2">
            <code className="font-mono text-xs bg-amber-50 text-amber-700 rounded px-1.5 py-0.5 shrink-0">@modal</code>
            <span className="text-gray-600">Parallel slot — renders alongside children in the layout without affecting the URL.</span>
          </li>
          <li className="flex gap-2">
            <code className="font-mono text-xs bg-green-50 text-green-700 rounded px-1.5 py-0.5 shrink-0">(.)products/[id]</code>
            <span className="text-gray-600">Intercepting route — captures soft-navigation to <code className="font-mono text-xs">products/[id]</code> and opens a modal. Hard-refresh goes to the full page.</span>
          </li>
        </ul>
      </section>

      {/* ── DYNAMIC HOLE: product listing, inside Suspense ── */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-3">
          Products{" "}
          <span className="text-xs font-normal text-gray-400">
            — click a card to see the intercepting-route modal
          </span>
        </h2>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </section>

      {/* ── STATIC SHELL: catch-all route demo links ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">
          Catch-All Route Demo <code className="font-mono text-sm font-normal text-pink-700">[...slug]</code>
        </h2>
        <p className="text-sm text-gray-600">
          These links all resolve via the same <code className="font-mono text-xs">products/[...slug]/page.tsx</code>{" "}
          file — the slug parameter captures every segment after <code className="font-mono text-xs">products/</code>.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ["electronics", "/challenges/c05-app-router/products/electronics"],
            ["electronics/keyboards", "/challenges/c05-app-router/products/electronics/keyboards"],
            ["clothing/tops/merino", "/challenges/c05-app-router/products/clothing/tops/merino"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center rounded-lg border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-mono text-pink-700 hover:bg-pink-100 transition"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── STATIC SHELL: loading / error / not-found demo links ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Special File Demos</h2>
        <ul className="text-sm space-y-2">
          <li className="flex gap-2 items-start">
            <code className="font-mono text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 shrink-0">loading.tsx</code>
            <span className="text-gray-600">Shown as a streaming skeleton while any async component in this subtree loads.</span>
          </li>
          <li className="flex gap-2 items-start">
            <code className="font-mono text-xs bg-red-50 text-red-700 rounded px-1.5 py-0.5 shrink-0">error.tsx</code>
            <span className="text-gray-600">
              Client Component boundary — wraps all pages in this subtree.{" "}
              <Link href="/challenges/c05-app-router/products/trigger-error" className="underline text-red-500">
                Trigger it &rarr;
              </Link>
            </span>
          </li>
          <li className="flex gap-2 items-start">
            <code className="font-mono text-xs bg-orange-50 text-orange-700 rounded px-1.5 py-0.5 shrink-0">not-found.tsx</code>
            <span className="text-gray-600">
              Shown when <code className="font-mono text-xs">notFound()</code> is called.{" "}
              <Link href="/challenges/c05-app-router/products/this-does-not-exist" className="underline text-orange-500">
                Trigger it &rarr;
              </Link>
            </span>
          </li>
        </ul>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c05-app-router/_meta/defend-it.md
          </code>{" "}
          with your answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c05-app-router/</code>.
        </p>
      </section>
    </div>
  );
}

// ─── DYNAMIC HOLE (inside Suspense) ──────────────────────────────────────
async function ProductGrid() {
  // getCatalogProducts uses 'use cache' in _lib/catalog.ts — not an uncached
  // read, so safe to call here.  Still inside <Suspense> for streaming UX.
  const { items: products } = await getCatalogProducts();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────
// Using <a> instead of <Link> for the modal trigger.
// <Link> would also work here but plain <a> with href makes the demo
// self-contained without needing to import next/link inside this component.
function ProductCard({ product }: { product: Product }) {
  const price = (product.priceCents / 100).toFixed(2);
  // The href points to the [id] route.  On soft navigation, the intercepting
  // route @modal/(.)products/[id] fires and opens the modal.
  // On hard-refresh of this URL, the full product page renders instead.
  return (
    <Link
      href={`/challenges/c05-app-router/products/${product.id}`}
      className="block rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.images[0]}
        alt={product.name}
        width={600}
        height={200}
        className="w-full h-36 object-cover"
      />
      <div className="p-3">
        <p className="text-xs font-mono text-gray-400 mb-0.5">
          id: {product.id}
        </p>
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-indigo-600 font-bold text-sm mt-1">${price}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Click → modal (soft nav) &middot; refresh URL → full page
        </p>
      </div>
    </Link>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="h-36 bg-gray-100" />
          <div className="p-3 space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
