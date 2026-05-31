// ─── not-found.tsx ─────────────────────────────────────────────────────────
//
// Renders when notFound() is called anywhere in this layout subtree.
// In this challenge, notFound() is called by products/[id]/page.tsx when
// a product ID does not exist in the catalog (getCatalogProductById returns null).
//
// HOW notFound() WORKS:
//   Calling notFound() from a Server Component throws a special Next.js
//   internal error that is NOT caught by error.tsx — it is instead caught
//   by the nearest not-found.tsx in the ancestor segment chain.
//   (error.tsx catches runtime errors; not-found.tsx catches intentional
//   "this resource does not exist" signals.)
//
// This is a Server Component (no "use client" needed).
// It can import shared UI and even read cached data if needed.
// Note: it cannot accept props — Next.js renders it without passing any.

import Link from "next/link";

export default function C05NotFound() {
  return (
    <div className="max-w-2xl mx-auto mt-16 rounded-2xl border border-orange-200 bg-orange-50 p-8 text-center space-y-4">
      <div className="text-5xl font-black text-orange-300">404</div>
      <h2 className="text-xl font-bold text-orange-800">Product Not Found</h2>
      <p className="text-sm text-orange-700">
        The product ID you requested does not exist in the Nextmart catalog.
      </p>

      {/* How this was triggered */}
      <div className="text-left rounded-lg border border-orange-100 bg-white p-4 text-xs text-gray-700 space-y-1.5">
        <p className="font-semibold text-gray-900">How not-found.tsx is triggered</p>
        <ul className="space-y-1 list-disc list-inside text-gray-600">
          <li>
            <code className="font-mono">products/[id]/page.tsx</code> calls{" "}
            <code className="font-mono">notFound()</code> when{" "}
            <code className="font-mono">getProductById(id)</code> returns{" "}
            <code className="font-mono">null</code>.
          </li>
          <li>
            <code className="font-mono">notFound()</code> throws an internal Next.js signal — NOT
            caught by <code className="font-mono">error.tsx</code>.
          </li>
          <li>Next.js walks up the segment tree and renders the nearest <code className="font-mono">not-found.tsx</code>.</li>
          <li>Here, that is <code className="font-mono">c05-app-router/not-found.tsx</code> (this file).</li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 justify-center">
        <Link
          href="/challenges/c05-app-router"
          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition"
        >
          &larr; Back to catalog
        </Link>
      </div>
    </div>
  );
}
