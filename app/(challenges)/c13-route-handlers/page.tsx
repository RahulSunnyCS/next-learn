// ─── app/(challenges)/c13-route-handlers/page.tsx ────────────────────────
//
// C13 — Route Handlers, Edge Runtime, and proxy.ts
//
// CACHE COMPONENTS RULES (Next 16, cacheComponents: true):
//   - NO `export const dynamic` directive (disallowed under cacheComponents).
//   - NO uncached/dynamic reads at the route top level.
//   - Any per-request data (cookies, searchParams) MUST be inside <Suspense>.
//   - This page is a STATIC SHELL with a streamed dynamic hole for the
//     session display (consistent with the canonical c01-auth pattern).
//
// This page is a learning overview. It does NOT directly exercise the route
// handlers (the learner calls them from the browser or the links below).
// The dynamic SessionInfo hole shows whether the learner is authenticated
// (relevant for the proxy.ts auth-gate demo).

import { Suspense } from "react";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "C13 — Route Handlers + Edge + proxy.ts",
};

export default function C13Page() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c13-route-handlers</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Route Handlers, Edge Runtime, and proxy.ts
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge covers three interconnected topics: GET route-handler
          caching behaviour in Next.js 16, the Edge runtime&apos;s restricted Web
          API surface, and the <code className="font-mono bg-gray-100 rounded px-1">proxy.ts</code>{" "}
          middleware for auth-gating, locale redirects, and A/B rewrites.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: session status (for proxy.ts demo) ── */}
      <Suspense fallback={<SessionStatusSkeleton />}>
        <SessionStatus />
      </Suspense>

      {/* ── STATIC SHELL: Route Handler demos ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Part A — Search Route Handler (GET)</h2>
        <p className="text-sm text-gray-600">
          A standard Node-runtime GET handler at{" "}
          <code className="font-mono bg-gray-100 rounded px-1">/c13-route-handlers/search</code>.
          Demonstrates input validation, error handling, and the v16 caching
          behaviour change (GET handlers are NOT cached by default).
        </p>
        <div className="rounded-md bg-gray-50 border border-gray-100 p-4 text-xs font-mono text-gray-700 space-y-1">
          <p>Try in your browser or <code>curl</code>:</p>
          <p>GET /c13-route-handlers/search?q=headphones&amp;limit=5</p>
          <p>GET /c13-route-handlers/search?q=                  (empty — returns all)</p>
          <p>GET /c13-route-handlers/search?limit=999            (400 — limit capped at 50)</p>
        </div>
        <div className="rounded-md bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
          <strong>v16 caching footgun:</strong> In Next.js 12–14, GET handlers
          were cached by default when no dynamic APIs were used. In v15/v16
          this changed — GET handlers are NOT cached unless you explicitly use{" "}
          <code className="font-mono bg-amber-100 rounded px-0.5">&apos;use cache&apos;</code> on the data
          accessor or add <code className="font-mono bg-amber-100 rounded px-0.5">Cache-Control</code> headers.
          Migration from v14 may cause surprise if you relied on implicit caching.
        </div>
      </section>

      {/* ── STATIC SHELL: Edge runtime demo ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Part B — Edge-runtime Route Handler</h2>
        <p className="text-sm text-gray-600">
          An Edge-runtime GET handler at{" "}
          <code className="font-mono bg-gray-100 rounded px-1">/c13-route-handlers/edge-geo</code>.
          Uses <code className="font-mono bg-gray-100 rounded px-1">export const runtime = &apos;edge&apos;</code>,
          reads geolocation headers injected by the CDN, and demonstrates
          Web Crypto without Node&apos;s <code className="font-mono bg-gray-100 rounded px-1">Buffer</code>.
        </p>
        <div className="rounded-md bg-gray-50 border border-gray-100 p-4 text-xs font-mono text-gray-700">
          <p>GET /c13-route-handlers/edge-geo</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-md bg-green-50 border border-green-100 p-3 text-green-800">
            <p className="font-semibold mb-1">Available at Edge</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>fetch() / Request / Response</li>
              <li>crypto.subtle / crypto.getRandomValues</li>
              <li>URL / URLSearchParams</li>
              <li>TextEncoder / TextDecoder</li>
              <li>ReadableStream / WritableStream</li>
            </ul>
          </div>
          <div className="rounded-md bg-red-50 border border-red-100 p-3 text-red-800">
            <p className="font-semibold mb-1">NOT available at Edge</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>fs / path / os (Node built-ins)</li>
              <li>Buffer (use Uint8Array)</li>
              <li>require() / CommonJS</li>
              <li>Node crypto module (use SubtleCrypto)</li>
              <li>child_process / net / tls</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── STATIC SHELL: proxy.ts demo ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Part C — proxy.ts (Middleware)</h2>
        <p className="text-sm text-gray-600">
          <code className="font-mono bg-gray-100 rounded px-1">proxy.ts</code> at the repo root
          runs on Node (default) before route matching. Three behaviours are demonstrated:
          auth-gating, locale redirect, and A/B rewrite.
        </p>
        <ol className="text-sm text-gray-700 space-y-3 list-decimal list-inside">
          <li>
            <strong>Auth gate</strong> —{" "}
            <code className="font-mono bg-gray-100 rounded px-1 text-xs">/c13-route-handlers/account</code>{" "}
            redirects to <code className="font-mono bg-gray-100 rounded px-1 text-xs">/c01-auth?next=...</code>{" "}
            if the session cookie is absent. Try it while logged out
            (use the session status above to check).
          </li>
          <li>
            <strong>Locale redirect</strong> —{" "}
            <code className="font-mono bg-gray-100 rounded px-1 text-xs">/c13-route-handlers/locale-demo</code>{" "}
            redirects to the locale-prefixed path based on your{" "}
            <code className="font-mono bg-gray-100 rounded px-1 text-xs">Accept-Language</code> header.
          </li>
          <li>
            <strong>A/B rewrite</strong> —{" "}
            <code className="font-mono bg-gray-100 rounded px-1 text-xs">/c13-route-handlers/ab-test</code>{" "}
            rewrites to variant A or B transparently (URL does not change).
            A sticky cookie keeps you on the same variant.
          </li>
        </ol>
        <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
          <strong>Auth-gate pattern:</strong> The middleware checks only cookie
          PRESENCE (cheap). Full JWT verification (signature + expiry) stays
          server-side in the page via{" "}
          <code className="font-mono bg-blue-100 rounded px-0.5">getSession()</code> — because
          running heavy crypto on every static-asset request would be wasteful,
          and the Edge API surface limitations make it fragile.
        </div>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before reading the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c13-route-handlers/_meta/defend-it.md
          </code>{" "}
          first, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c13-route-handlers/</code>.
        </p>
      </section>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────

/**
 * Reads the session cookie server-side and displays auth status.
 * This is inside <Suspense> so the static shell above streams immediately.
 * Demonstrates that the same getSession() pattern works in Server Components
 * AND that the proxy.ts auth-gate is layered ON TOP of this — middleware runs
 * first, then the page's own getSession() call provides the authoritative check.
 */
async function SessionStatus() {
  const session = await getSession();

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
      <p className="text-xs text-gray-500 mb-2">
        Current session (relevant for the proxy.ts auth-gate demo):
      </p>
      {session ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Authenticated
          </span>
          <span className="text-gray-700">
            {session.user.name}{" "}
            <span className="text-gray-400">({session.user.role})</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            Not authenticated
          </span>
          <span className="text-gray-500 text-xs">
            Try visiting{" "}
            <code className="font-mono bg-gray-100 rounded px-1">/c13-route-handlers/account</code>{" "}
            — the middleware will redirect you to login.
          </span>
        </div>
      )}
    </section>
  );
}

function SessionStatusSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
    </section>
  );
}
