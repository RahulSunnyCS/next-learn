"use client";
// ─── error.tsx — ERROR BOUNDARY ───────────────────────────────────────────
//
// WHY "use client" IS REQUIRED:
//   Next.js error boundaries must be Client Components because they use
//   React's class-based (or hook-based) error boundary API, which requires
//   client-side JavaScript.  Server Components cannot catch errors from
//   other Server Components in the same way.
//
//   This "use client" directive makes this file a Client Component, so it
//   runs in the browser and can use hooks like useEffect and state.
//
// WHAT error.tsx DOES:
//   It wraps all pages in this layout subtree.  When any Server Component
//   (or Client Component) in the subtree throws, Next.js unmounts the
//   failing page tree and renders this component instead.
//
// THE reset() PROP:
//   Next.js passes a reset function that re-renders the page's segment.
//   This is the App Router equivalent of "retry" — it re-executes the
//   failed Server Component (or its page), giving it a chance to succeed
//   on the next attempt (e.g. if the error was a transient network issue).
//
// NOTE: error.tsx does NOT catch errors in the layout.tsx of the SAME
//   segment — it only catches errors in page.tsx and child layouts.

import { useEffect } from "react";

interface ErrorProps {
  /** The error that was thrown. */
  error: Error & { digest?: string };
  /** Call this to re-render the error boundary's subtree — "retry". */
  reset: () => void;
}

export default function C05Error({ error, reset }: ErrorProps) {
  // Log the error to the browser console for developer visibility.
  // In a real app this is where you would send to Sentry / Datadog.
  // NEVER log auth tokens or sensitive user data here.
  useEffect(() => {
    console.error("[c05-app-router] Caught error:", error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto mt-16 rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-bold text-red-800">Something went wrong</h2>
      <p className="text-sm text-red-700">
        {error.message || "An unexpected error occurred in the c05-app-router challenge."}
      </p>

      {/* Error digest — Next.js attaches this for server-side errors so you
          can correlate with server logs without exposing the full stack. */}
      {error.digest && (
        <p className="text-xs font-mono text-red-500 bg-red-100 rounded px-3 py-1">
          Error ID: {error.digest}
        </p>
      )}

      {/* Explanation */}
      <div className="text-left rounded-lg border border-red-100 bg-white p-4 text-xs text-gray-700 space-y-1.5">
        <p className="font-semibold text-gray-900">How error.tsx works</p>
        <ul className="space-y-1 list-disc list-inside text-gray-600">
          <li>Must be a Client Component (<code className="font-mono">&#34;use client&#34;</code> at top).</li>
          <li>Wraps every page in this subtree as an error boundary.</li>
          <li>Receives <code className="font-mono">error</code> (the thrown Error) and <code className="font-mono">reset</code> (retry function).</li>
          <li>Does NOT catch errors thrown inside layout.tsx at the same level.</li>
        </ul>
      </div>

      {/* Reset button */}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
