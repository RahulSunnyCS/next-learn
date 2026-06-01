// ─── app/(challenges)/c20-deployment/page.tsx ──────────────────────────────
//
// C20 — Deployment & Runtime Model.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a STATIC SHELL.  All content is static (educational text and
//   tables).  There is no per-request dynamic data — no cookies, no searchParams,
//   no uncached repo calls.  The page therefore prerenders completely at build time
//   and is served as ○ (Static) from the CDN.  No <Suspense> hole is needed.
//
//   Key rules followed:
//   - NO `export const dynamic` (incompatible with cacheComponents).
//   - NO `export const revalidate` (superseded by 'use cache').
//   - NO `export const runtime = 'edge'` (incompatible with cacheComponents —
//     this is the gotcha this very challenge teaches).
//   - All JSX text with special characters uses escape entities or JSX expressions.
//
// WHAT THIS PAGE TEACHES:
//   Maps each Next.js rendering symbol (○ / ◐ / ƒ) to the infrastructure
//   tier where code physically runs.  Explains what breaks under output:'export',
//   how output:'standalone' enables Docker, and the tradeoffs between serverless,
//   edge, and Node.js standalone runtimes.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "C20 — Deployment & Runtime Model",
};

// ---------------------------------------------------------------------------
// Page (fully static shell — no dynamic holes needed)
// ---------------------------------------------------------------------------

export default function C20DeploymentPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-sky-500 mb-1">c20-deployment</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Deployment &amp; Runtime Model: Where Does Your Code Actually Run?
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Every route in a Next.js app has a rendering strategy. That strategy
          determines{" "}
          <em>where</em> code executes — at build time on a CI machine, at
          request time in a serverless function, at an edge node near the user,
          or not at all (pre-built HTML served from a CDN).  Understanding this
          map is essential before choosing a deployment target.
        </p>
      </div>

      {/* ── Section 1: Rendering → Infrastructure Map ───────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Rendering Strategy → Infrastructure Tier
        </h2>
        <p className="text-sm text-gray-600">
          The build output shows three symbols for each route.  Each symbol maps
          to a different runtime tier.  The table below uses real routes from
          this repository.
        </p>

        {/* Build symbol legend */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Build symbols
          </p>
          <ul className="text-sm space-y-1">
            <li>
              <span className="font-mono font-bold text-green-700">○ Static</span>
              {" "}— fully prerendered at build time; served as raw HTML from a CDN or
              static file host. Zero server compute per request.
            </li>
            <li>
              <span className="font-mono font-bold text-blue-700">◐ Partial Prerender</span>
              {" "}— static shell prerendered at build time (CDN-cacheable); dynamic
              holes streamed from a serverless/edge function per request.
            </li>
            <li>
              <span className="font-mono font-bold text-amber-700">ƒ Dynamic</span>
              {" "}— fully server-rendered on every request; runs in a serverless
              function or a Node.js server process. Nothing is CDN-cached at the
              HTML level.
            </li>
          </ul>
        </div>

        {/* Route → infra table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Route</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Challenge</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Symbol</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Build-time work</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Request-time work</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Infra tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/c02-catalog-ssg-isr</td>
                <td className="px-4 py-2 text-gray-600">C02</td>
                <td className="px-4 py-2 font-mono font-bold text-green-700">○</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Static shell HTML; product grid in Suspense fetched via{" "}
                  <code className="bg-gray-100 rounded px-1">cacheLife(&apos;hours&apos;)</code>
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  ISR revalidation in background when cache is stale
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  CDN (shell) + serverless (ISR revalidation)
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/c02-catalog-ssg-isr/[slug]</td>
                <td className="px-4 py-2 text-gray-600">C02</td>
                <td className="px-4 py-2 font-mono font-bold text-green-700">○</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  One HTML file per slug via{" "}
                  <code className="bg-gray-100 rounded px-1">generateStaticParams</code>
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  ISR revalidation; unknown slugs hit server on demand
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  CDN (known slugs) + serverless (on-demand + ISR)
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/c03-product-ppr/[slug]</td>
                <td className="px-4 py-2 text-gray-600">C03</td>
                <td className="px-4 py-2 font-mono font-bold text-blue-700">◐</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Product shell (name, price, image) from{" "}
                  <code className="bg-gray-100 rounded px-1">&apos;use cache&apos;</code>{" "}
                  function
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Live inventory, recommendations, reviews streamed per request
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  CDN (static shell) + serverless/edge (dynamic holes)
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/c01-auth</td>
                <td className="px-4 py-2 text-gray-600">C01</td>
                <td className="px-4 py-2 font-mono font-bold text-blue-700">◐</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Page header, explainer sections prerendered
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Session cookie read inside Suspense hole (per-user, not cacheable)
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  CDN (static shell) + serverless (session hole)
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/api/... (c13)</td>
                <td className="px-4 py-2 text-gray-600">C13</td>
                <td className="px-4 py-2 font-mono font-bold text-amber-700">ƒ</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Handler code bundled; no HTML prerender
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Full handler function runs per request
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Serverless function or Node.js server
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">/c11-server-actions</td>
                <td className="px-4 py-2 text-gray-600">C11</td>
                <td className="px-4 py-2 font-mono font-bold text-amber-700">ƒ</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Server Action stubs bundled
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Mutation handler runs per form submit; cache invalidated via{" "}
                  <code className="bg-gray-100 rounded px-1">revalidateTag</code>
                </td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  Serverless function (mutations require a server)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Section 2: output:'export' — what breaks ────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <code className="bg-gray-100 rounded px-2 py-0.5 text-base font-mono">
            output: &apos;export&apos;
          </code>
          {" "}— Pure Static: What Breaks and Why
        </h2>
        <p className="text-sm text-gray-600">
          Setting{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">output: &apos;export&apos;</code>{" "}
          in{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">next.config.ts</code>{" "}
          tells Next.js to produce a directory of static files (HTML + assets) with
          no server process.  This is the right choice for a purely static site
          (marketing landing page, documentation site) but the wrong choice for most
          product apps.  Every feature below requires a running server.
        </p>

        <div className="rounded-xl border border-red-100 bg-red-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-800 uppercase tracking-wide">
            Features unavailable under output:&apos;export&apos;
          </p>
          <ul className="space-y-2 text-sm text-red-800">
            <li>
              <strong>Route Handlers</strong>{" "}
              (<code className="bg-red-100 rounded px-1 font-mono text-xs">/app/api/**/route.ts</code>
              ) — These are server functions.  A static file host has no mechanism
              to run JavaScript on a request.  Build fails if any Route Handler exists.
            </li>
            <li>
              <strong>Server Actions</strong> — Server Actions require a POST endpoint
              that executes on the server.  Without a server, form submissions and
              mutations cannot be handled.
            </li>
            <li>
              <strong>ISR / cacheLife revalidation</strong> — ISR requires a background
              server process to detect stale cache entries and regenerate them.  In a
              static export there is no server; data is forever frozen at build time.
            </li>
            <li>
              <strong>on-demand revalidation</strong>{" "}
              (<code className="bg-red-100 rounded px-1 font-mono text-xs">revalidateTag / revalidatePath</code>
              ) — These call back into the Next.js cache infrastructure at runtime.
              No server = no cache infrastructure = these calls cannot happen.
            </li>
            <li>
              <strong>Partial Prerender (PPR / cacheComponents)</strong> — PPR streams
              dynamic holes from a server function after the static shell is delivered.
              There is no server to stream from in a static export.  All{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">◐</code>
              {" "}routes must become{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">○</code>
              {" "}or be removed.
            </li>
            <li>
              <strong>Dynamic route segments without generateStaticParams</strong> —
              A route like{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">/product/[slug]</code>
              {" "}requires either a static list of slugs (via{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">generateStaticParams</code>
              ) or a running server.  Without a list, the build fails with
              {" "}&quot;Page could not be rendered statically&quot;.
            </li>
            <li>
              <strong>Per-request cookies and headers</strong> — Reading{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">cookies()</code>
              {" "}or{" "}
              <code className="bg-red-100 rounded px-1 font-mono text-xs">headers()</code>
              {" "}at request time is impossible without a request.  Auth, session, and
              personalisation features break.
            </li>
          </ul>
        </div>

        <p className="text-sm text-gray-600">
          The reference config variant is at{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">solutions/c20-deployment/next.config.export.ts</code>.
          {" "}It documents every incompatibility with inline comments.  Use it as a
          reference when explaining trade-offs — never as a replacement for the
          canonical{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">next.config.ts</code>.
        </p>
      </section>

      {/* ── Section 3: output:'standalone' for Docker ───────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          <code className="bg-gray-100 rounded px-2 py-0.5 text-base font-mono">
            output: &apos;standalone&apos;
          </code>
          {" "}— Self-Contained Server for Docker
        </h2>
        <p className="text-sm text-gray-600">
          The default Next.js build produces a{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">.next/</code>
          {" "}directory that requires{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">node_modules/</code>
          {" "}alongside it to start.  That means copying hundreds of megabytes of
          packages into a Docker image.{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">output: &apos;standalone&apos;</code>
          {" "}runs a tree-shake at build time and produces a self-contained{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">.next/standalone/</code>
          {" "}directory that includes only the modules actually imported.
        </p>

        <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
            How standalone works
          </p>
          <ol className="space-y-2 text-sm text-sky-800 list-decimal list-inside">
            <li>
              <strong>next build</strong> with{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">output: &apos;standalone&apos;</code>
              {" "}traces which files from{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">node_modules/</code>
              {" "}are reachable from any imported module.
            </li>
            <li>
              Copies only those files into{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">.next/standalone/</code>
              {" "}alongside a minimal{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">server.js</code>
              {" "}entry point.
            </li>
            <li>
              The Docker image copies{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">.next/standalone/</code>
              {" "}and{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">.next/static/</code>
              {" "}only.  No full{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">node_modules/</code>
              {" "}needed in the image.  Typical image shrinks from 2GB → 200MB.
            </li>
            <li>
              Container starts with{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">node server.js</code>
              {" "}— no{" "}
              <code className="bg-sky-100 rounded px-1 font-mono text-xs">next start</code>
              {" "}binary required.
            </li>
          </ol>
        </div>

        <p className="text-sm text-gray-600">
          The reference config variant is at{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">solutions/c20-deployment/next.config.standalone.ts</code>{" "}
          and the multi-stage Dockerfile is at{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">solutions/c20-deployment/Dockerfile</code>.
        </p>
      </section>

      {/* ── Section 4: Serverless vs Edge vs Node Standalone ────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Serverless vs Edge vs Node Standalone — Tradeoffs
        </h2>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Dimension</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Edge (V8 isolate)</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Node serverless (Lambda)</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Node standalone (Docker)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Cold start</td>
                <td className="px-3 py-2 text-gray-600">&lt;5ms (isolate)</td>
                <td className="px-3 py-2 text-gray-600">100–600ms (Node boot)</td>
                <td className="px-3 py-2 text-gray-600">None (persistent process)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Geo-distribution</td>
                <td className="px-3 py-2 text-gray-600">Global CDN PoPs</td>
                <td className="px-3 py-2 text-gray-600">Configured regions</td>
                <td className="px-3 py-2 text-gray-600">Where you deploy the container</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">API surface</td>
                <td className="px-3 py-2 text-gray-600">Web APIs only (no fs, Buffer, native addons)</td>
                <td className="px-3 py-2 text-gray-600">Full Node.js</td>
                <td className="px-3 py-2 text-gray-600">Full Node.js</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Bundle size limit</td>
                <td className="px-3 py-2 text-gray-600">4MB (Vercel free) / 250MB (pro)</td>
                <td className="px-3 py-2 text-gray-600">50MB+ (varies)</td>
                <td className="px-3 py-2 text-gray-600">None (Docker image)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Execution timeout</td>
                <td className="px-3 py-2 text-gray-600">~30s</td>
                <td className="px-3 py-2 text-gray-600">Minutes (configurable)</td>
                <td className="px-3 py-2 text-gray-600">None (persistent)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">ISR cache storage</td>
                <td className="px-3 py-2 text-gray-600">Platform KV / not available</td>
                <td className="px-3 py-2 text-gray-600">Platform KV (Vercel) or ephemeral</td>
                <td className="px-3 py-2 text-gray-600">Local filesystem (per container)</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">cacheComponents / PPR</td>
                <td className="px-3 py-2 text-gray-600 text-red-600">
                  Incompatible —{" "}
                  <code className="bg-gray-100 rounded px-0.5">runtime=&apos;edge&apos;</code>
                  {" "}export fails build
                </td>
                <td className="px-3 py-2 text-gray-600">Fully supported</td>
                <td className="px-3 py-2 text-gray-600">Fully supported</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Best for</td>
                <td className="px-3 py-2 text-gray-600">Auth gates, redirects, A/B, geo routing</td>
                <td className="px-3 py-2 text-gray-600">Most app routes, API handlers</td>
                <td className="px-3 py-2 text-gray-600">Full control, CPU-intensive, long-running</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* v16 gotcha callout */}
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
            v16 gotcha: export const runtime = &apos;edge&apos; breaks cacheComponents
          </p>
          <p className="text-sm text-amber-800">
            In Next.js 16,{" "}
            <code className="bg-amber-100 rounded px-1 font-mono text-xs">export const runtime = &apos;edge&apos;</code>
            {" "}on any route segment (page or Route Handler) is{" "}
            <strong>incompatible with <code className="bg-amber-100 rounded px-1 font-mono text-xs">cacheComponents: true</code></strong>.
            The build fails with{" "}
            &quot;Route segment config &apos;runtime&apos; is not compatible with cacheComponents&quot;.
            Per-route runtime selection is a DEPLOYMENT-level concern when cacheComponents is
            enabled — you configure the runtime in your deploy platform (Vercel, Fly.io, etc.)
            rather than in code.  Teach Edge concepts (Web-API-only surface, cold starts,
            geo headers) without the{" "}
            <code className="bg-amber-100 rounded px-1 font-mono text-xs">runtime</code>
            {" "}export, and note this incompatibility clearly.
          </p>
        </div>
      </section>

      {/* ── Section 5: Turbopack as default bundler ──────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Turbopack: the Default Bundler in Next.js 16
        </h2>
        <p className="text-sm text-gray-600">
          Next.js 16 ships Turbopack as the default bundler for{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">next dev</code>.
          Turbopack is written in Rust and is incrementally compiled — it only
          rebuilds the module-graph subgraph affected by a change.
        </p>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 text-sm text-gray-700">
          <p className="font-medium">Key differences vs Webpack:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>
              <strong>Incremental HMR:</strong> Only the changed module and its
              dependants are recompiled.  Large apps see sub-second HMR vs 5–20s
              with Webpack.
            </li>
            <li>
              <strong>Lazy bundling in dev:</strong> Only routes visited in the
              browser are compiled.  A 200-route app starts instantly; Webpack
              compiles the full graph upfront.
            </li>
            <li>
              <strong>Production builds:</strong> Still use Webpack by default in
              v16 (Turbopack production is opt-in stable).  Custom{" "}
              <code className="bg-gray-100 rounded px-1 font-mono text-xs">webpack()</code>
              {" "}callbacks in{" "}
              <code className="bg-gray-100 rounded px-1 font-mono text-xs">next.config.ts</code>
              {" "}must be ported to{" "}
              <code className="bg-gray-100 rounded px-1 font-mono text-xs">turbo.rules</code>
              {" "}to use Turbopack for production.
            </li>
            <li>
              <strong>No webpack-specific plugins:</strong> Turbopack has its own
              transform API.  Plugins that depend on Webpack&apos;s internal plugin
              system (e.g. custom{" "}
              <code className="bg-gray-100 rounded px-1 font-mono text-xs">NormalModuleReplacementPlugin</code>
              {" "}usage) require a Turbopack-native equivalent.
            </li>
          </ul>
        </div>
      </section>

      {/* ── Section 6: ISR at the infra level ───────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          ISR / cacheComponents at the Infrastructure Level
        </h2>
        <p className="text-sm text-gray-600">
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">&apos;use cache&apos;</code>
          {" "}+{" "}
          <code className="bg-gray-100 rounded px-1 font-mono text-xs">cacheLife(&apos;hours&apos;)</code>
          {" "}is the v16 way to declare ISR at the data-function level.  But where
          the cache entries are STORED depends on your deployment target — and that
          affects correctness in a horizontally-scaled system.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Deployment target</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Cache storage location</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Multi-instance behaviour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Vercel</td>
                <td className="px-3 py-2 text-gray-600">Vercel&apos;s distributed KV (edge network)</td>
                <td className="px-3 py-2 text-gray-600">
                  Invalidation propagates globally. All instances see fresh data.
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Docker standalone (single container)</td>
                <td className="px-3 py-2 text-gray-600">
                  Local filesystem (<code className="bg-gray-100 rounded px-0.5">.next/cache/</code>)
                </td>
                <td className="px-3 py-2 text-gray-600">
                  Works correctly for a single instance.
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">Docker standalone (multiple replicas)</td>
                <td className="px-3 py-2 text-gray-600">Each replica has its own local filesystem</td>
                <td className="px-3 py-2 text-gray-600">
                  <strong className="text-red-700">Problem:</strong> revalidateTag() invalidates only
                  ONE replica&apos;s cache. Others serve stale until natural expiry.
                  Fix: shared NFS/EFS volume or Redis cache handler.
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-700">
                  <code className="bg-gray-100 rounded px-0.5">output:&apos;export&apos;</code>
                </td>
                <td className="px-3 py-2 text-gray-600">None — static HTML frozen at build time</td>
                <td className="px-3 py-2 text-gray-600">
                  No ISR. Data updates require a full rebuild and redeploy.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Defend-It reminder ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c20-deployment/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c20-deployment/</code>.
        </p>
      </section>

    </div>
  );
}
