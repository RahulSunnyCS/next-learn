"use client";
// ─── [slug]/error.tsx — Route Segment Error Boundary ─────────────────────
//
// This file creates a React Error Boundary for the [slug] route segment.
//
// WHAT error.tsx CATCHES:
//   Errors thrown during the SYNCHRONOUS (initial) render of the page
//   component (page.tsx) and its children, BEFORE any HTTP bytes are sent.
//   In PPR, this means errors thrown while building the STATIC SHELL.
//   If the shell throws, the error boundary catches it and renders this
//   component instead of the broken shell.
//
// WHAT error.tsx DOES NOT CATCH:
//   Errors thrown inside <Suspense> holes AFTER the shell has been flushed
//   to the browser. Once the first HTTP byte is written (the shell), the
//   response is in-flight. There is no mechanism to "call back" and change
//   the error boundary's output. The status code is locked at 200.
//
//   In the page, the `StreamErrorDemo` component intentionally throws after
//   the shell flush. It handles its own error with a try-catch INSIDE the
//   component and renders an error fallback inline. The route error.tsx
//   boundary is NEVER invoked for that component.
//
// WHY 'use client'?
//   React Error Boundaries must be Client Components. The `error` prop
//   contains an Error object (not serialisable for the network boundary
//   between Server and Client), and the `reset` function is a client-side
//   action that re-triggers the segment's render. Next.js enforces this
//   by requiring error.tsx to be a Client Component.
//
// WHEN DOES THIS ACTUALLY FIRE?
//   In this challenge, error.tsx fires if:
//   1. `getProductShellData(slug)` throws (e.g., the data layer crashes).
//   2. The `ProductShell` component throws during rendering (e.g., a bug
//      in the component itself, not a data fetch that ran post-flush).
//   It does NOT fire for the LiveInventory, Recommendations, Reviews, or
//   StreamErrorDemo components — those are inside Suspense holes.

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function C03ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // In production you would log the error to an error reporting service.
    // We avoid logging the full error object here to not leak stack traces.
    console.error("[C03 PPR] Shell render error:", error.message);
  }, [error]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
            error.tsx
          </span>
          <h1 className="text-lg font-semibold text-red-900">
            Something went wrong rendering the product shell
          </h1>
        </div>

        <p className="text-sm text-red-700 leading-relaxed">
          The error boundary for this route segment caught an error thrown
          during the <strong>initial render</strong> of the page shell —
          before any HTTP bytes were sent to the browser.
        </p>

        {/* Show error details in development; suppress in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-md bg-red-100 border border-red-200 p-3 space-y-1">
            <p className="text-xs font-medium text-red-800">Error message (dev only):</p>
            <p className="text-xs text-red-700 font-mono">{error.message}</p>
            {error.digest && (
              <p className="text-xs text-red-600 font-mono">digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="rounded-md bg-white border border-red-100 p-4 text-xs text-gray-600 space-y-2">
          <p className="font-medium text-gray-700">Why error.tsx caught this:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The error happened during the synchronous render of the static shell.</li>
            <li>No HTTP byte had been flushed yet — the boundary could still intercept.</li>
            <li>This is the ONLY kind of error error.tsx can catch in a PPR page.</li>
          </ul>
          <p className="font-medium text-gray-700 mt-3">What error.tsx does NOT catch:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Errors inside Suspense holes that throw AFTER the shell is flushed.</li>
            <li>Client-side runtime errors (use an ErrorBoundary Client Component).</li>
          </ul>
        </div>

        <button
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
