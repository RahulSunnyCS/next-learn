// ─── solutions/c13-route-handlers/search/route.ts ────────────────────────
//
// REFERENCE SOLUTION — Search Route Handler
//
// This is the annotated reference for Part A of the C13 challenge.
// The production implementation lives at:
//   app/(challenges)/c13-route-handlers/search/route.ts
//
// Key teaching points annotated below:
//   1. GET caching behaviour in v16 vs. v14
//   2. Why we use NextResponse.json() vs. new Response()
//   3. Input validation before data access
//   4. Error boundary: 400 for user errors, 500 for unexpected errors

import { NextRequest, NextResponse } from "next/server";

// Local type definition for the reference solution.
// The production handler imports this from the colocated _lib/search.ts.
// We redefine it inline here to avoid cross-solution import paths that break
// TypeScript's module resolution when the solutions/ directory is resolved
// independently of the app/ directory.
interface SearchResponse {
  results: Array<{
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    currency: string;
    rating: number;
    image: string | null;
  }>;
  total: number;
  query: string;
}

// ── Teaching annotation: GET caching in v16 ──────────────────────────────
//
// Next.js 14 cached GET handlers that used no dynamic APIs. In v16 there is
// no implicit caching. This is a breaking change for code that relied on
// the Full Route Cache for API endpoints.
//
// To understand the difference, here are the two behaviours side by side:
//
// v14 IMPLICIT CACHING (footgun):
//   If this handler read no dynamic APIs (no cookies, headers, searchParams),
//   Next.js would cache the response at build time. Subsequent requests would
//   get the build-time snapshot even after the underlying data changed. There
//   was no `cached` label in the response — developers had to know to check.
//
// v16 DEFAULT (no caching):
//   Every GET request invokes the handler function fresh. The response is NOT
//   stored in any cache by the framework. The developer explicitly chooses
//   caching if needed.
//
// HOW TO ADD CACHING IN V16 (shown here as comments):
//
// Option 1 — 'use cache' on the data accessor (preferred):
//   async function cachedSearchProducts(opts) {
//     'use cache';
//     cacheTag(tags.products);      // invalidate when products change
//     cacheLife('minutes');          // revalidate every minute
//     return searchProducts(opts);  // same function, now cached
//   }
//   // Then in the handler:
//   const data = await cachedSearchProducts(opts);
//
// Option 2 — Cache-Control response header (for public, CDN-cacheable responses):
//   return new Response(JSON.stringify(data), {
//     status: 200,
//     headers: {
//       "Content-Type": "application/json",
//       "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
//     },
//   });
//   This tells the CDN to serve cached responses for 60s, refreshing in the
//   background for up to 30s more (stale-while-revalidate).
//   Appropriate only for public data (no user-specific content).

// ── Why NextResponse.json() vs. new Response() ───────────────────────────
//
// Both work. Differences:
//   new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } })
//     — Standard Web API. Works in Edge AND Node runtime. More portable.
//     — You must set Content-Type manually.
//
//   NextResponse.json(data, { status: 200 })
//     — Next.js helper. Sets Content-Type automatically.
//     — Returns a NextResponse which has extra Next.js metadata (cookies API, etc.).
//     — Slightly more ergonomic for Next.js-specific route handlers.
//
// For this teaching challenge we use NextResponse.json() in the production
// handler and document the alternative here for completeness.

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  // ── Input validation ─────────────────────────────────────────────────────
  //
  // All query params are strings from the URL — we validate before using them.
  // Never trust user input; always validate type and range server-side.
  //
  // Security: we return a 400 with a clear error message for invalid inputs.
  // The error message is informative (helps developers using the API) but does
  // not expose internal implementation details.

  const q = searchParams.get("q")?.trim();
  const limitRaw = searchParams.get("limit");
  let limit = 10;

  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50 || String(parsed) !== limitRaw) {
      return NextResponse.json(
        { error: "Invalid 'limit' parameter: must be an integer between 1 and 50." },
        { status: 400 }
      );
    }
    limit = parsed;
  }

  // ── Data access ──────────────────────────────────────────────────────────
  //
  // We import dynamically here to avoid a circular reference in the solutions
  // folder. The production handler imports from the colocated _lib/search.ts.
  //
  // In a real application this would be:
  //   import { searchProducts } from "../_lib/search";
  //   const data = await searchProducts({ q: q || undefined, limit });

  // Inline implementation for the reference solution (avoids cross-solution imports):
  const { listProducts } = await import("@/lib/data");
  const result = await listProducts({ q: q || undefined, pageSize: limit, page: 1 });

  const responseBody: SearchResponse = {
    results: result.items.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      currency: p.currency,
      rating: p.rating,
      image: p.images[0] ?? null,
    })),
    total: result.totalCount,
    query: q ?? "",
  };

  // ── Error handling ──────────────────────────────────────────────────────
  //
  // We wrap the data access in the production handler but inline it here for
  // clarity. Key principle: catch errors at the API boundary and return a
  // typed JSON error response — never let unhandled exceptions produce an
  // HTML error page from a JSON API.

  return NextResponse.json(responseBody, { status: 200 });
}
