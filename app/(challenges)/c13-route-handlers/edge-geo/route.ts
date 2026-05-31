// ─── app/(challenges)/c13-route-handlers/edge-geo/route.ts ───────────────
//
// C13 — Edge-runtime Route Handler demonstrating the restricted API surface.
//
// RUNTIME DECLARATION:
//   export const runtime = 'edge' tells Next.js to run this handler in the
//   Edge runtime instead of the default Node.js runtime.
//   This is the ONLY per-route config export allowed under cacheComponents:true —
//   it selects the runtime, it is NOT a dynamic-control directive.

export const runtime = "edge";

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
  /** Runtime confirmation (always "edge" from this handler). */
  runtime: "edge";
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
    runtime: "edge",
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
// NODE RUNTIME CONTRAST (what this would look like with Node runtime):
//
// If you removed `export const runtime = 'edge'`, this handler would run
// in Node.js. The code above works in both runtimes — Web APIs are a
// subset of what Node provides. But in Node you could ALSO do:
//
//   import { createHmac, randomBytes } from 'crypto';  // Node crypto module
//   import { readFileSync } from 'fs';                 // File system access
//   import { gzip } from 'zlib';                       // Compression streams
//
// Key differences in a Node handler:
//   - crypto.randomBytes(16).toString('hex') instead of getRandomValues()
//   - Buffer.from(bytes).toString('hex') for byte-to-hex conversion
//   - Can use any npm package that depends on Node built-ins (e.g. sharp for
//     image processing, csv-parse, xml2js, etc.)
//   - Can read local files: readFileSync('./data.json')
//
// In practice, most Route Handlers should run on Node unless you specifically
// need the low-latency global distribution of Edge. The restricted API surface
// is a real constraint that can break packages silently if they depend on Node
// built-ins.
