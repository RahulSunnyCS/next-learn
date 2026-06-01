"use client";
// ─── app/error.tsx ────────────────────────────────────────────────────────
//
// App-level error boundary. Next.js requires error.tsx to be a Client
// Component ("use client") because it receives the `error` and `reset`
// props from React's error boundary mechanism, which is inherently
// client-side (React's ErrorBoundary uses componentDidCatch).
//
// This catches unhandled runtime errors thrown during rendering of any
// route below this layout. It does NOT catch errors in layout.tsx itself
// (those bubble to global-error.tsx if present).

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  // reset() re-renders the segment to attempt recovery without a full page
  // reload. Call it when the user clicks "Try again".
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // Log the error to the console in dev so the developer can see the stack.
  // In production you would send this to an error-tracking service (e.g.
  // Sentry, Datadog) instead of / in addition to console.error.
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 space-y-6">
      {/* Error icon — decorative, hidden from screen readers */}
      <div
        className="text-5xl select-none"
        aria-hidden="true"
      >
        ⚠️
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 max-w-sm">
          An unexpected error occurred while loading this page. The error has
          been logged. You can try again or return to the challenge index.
        </p>
        {/* Show digest (a stable identifier Next.js adds in production so you
            can correlate this error with server logs) if present. */}
        {error.digest && (
          <p className="text-xs font-mono text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors no-underline"
        >
          Challenge index
        </Link>
      </div>
    </div>
  );
}
