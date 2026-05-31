// ─── app/(challenges)/c13-route-handlers/edge-geo/route.ts ───────────────
//
// C13 — Edge-style Route Handler demonstrating the restricted Web-API surface.
//
// ── v16 GOTCHA: `export const runtime` IS INCOMPATIBLE WITH cacheComponents ─
//
//   In Next.js 16 with `cacheComponents: true` (Cache Components / PPR mode),
//   the per-route `export const runtime = 'edge'` config export is FORBIDDEN.
//   The build fails with:
//     "Route segment config 'runtime' is not compatible with nextConfig.cacheComponents"
//
//   Why? Cache Components enforces a unified static-shell + streaming-dynamic
//   model over the whole app. Per-route runtime overrides conflict with the
//   framework's ability to prerender and stream route shells consistently.
//
// ── REAL-WORLD IMPLICATION ────────────────────────────────────────────────
//
//   Under cacheComponents: true, runtime selection is a DEPLOYMENT-LEVEL
//   concern, not a per-route code concern. You tell your hosting platform
//   (Vercel, Cloudflare, AWS) which routes should run at Edge via their own
//   config (e.g. Vercel's vercel.json `functions` key or framework preset),
//   NOT via `export const runtime` in route files.
//
//   This is a deliberate v16 architectural decision: the app code stays
//   portable and runtime-agnostic; deployment targets are configured
//   outside the app.
//
// ── WHAT THIS HANDLER TEACHES ─────────────────────────────────────────────
//
//   This handler runs on the DEFAULT Node.js runtime but demonstrates the
//   Edge-compatible coding patterns — using only Web APIs that work on both
//   Node and Edge runtimes. The handler would work unchanged if deployed to
//   an Edge runtime via the deployment platform config.
//
//   See the deployment challenge for how to configure Edge routes at the
//   platform level under cacheComponents.
//
// ─────────────────────────────────────────────────────────────────────────
//
// EDGE RUNTIME — WHAT IS AVAILABLE AND WHAT IS NOT
//
// The Edge runtime is a lightweight JavaScript environment designed to run
// at CDN PoPs (Points of Presence) close to the user. It is based on the
// WinterCG / Web Platform APIs subset, not the full Node.js API surface.
//
// ── AVAILABLE IN EDGE ─────────────────────────────────────────────────────
//
//   Web Fetch API          : fetch(), Request, Response, Headers
//   Web Crypto             : crypto.subtle (SubtleCrypto — async, WC3 spec)
//                            crypto.getRandomValues()
//   URL / URLSearchParams  : URL, URLSearchParams
//   Encoding               : TextEncoder, TextDecoder
//   Streams                : ReadableStream, WritableStream, TransformStream
//   AbortController        : AbortController, AbortSignal
//   Web Storage (Vercel)   : kv (Vercel KV — not standard, platform-specific)
//   Geolocation headers    : Injected by the CDN/platform into request headers
//                            (e.g. Vercel, Cloudflare — not a browser geo API)
//   Timers                 : setTimeout, queueMicrotask (limited)
//   Console                : console.log, console.error, etc.
//
// ── NOT AVAILABLE IN EDGE ─────────────────────────────────────────────────
//
//   ❌ fs / path / os / child_process — Node.js built-in modules entirely
//      absent. Cannot read files, spawn processes, or interact with the OS.
//
//   ❌ Buffer — Node.js Buffer class is not available. Use Uint8Array and
//      TextEncoder/TextDecoder for byte manipulation instead.
//
//   ❌ process.env (partial) — In some platforms process.env is available for
//      build-time environment variables, but process itself is not the full
//      Node.js process object. On Vercel Edge Functions, env vars are
//      available via process.env, but not all Node process APIs are.
//
//   ❌ require() / CommonJS — Edge only supports ESM. No require(), no
//      module.exports.
//
//   ❌ crypto (Node module) — The Node.js `crypto` module is unavailable.
//      Use the Web Crypto API (crypto.subtle) instead. Note: HMAC signing with
//      Web Crypto requires async operations (SubtleCrypto.sign() is a Promise).
//
//   ❌ http / https / net / tls — No Node TCP/HTTP stack. All outbound
//      requests go through the Web Fetch API.
//
//   ❌ setTimeout with long durations — Edge functions have a wall-clock
//      execution limit (typically 30s on Vercel). Long-running computation
//      is not appropriate for Edge.
//
//   ❌ Dynamic require / eval — Code must be statically analysable at build
//      time. Dynamic import() is supported but evaluated at bundle time.
//
// ── COLD START TRADEOFFS ──────────────────────────────────────────────────
//
//   Edge functions have FASTER cold starts than Node.js Lambda/serverless
//   functions — typically <1ms vs. 100–500ms for Node. This is because:
//
//     1. The Edge runtime is a smaller JS isolate (no V8 snapshots needed).
//     2. Edge functions boot at PoP locations already pre-warmed.
//     3. No Node.js module loading overhead (no require() tree).
//
//   TRADEOFFS:
//     ✓ Fast cold start (better for latency-sensitive endpoints)
//     ✓ Globally distributed (runs near the user)
//     ✗ Restricted API surface (cannot use Node built-ins)
//     ✗ Bundle size limits (Vercel: 4MB on free tier, 250MB on pro)
//     ✗ No long-running tasks (wall-clock timeout ~30s)
//     ✗ More expensive at high volume (per-invocation vs. always-on Node server)
//
//   NODE RUNTIME TRADEOFFS (for contrast):
//     ✓ Full Node.js API surface (fs, crypto, Buffer, etc.)
//     ✓ Compatible with any npm package
//     ✓ Better for CPU-intensive tasks (no size/time limits in most hosts)
//     ✗ Slower cold start (100–500ms) for Lambda/serverless
//     ✗ Runs in one or a few regions (higher latency for distant users)
//
//   RECOMMENDATION: Use Edge for low-latency, globally distributed handlers
//   with simple logic (auth checks, redirects, feature flags, simple JSON).
//   Use Node for complex data processing, file system access, large npm deps,
//   or CPU-bound work.
//
// ── GEOLOCATION AT EDGE ───────────────────────────────────────────────────
//
//   Real geolocation data is injected by the CDN/platform as request headers
//   BEFORE the Edge function receives the request. This handler demonstrates
//   reading those headers. The actual values depend on the deployment platform:
//
//   Vercel:
//     x-vercel-ip-country        : ISO 3166-1 alpha-2 country code (e.g. "US")
//     x-vercel-ip-country-region : Region/state code (e.g. "CA" for California)
//     x-vercel-ip-city           : City name (URL-encoded, e.g. "San%20Francisco")
//     x-vercel-ip-latitude       : Latitude (string, e.g. "37.7749")
//     x-vercel-ip-longitude      : Longitude (string, e.g. "-122.4194")
//
//   Cloudflare Workers:
//     cf-ipcountry               : ISO 3166-1 alpha-2 country code
//     The `cf` object in the request (platform-specific, not standard)
//
//   In local development (no CDN), these headers are absent and we return
//   sensible fallback values.
//
//   LOCALE from headers:
//     accept-language            : Standard browser header (e.g. "en-US,en;q=0.9")
//     Not a platform injection — sent by every browser automatically.

import { NextRequest, NextResponse } from "next/server";

/** Shape of the response body from this handler. */
interface GeoResponse {
  /** ISO 3166-1 alpha-2 country code, or null if not available. */
  country: string | null;
  /** Sub-region / state code, or null if not available. */
  region: string | null;
  /** City name (decoded), or null if not available. */
  city: string | null;
  /** Primary locale negotiated from Accept-Language, or null if absent. */
  locale: string | null;
  /** Latitude string, or null if not available. */
  lat: string | null;
  /** Longitude string, or null if not available. */
  lon: string | null;
  /** Which platform's headers were detected (for debugging). */
  source: "vercel" | "cloudflare" | "local";
  /**
   * Runtime confirmation for demo purposes.
   * Under cacheComponents:true this handler runs on the default Node.js
   * runtime, but the code uses only Edge-compatible Web APIs — the value
   * here documents which coding style was used, not the actual runtime
   * selected by the deployment platform.
   */
  runtime: "edge" | "nodejs";
  /** Demo: Web Crypto is available at Edge — shows a random hex token. */
  demoToken: string;
}

/**
 * GET /c13-route-handlers/edge-geo
 *
 * Returns geolocation and locale information read from request headers.
 * Runs on the Edge runtime — demonstrates the Web-APIs-only API surface.
 *
 * Security decisions:
 *   - No auth required: this endpoint returns geo data for the current
 *     request only — it is not a lookup service for arbitrary IPs.
 *   - City name is URL-decoded from the header value — safe because we
 *     only call decodeURIComponent, which cannot cause injection.
 *   - The demoToken is generated with crypto.getRandomValues() (Web Crypto,
 *     available at Edge) — this also proves Edge crypto works without Buffer.
 */
export async function GET(request: NextRequest): Promise<Response> {
  // ── Read platform-injected geolocation headers ───────────────────────────
  //
  // We use request.headers.get() — the standard Web Fetch API.
  // We could also use request.geo on Vercel, but reading raw headers is
  // more portable and works on any platform that injects them.

  const h = request.headers;

  // Detect which platform we're running on based on which headers are present.
  const isVercel = h.has("x-vercel-ip-country");
  const isCloudflare = h.has("cf-ipcountry");

  let country: string | null = null;
  let region: string | null = null;
  let city: string | null = null;
  let lat: string | null = null;
  let lon: string | null = null;
  let source: "vercel" | "cloudflare" | "local" = "local";

  if (isVercel) {
    source = "vercel";
    country = h.get("x-vercel-ip-country");
    region = h.get("x-vercel-ip-country-region");
    const rawCity = h.get("x-vercel-ip-city");
    // City names are URL-encoded in Vercel headers (spaces → %20 etc.).
    // Decode safely — decodeURIComponent is a standard Web API available at Edge.
    city = rawCity ? safeDecodeURIComponent(rawCity) : null;
    lat = h.get("x-vercel-ip-latitude");
    lon = h.get("x-vercel-ip-longitude");
  } else if (isCloudflare) {
    source = "cloudflare";
    country = h.get("cf-ipcountry");
    // Cloudflare does not inject city/region by default in the free tier.
    // The `cf` object is available in the request on Cloudflare Workers
    // but is Cloudflare-specific and not part of the standard Web API.
    region = null;
    city = null;
  }

  // ── Read locale from Accept-Language header ───────────────────────────────
  //
  // This is a standard browser header — present regardless of platform.
  // We extract only the primary language tag (e.g. "en" from "en-US,en;q=0.9").

  const acceptLanguage = h.get("accept-language");
  const locale = acceptLanguage
    ? acceptLanguage.split(",")[0].trim().split(";")[0].trim()
    : null;

  // ── Demo: Web Crypto at Edge ───────────────────────────────────────────────
  //
  // crypto.getRandomValues() is available at Edge (Web Crypto).
  // crypto.subtle (SubtleCrypto) is also available for HMAC, AES, etc.
  // The Node.js `crypto` module is NOT available — you must use Web Crypto.
  //
  // This generates a 16-byte random token and encodes it as hex — the same
  // operation you would use to generate a CSRF token or a nonce.

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert Uint8Array to hex string without Buffer (not available at Edge).
  // Array.from + map + join is the Web-API-compatible pattern.
  const demoToken = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const body: GeoResponse = {
    country,
    region,
    city,
    locale,
    lat,
    lon,
    source,
    // Under cacheComponents:true we run on the Node.js runtime.
    // The code uses only Edge-compatible Web APIs to demonstrate portability.
    // To actually deploy on Edge, configure the runtime at the platform level
    // (e.g. vercel.json) — not via `export const runtime` (incompatible with
    // cacheComponents, see comment at top of file).
    runtime: "nodejs",
    demoToken,
  };

  // Return a standard Web API Response (not NextResponse) to prove that
  // the standard Response constructor works at Edge without any Next.js
  // helper.
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // No caching — geo data is per-request and per-user.
      "Cache-Control": "no-store",
    },
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────

/**
 * Safely decodes a URL-encoded string, returning the original string if
 * decoding fails. Available at Edge (standard JavaScript global function).
 */
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

// ─────────────────────────────────────────────────────────────────────────
//
// NODE RUNTIME vs. EDGE RUNTIME (coding comparison):
//
// This handler currently runs on Node.js (the default runtime under
// cacheComponents:true — see the top-of-file note about why
// `export const runtime = 'edge'` is removed).
//
// The code above is written using ONLY Web APIs, so it would work unchanged
// if the deployment platform routes this handler to Edge. This is the v16
// recommended pattern: write portable Web-API-first code; let the deployment
// config decide the runtime.
//
// If you were writing Node-specific code, you could also use:
//
//   import { createHmac, randomBytes } from 'crypto';  // Node crypto module
//   import { readFileSync } from 'fs';                 // File system access
//   import { gzip } from 'zlib';                       // Compression streams
//
// Key coding differences in a Node-only handler (not needed here, shown for contrast):
//   - crypto.randomBytes(16).toString('hex') instead of getRandomValues()
//   - Buffer.from(bytes).toString('hex') for byte-to-hex conversion
//   - Can use any npm package that depends on Node built-ins (e.g. sharp for
//     image processing, csv-parse, xml2js, etc.)
//   - Can read local files: readFileSync('./data.json')
//
// In practice, most Route Handlers should use the default (Node) runtime.
// Use Edge only when you specifically need low-latency global distribution
// for a simple, stateless handler — and configure the runtime at the platform
// level, not via `export const runtime`.
