// ─── app/(challenges)/c14-tanstack-query/api/search/route.ts ──────────────
//
// GET /c14-tanstack-query/api/search?q=...&limit=...
//
// This Route Handler serves the SearchAsYouType component's useQuery calls.
//
// ── WHY NO `export const runtime = 'edge'`? ───────────────────────────────
// Under cacheComponents: true, `export const runtime` is incompatible with
// the build (see docs/cache-components-rules.md rule 1). We use Node runtime
// (the default) which is correct: we import from @/lib/data which is a
// Node-only in-memory store (no Web-Crypto or Fetch-only deps needed here).
//
// ── CACHING BEHAVIOUR ─────────────────────────────────────────────────────
// In Next.js 16, GET Route Handlers are NOT cached by default (v15+ change).
// This is correct for a search endpoint — results should always reflect the
// current in-memory store. TanStack Query provides its OWN client-side cache
// (staleTime) so repeated identical queries are deduplicated in the browser
// without going to the server again — no server-side cache needed here.
//
// ── RESPONSE FORMAT ───────────────────────────────────────────────────────
// Returns SearchResponse: { results: SearchResult[], total: number, query: string }
// HTTP 200 on success, 400 on bad params, 500 on unexpected error.

import { NextRequest, NextResponse } from "next/server";
import { parseSearchParams, searchProducts } from "../../_lib/search-route";

/**
 * GET /c14-tanstack-query/api/search
 *
 * Query parameters:
 *   q     — search string (optional; omit to list all)
 *   limit — max results (1–50, default 10)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const { q, limit, error } = parseSearchParams(searchParams);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const data = await searchProducts(q, limit);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    // Never expose internals in error responses.
    console.error("[c14/api/search] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
