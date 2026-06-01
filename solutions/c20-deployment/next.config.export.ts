// ─── solutions/c20-deployment/next.config.export.ts ─────────────────────────
//
// REFERENCE ARTIFACT — NOT the canonical config.
//
// This file demonstrates `output: 'export'` for educational purposes.
// It is intentionally placed in solutions/ and must NEVER replace or be
// confused with the repo's canonical next.config.ts at the root.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS output: 'export'?
// ─────────────────────────────────────────────────────────────────────────────
//
// `output: 'export'` instructs `next build` to produce a plain directory of
// static files — HTML, CSS, JavaScript, and static assets — with no server
// process required to serve them.
//
// Deployment target: Cloudflare Pages, GitHub Pages, S3 + CloudFront,
// Netlify (static mode), nginx/Apache serving from a directory.
//
// The output directory is `out/` by default (configurable via `distDir`).
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT BREAKS AND WHY
// ─────────────────────────────────────────────────────────────────────────────
//
// Every feature listed below requires a RUNNING SERVER PROCESS to handle
// incoming requests. A static file host has no such process — it just returns
// bytes from disk. Therefore every server-centric feature is unavailable.
//
// 1. ROUTE HANDLERS  (/app/**/route.ts files)
//    A Route Handler is a server function: it receives a Request, runs
//    JavaScript, and returns a Response. A static host cannot run JavaScript
//    on demand. Any file with `export async function GET(...)` etc. will cause
//    the build to fail with:
//      "Route handlers are not supported with `output: 'export'`."
//
// 2. SERVER ACTIONS  (`'use server'` functions called from forms/Client Components)
//    Server Actions are compiled to POST endpoint handlers on the server. The
//    browser calls them by POSTing to a generated URL. In a static export there
//    is no server to receive that POST — the action silently never runs and the
//    user's mutation is lost. Build fails with:
//      "Server Actions are not supported with `output: 'export'`."
//
// 3. ISR / cacheLife revalidation
//    Incremental Static Regeneration (whether via `export const revalidate` in
//    older Next.js or via `'use cache' + cacheLife()` in v16) requires:
//      a) A running server that receives a request and detects a stale entry.
//      b) A background re-render that writes a new cache entry.
//    A static file host does neither. The HTML written at `next build` time is
//    the ONLY HTML that will ever be served. To get fresh data you must re-run
//    `next build` and redeploy. This is appropriate for sites that update only
//    on code or content changes (e.g. a documentation site), but wrong for any
//    product page that needs hourly or per-second freshness.
//    The build does NOT fail on `cacheLife()` usage — it silently strips the
//    declarations — but the revalidation behaviour simply does not occur.
//
// 4. ON-DEMAND REVALIDATION (revalidateTag / revalidatePath)
//    These functions call into the Next.js cache infrastructure at runtime
//    (e.g., inside a Server Action after a mutation). There is no runtime
//    cache infrastructure in a static export. Calling them throws at runtime
//    or silently does nothing depending on the version.
//
// 5. PARTIAL PRERENDER / cacheComponents (◐ routes)
//    PPR works by streaming dynamic holes from a server function after the
//    static shell HTML has been sent. The server function must receive the
//    request, determine the dynamic content (session, search params, live
//    inventory), and stream it back. In a static export there is no server to
//    do this — all routes must be fully static (○) or not exist.
//    Build fails for any page that reads dynamic APIs (cookies, headers,
//    searchParams) outside a Suspense boundary OR for any page where the
//    framework detects runtime-only behaviour.
//
// 6. PER-REQUEST DYNAMIC APIS
//    `cookies()`, `headers()`, `connection()`, and `await searchParams` (when
//    used for per-request data, not for static generation) all require a live
//    request object. In a static export the "request" is a build-time
//    simulation with no real user behind it. Accessing these outside a
//    `generateStaticParams` or build-time code path causes the build to fail
//    with: "Error: cookies() is only available in Server Components during
//    server rendering, or in a Route Handler."
//
// 7. DYNAMIC ROUTES WITHOUT generateStaticParams
//    A route like `/product/[slug]/page.tsx` can only be statically exported
//    if you provide `generateStaticParams()` to enumerate every possible slug
//    at build time. If a new product is added after the build, there is no
//    HTML for it — the user gets a 404 from the static host.
//    Build fails with: "Page could not be rendered statically because it used
//    [dynamic route without generateStaticParams]."
//
// 8. MIDDLEWARE / proxy.ts (at the edge layer)
//    `proxy.ts` (formerly `middleware.ts`) runs before routing on every request.
//    In a static export, requests hit the static file host directly — there is
//    no Next.js runtime layer to intercept them. Auth gates, A/B rewrites, and
//    locale redirects defined in proxy.ts are silently skipped.
//    Build proceeds, but the middleware code is dead.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHEN output: 'export' IS THE RIGHT CHOICE
// ─────────────────────────────────────────────────────────────────────────────
//
// ✓  Marketing / landing pages where all content is authored at deploy time.
// ✓  Documentation sites (every page is known ahead of time; no user data).
// ✓  Blogs with a finite, enumerable set of posts (generateStaticParams covers all).
// ✓  Offline / bundled apps (e.g., a web app packaged inside an Electron or
//    Tauri shell that serves files from disk).
// ✓  Hosting environments that support ONLY static files (GitHub Pages).
//
// ✗  Any page that reads session cookies (auth, cart, recommendations).
// ✗  Any page with live/real-time data (inventory, prices, order status).
// ✗  Any page backed by a Route Handler or Server Action.
// ✗  Any product catalog that needs ISR (hourly price/stock updates).
//
// ─────────────────────────────────────────────────────────────────────────────
// NEXTMART REPO COMPATIBILITY UNDER output: 'export'
// ─────────────────────────────────────────────────────────────────────────────
//
// Route                       | Breaks? | Reason
// ─────────────────────────────|─────────|────────────────────────────────────
// /c01-auth                   | YES     | Reads cookies() (session hole)
// /c02-catalog-ssg-isr        | PARTIAL | Static shell survives; ISR is frozen
// /c02-catalog-ssg-isr/[slug] | PARTIAL | generateStaticParams needed; ISR frozen
// /c03-product-ppr/[slug]     | YES     | PPR dynamic holes require a server
// /c11-server-actions         | YES     | Server Actions are not supported
// /c13-route-handlers/...     | YES     | Route Handlers are not supported
// /c20-deployment             | YES     | (this page) — currently static; BUT
//                             |         | proxy.ts auth gate breaks in export
//
// Bottom line: the Nextmart app cannot be deployed with output: 'export'
// because it uses Server Actions (C11), Route Handlers (C13), session cookies
// (C01), and PPR (C03). You would need to strip all of those to get a valid
// static export — at which point it is no longer the same application.

import type { NextConfig } from "next";

// NOTE: This config deliberately omits `cacheComponents: true`.
// Under output: 'export', the Cache Components infrastructure does not run —
// including the server-side `'use cache'` store, ISR revalidation, and PPR
// streaming. Setting cacheComponents: true alongside output: 'export' would
// be misleading (the features declared do not execute).
//
// In a real static-export project you would not use cacheComponents at all.
const exportConfig: NextConfig = {
  // ── The key setting ──────────────────────────────────────────────────────
  // Produces a static `out/` directory. No server process required to run
  // the app. Host on Cloudflare Pages, GitHub Pages, S3, nginx, etc.
  output: "export",

  // ── images: unoptimized ──────────────────────────────────────────────────
  // next/image's default Image Optimization API requires a server to resize
  // and encode images on demand. In a static export there is no server.
  // Setting unoptimized: true disables the server-side optimisation and
  // uses the source URLs directly. Alternative: use a third-party image CDN
  // (Cloudinary, imgix) and configure their loader here.
  images: {
    unoptimized: true,
  },

  // ── trailingSlash ─────────────────────────────────────────────────────────
  // Many static file hosts (S3, GitHub Pages) expect /about/index.html to be
  // served at /about/. Setting trailingSlash: true makes Next.js generate
  // /about/index.html instead of /about.html so those hosts serve it correctly.
  // Omit this if your static host supports extensionless paths.
  trailingSlash: true,
};

export default exportConfig;
