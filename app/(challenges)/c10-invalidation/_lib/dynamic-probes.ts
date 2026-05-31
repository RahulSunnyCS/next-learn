/**
 * dynamic-probes.ts — C10 Challenge
 *
 * Documents and demonstrates the four built-in Next.js 16 dynamic-rendering
 * triggers. Each probe is a plain async function that returns a readable string
 * about what it found. The challenge page imports these and renders them inside
 * <Suspense> boundaries so the Cache Components build constraint is met.
 *
 * WHY EACH TRIGGER FORCES DYNAMIC RENDERING
 * ──────────────────────────────────────────
 * The Cache Components model (cacheComponents: true) precomputes a static HTML
 * shell at build time. Any read that depends on the *incoming request* cannot
 * be known at build time, so Next.js marks that component as dynamic —
 * i.e. it is computed on every request, not from a cache.
 *
 * The four triggers:
 *
 * 1. cookies()
 *    Reads the request's Cookie header. Each visitor's cookies are different
 *    (session tokens, preferences, A/B flags) so the component output can
 *    never be shared across requests. Accessing cookies() opts the nearest
 *    enclosing component into per-request dynamic rendering.
 *
 * 2. headers()
 *    Reads arbitrary request headers (User-Agent, Accept-Language, IP via
 *    X-Forwarded-For, custom CDN headers, etc.). Like cookies(), the values
 *    are per-request and cannot be precomputed.
 *
 * 3. searchParams (await searchParams in a page component)
 *    The query string (?tab=reviews&sort=new) is provided by the visitor at
 *    request time. A prerendered page cannot know what query string the user
 *    will send, so any page that reads searchParams is rendered dynamically.
 *    NOTE: searchParams is passed as a Promise by Next.js 16 and must be
 *    awaited before accessing its properties.
 *
 * 4. connection()
 *    Imported from "next/server". Calling it signals to Next.js that this
 *    component explicitly requires a live server connection — useful for
 *    WebSocket-style or streaming scenarios. It unconditionally opts the
 *    enclosing component into dynamic rendering, even if no request data is
 *    actually read.
 *
 * CACHE COMPONENTS RULE
 * ─────────────────────
 * Under cacheComponents: true, reading any of the above OUTSIDE a <Suspense>
 * boundary (i.e. at the page's top level) causes the build to fail with:
 *   "Uncached data was accessed outside of <Suspense>"
 *
 * Pattern: move each probe into its own async Server Component (or async
 * function that you render as a component) and wrap it in <Suspense>.
 * The static shell prerender works; the hole streams in on each request.
 *
 * DO NOT use `export const dynamic = 'force-dynamic'` — that directive is
 * incompatible with cacheComponents.
 */

import { cookies, headers } from "next/headers";
// connection() is exported from next/server (the edge-runtime web API bundle),
// not from next/headers. It signals to Next.js that a live server connection
// is required for this component, forcing dynamic rendering.
import { connection } from "next/server";

// ─── 1. Cookie Probe ─────────────────────────────────────────────────────────

/**
 * Reads the Cookie header and returns a human-readable summary.
 * MUST be called inside a <Suspense>-wrapped async Server Component.
 * Triggers: per-request dynamic rendering.
 */
export async function cookieProbe(): Promise<string> {
  const jar = await cookies();
  const all = jar.getAll();
  if (all.length === 0) {
    return "No cookies found on this request.";
  }
  // Only expose cookie names (never values) — values may contain session tokens.
  const names = all.map((c) => c.name).join(", ");
  return `Found ${all.length} cookie(s): ${names}`;
}

// ─── 2. Header Probe ──────────────────────────────────────────────────────────

/**
 * Reads request headers and returns a human-readable summary.
 * MUST be called inside a <Suspense>-wrapped async Server Component.
 * Triggers: per-request dynamic rendering.
 */
export async function headerProbe(): Promise<string> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "(no user-agent header)";
  const lang = h.get("accept-language") ?? "(no accept-language header)";
  return `User-Agent: ${ua.slice(0, 80)} | Accept-Language: ${lang.slice(0, 40)}`;
}

// ─── 3. SearchParams Probe ────────────────────────────────────────────────────

/**
 * Reads the page's searchParams prop. The caller passes it in because
 * searchParams is provided by Next.js as a prop to page.tsx, not obtainable
 * from a standalone import.
 *
 * MUST be called inside a <Suspense>-wrapped async Server Component.
 * Triggers: per-request dynamic rendering.
 *
 * Usage in page.tsx:
 *   async function SearchParamHole({ searchParams }: { searchParams: Promise<Record<string,string>> }) {
 *     const result = await searchParamsProbe(searchParams);
 *     return <p>{result}</p>;
 *   }
 */
export async function searchParamsProbe(
  searchParams: Promise<Record<string, string | string[] | undefined>>
): Promise<string> {
  // MUST await — Next.js 16 makes searchParams a Promise.
  const sp = await searchParams;
  const entries = Object.entries(sp);
  if (entries.length === 0) {
    return "No search params. Try adding ?tab=reviews&sort=new to the URL.";
  }
  return entries.map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(",") : (v ?? "")}`).join(" | ");
}

// ─── 4. Connection Probe ──────────────────────────────────────────────────────

/**
 * Calls connection() to signal that a live server connection is required.
 * This unconditionally opts the component into dynamic rendering even if no
 * per-request data is read.
 *
 * Use case: a component that calls a real-time API, opens a WebSocket, or
 * simply must never be served from cache (e.g. fraud/rate-limit checks).
 *
 * MUST be called inside a <Suspense>-wrapped async Server Component.
 */
export async function connectionProbe(): Promise<string> {
  // Calling connection() tells Next.js: "this component MUST run on a live
  // request — do not serve a cached or prerendered version."
  await connection();
  return `connection() was called at ${new Date().toISOString()}. This timestamp is fresh every request.`;
}
