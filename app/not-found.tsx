// ─── app/not-found.tsx ────────────────────────────────────────────────────
//
// App-level 404 page. Next.js renders this whenever notFound() is called in
// a Server Component or when a route simply does not exist (no matching
// segment). It is a Server Component (no "use client" needed).
//
// Design: short, helpful message with a link back to the index. We don't add
// a search box here because the challenge index is the natural landing point.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Nextmart",
};

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 space-y-6">
      {/* Large 404 — decorative, aria-hidden */}
      <div
        className="text-7xl font-black text-gray-100 select-none leading-none"
        aria-hidden="true"
      >
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500 max-w-sm">
          The page you are looking for does not exist or has been moved. Check
          the URL, or return to the challenge index.
        </p>
      </div>

      <Link
        href="/"
        className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors no-underline"
      >
        Back to challenge index
      </Link>

      {/* Helpful hint for learners navigating challenge routes */}
      <p className="text-xs text-gray-400 max-w-xs">
        Challenge routes follow the pattern{" "}
        <code className="font-mono bg-gray-100 rounded px-1">/c01-auth</code>,{" "}
        <code className="font-mono bg-gray-100 rounded px-1">/c02-catalog-ssg-isr</code>
        , etc.
      </p>
    </div>
  );
}
