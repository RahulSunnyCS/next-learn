// ─── app/(challenges)/c21-testing/page.tsx ────────────────────────────────
//
// C21 — Testing Next.js: RSC, Server Actions, Route Handlers, and E2E.
//
// CACHE COMPONENTS PATTERN (Next.js 16, cacheComponents: true):
//   This page is a STATIC SHELL — no dynamic data is read at the route level.
//   All content is statically renderable (no cookies, no headers, no uncached
//   data reads). There is NO <Suspense> hole needed here because the page is
//   pure educational content.
//
//   Per the cacheComponents rules:
//   - NO `export const dynamic` (incompatible with cacheComponents).
//   - NO `export const revalidate` (incompatible with cacheComponents).
//   - All text content is static — the route will appear as ○ (Static) in
//     the build output.
//
// Why a static shell is correct here:
//   This challenge explains testing concepts. There is no per-request user
//   data, no personalisation, and no need for streaming dynamic content.
//   A fully-static page is the optimal choice.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "C21 — Testing Next.js",
};

export default function C21TestingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c21-testing</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Testing Next.js: RSC, Server Actions, Route Handlers, and E2E
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Learn the correct testing pyramid for a Next.js 16 app. Understand
          why you cannot unit-test RSC rendering in Vitest, what you CAN
          extract and test at the unit level, and how to cover the
          runtime-dependent rendering with Playwright E2E tests.
        </p>
      </div>

      {/* ── Testing Pyramid ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-lg">
          The Next.js Testing Pyramid
        </h2>
        <div className="overflow-x-auto">
          <pre className="text-xs font-mono text-gray-700 bg-gray-50 rounded-lg p-4 leading-relaxed">
            {`     ┌─────────────────┐
     │    E2E (few)    │  Playwright — real browser, real Next.js runtime
     │   Playwright    │  Tests RSC rendering, streaming, full flows
     ├─────────────────┤
     │  Integration    │  Vitest — real Node, real data layer
     │   (medium)      │  Tests Route Handlers, Server Action contracts
     ├─────────────────┤
     │  Unit (many)    │  Vitest — pure functions, isolated logic
     │                 │  Tests formatters, validators, data accessors
     └─────────────────┘`}
          </pre>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>Unit tests (Vitest)</strong> cover extractable logic — pure
            functions and data accessors that have no dependency on the Next.js
            RSC renderer. Examples: price formatters, search option validators,
            data repository calls.
          </p>
          <p>
            <strong>Integration tests (Vitest)</strong> cover the HTTP boundary
            of Route Handlers and the call contract of Server Actions. Neither
            requires the full Next.js runtime —{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">NextRequest</code>{" "}
            and{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">NextResponse</code>{" "}
            are Web API wrappers that work in plain Node.js 18+.
          </p>
          <p>
            <strong>E2E tests (Playwright)</strong> cover RSC rendering and
            full user flows. The only way to verify that an RSC renders
            correctly is to run it in the actual Next.js RSC runtime — Playwright
            drives a real browser against the running dev server.
          </p>
        </div>
      </section>

      {/* ── Why not unit-test RSC rendering? ────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-6 space-y-4">
        <h2 className="font-semibold text-amber-900 text-lg">
          Why You Cannot Unit-Test RSC Rendering in Vitest
        </h2>

        <div className="space-y-3 text-sm text-amber-900">
          <p>
            React Server Components execute inside the{" "}
            <strong>Next.js RSC runtime</strong> — a specialised Node.js layer
            that Vitest does not replicate. Attempting to render an RSC with{" "}
            <code className="font-mono text-xs bg-amber-100 rounded px-1">
              @testing-library/react
            </code>{" "}
            in Vitest will fail for three reasons:
          </p>

          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>
              <strong>Async components return Promises, not elements.</strong>{" "}
              Plain React treats async function components as Promises.
              Testing Library cannot{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">act()</code>{" "}
              around an async component tree the way the RSC runtime does.
            </li>
            <li>
              <strong>
                <code className="font-mono text-xs bg-amber-100 rounded px-1">next/cache</code>{" "}
                throws outside the compiler.
              </strong>{" "}
              The{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">
                {`'use cache'`}
              </code>{" "}
              directive causes modules to call{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">cacheTag</code>{" "}
              and{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">cacheLife</code>{" "}
              from{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">next/cache</code>.
              Those functions throw in plain Node — the Next.js compiler stubs
              them only inside its own pipeline. You must mock them to import
              any module that uses{" "}
              <code className="font-mono text-xs bg-amber-100 rounded px-1">
                {`'use cache'`}
              </code>{" "}
              in Vitest.
            </li>
            <li>
              <strong>Suspense streaming is not simulated.</strong> The shell
              renders first; async holes stream in later. Testing Library
              collapses this into a synchronous render — you get no signal
              about streaming order or whether the shell is actually static.
            </li>
          </ol>

          <p className="font-medium">
            The fix: test the extractable logic (unit), the HTTP boundary
            (integration), and the rendered output (E2E). Do not try to render
            RSCs in Vitest.
          </p>
        </div>
      </section>

      {/* ── The three test targets ───────────────────────────────────────── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-4">
        <h2 className="font-semibold text-indigo-900 text-lg">
          The Three Test Targets
        </h2>

        <div className="space-y-4 text-sm">
          {/* RSC */}
          <div className="rounded-lg bg-white border border-indigo-100 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                RSC Logic
              </span>
              <span className="text-gray-700 font-medium">
                C03 — Product PPR
              </span>
            </div>
            <p className="text-gray-600">
              Test the extracted helpers:{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">formatPrice</code>
              {" (pure function), "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">getProductShellData</code>
              {" and "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">getCachedCategoryProducts</code>
              {" (async data accessors, mock "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">next/cache</code>
              {")."}
            </p>
            <p className="text-xs text-gray-500">
              File:{" "}
              <code className="font-mono bg-gray-50 rounded px-1">
                solutions/c21-testing/rsc.test.tsx
              </code>
            </p>
          </div>

          {/* Server Action */}
          <div className="rounded-lg bg-white border border-indigo-100 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                Server Action
              </span>
              <span className="text-gray-700 font-medium">
                C11 — Server Actions
              </span>
            </div>
            <p className="text-gray-600">
              Call{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">submitReview</code>{" "}
              directly as an async function. Test validation (multiple field
              errors), the happy path (correct{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">addReview</code>{" "}
              call + cache invalidation), and the error path (internal errors
              must not leak to the client).
            </p>
            <p className="text-xs text-gray-500">
              File:{" "}
              <code className="font-mono bg-gray-50 rounded px-1">
                solutions/c21-testing/server-action.test.ts
              </code>
            </p>
          </div>

          {/* Route Handler */}
          <div className="rounded-lg bg-white border border-indigo-100 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                Route Handler
              </span>
              <span className="text-gray-700 font-medium">
                C13 — Route Handlers
              </span>
            </div>
            <p className="text-gray-600">
              Construct a real{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">NextRequest</code>{" "}
              and call{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">GET(req)</code>{" "}
              directly. Assert 200/400 status codes, JSON shape, and that
              internal fields (
              <code className="font-mono text-xs bg-gray-100 rounded px-1">sellerId</code>
              ) are never exposed. Also test the pure{" "}
              <code className="font-mono text-xs bg-gray-100 rounded px-1">parseSearchOptions</code>{" "}
              logic directly for exhaustive edge-case coverage.
            </p>
            <p className="text-xs text-gray-500">
              File:{" "}
              <code className="font-mono bg-gray-50 rounded px-1">
                solutions/c21-testing/route-handler.test.ts
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* ── Playwright E2E ──────────────────────────────────────────────── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-lg">
          Playwright E2E — Testing What Vitest Cannot
        </h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            The E2E layer covers three RSC concerns that unit tests cannot:
          </p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>
              The RSC renders without throwing (no uncaught async errors in the
              real runtime).
            </li>
            <li>
              The rendered HTML contains the expected content (product name,
              price, reviews section).
            </li>
            <li>
              Streaming boundaries (Suspense) resolve and the dynamic content
              appears after the static shell.
            </li>
          </ol>
          <p>
            Tests are tagged for the Automation Gate:{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">@critical</code>{" "}
            (failure blocks release),{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">@functional</code>{" "}
            (important but non-blocking), and{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">@non-blocker</code>{" "}
            (informational only).
          </p>
          <p className="text-xs text-gray-500">
            File:{" "}
            <code className="font-mono bg-gray-50 rounded px-1">
              e2e/c21-key-flow.spec.ts
            </code>
          </p>
        </div>
      </section>

      {/* ── Defend-It reminder ────────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c21-testing/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c21-testing/
          </code>
          .
        </p>
      </section>
    </div>
  );
}
