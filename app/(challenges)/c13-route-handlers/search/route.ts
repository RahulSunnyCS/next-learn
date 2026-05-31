// ─── app/(challenges)/c13-route-handlers/search/route.ts ─────────────────
//
// C13 — Search Route Handler (GET).
//
// Teaching focus: GET route-handler caching behaviour in Next.js 16.
//
// ── GET ROUTE HANDLER CACHING IN NEXT.JS 16 ───────────────────────────────
//
//  IN NEXT.JS 12–14: GET Route Handlers were cached by default when they
//  used the static Response API (no dynamic APIs, no request.body reads).
//  This was a common footgun: developers were surprised to find stale data
//  served from the Full Route Cache because their handler accidentally
//  qualified for static caching.
//
//  IN NEXT.JS 15+: The default changed — GET Route Handlers are NO LONGER
//  cached by default. Every invocation runs the handler function fresh.
//  This aligns with developer expectations: an API endpoint should return
//  live data unless you explicitly opt into caching.
//
//  IN NEXT.JS 16 (with cacheComponents: true): The same policy holds.
//  GET handlers are NOT cached by default. The Full Route Cache for pages
//  is now managed via the 'use cache' directive on Server Components and
//  data-accessor functions; route handlers are outside the PPR model and
//  run dynamically unless you add explicit caching.
//
//  HOW TO OPT IN to caching a GET handler in v16:
//    1. Wrap the data read in a 'use cache' function (preferred — shares
//       the cache with Server Components that call the same function).
//    2. Set response Cache-Control headers for CDN/browser caching if
//       the data is publicly cacheable and freshness requirements allow it.
//    3. Return a Response with cache headers directly:
//         return new Response(JSON.stringify(data), {
//           headers: { "Cache-Control": "public, s-maxage=60" },
//         });
//
//  HOW TO OPT IN to caching a GET handler in v14 (legacy context):
//    The handler had to use only static APIs. Reading request.url, cookies(),
//    or headers() would opt it OUT automatically. The footgun was that a
//    handler that looked static (no dynamic reads) was silently cached.
//
//  THE v16 FOOTGUN in reverse:
//    If you migrate from v14 and relied on implicit caching, your handler
//    now runs fresh on every request. This is correct behaviour but may
//    increase data-source load if you have not added explicit 'use cache'
//    guards on the data-accessor functions.
//
// ── THIS HANDLER ─────────────────────────────────────────────────────────
//
//  This handler reads the URL searchParams — a dynamic API — so it would
//  never have been cached even under the old v14 rules. It runs fresh on
//  every request, which is correct for a search endpoint (results must
//  reflect the current state of the product catalogue).
//
//  We do NOT add Cache-Control headers here because search results are
//  per-query and personalisation is possible in future. If you wanted to
//  add basic caching for identical queries, you could wrap searchProducts()
//  in 'use cache' with a query-specific cacheTag.

import { NextRequest, NextResponse } from "next/server";
import { parseSearchOptions, searchProducts } from "../_lib/search";

/**
 * GET /c13-route-handlers/search?q=...&limit=...
 *
 * Returns JSON: { results: SearchResult[], total: number, query: string }
 *
 * Query parameters:
 *   q      — full-text search string (optional; omit to list all products)
 *   limit  — max results (1–50, default 10)
 *
 * Responses:
 *   200 — search succeeded (empty results array is still 200)
 *   400 — invalid query parameters (error message in JSON body)
 *   500 — unexpected server error (generic message, no internals leaked)
 *
 * Security decisions:
 *   - Input validation is delegated to parseSearchOptions() which validates
 *     all params before use — no raw user input is used unvalidated.
 *   - Errors are returned as typed JSON, never as HTML or stack traces.
 *   - No authentication required for the public product search API.
 *   - The response does not include sensitive fields (sellerId, internal IDs
 *     beyond the product slug, stock count) — see SearchResult in _lib/search.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Extract query parameters from the URL.
  // NextRequest.nextUrl.searchParams is the standard Web API URLSearchParams.
  const { searchParams } = request.nextUrl;

  // Validate and sanitise the parameters before touching the data layer.
  const { opts, error } = parseSearchOptions(searchParams);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const data = await searchProducts(opts);
    // Return JSON with standard Content-Type header (NextResponse.json sets
    // Content-Type: application/json automatically).
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    // Catch unexpected errors from the data layer (e.g. if the in-memory
    // store is in a broken state). We log the error server-side but return
    // only a generic message to the client — never leak stack traces or
    // internal state.
    console.error("[c13/search] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Why no POST / PATCH / DELETE export? ─────────────────────────────────
//
// Only the methods you export from a Route Handler are active. Omitting POST
// causes Next.js to return 405 Method Not Allowed automatically. This is the
// correct approach — explicitly allow only what you intend to support.
