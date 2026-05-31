// ─── app/(challenges)/c14-tanstack-query/api/products/route.ts ────────────
//
// GET /c14-tanstack-query/api/products?page=...&pageSize=...&q=...
//
// Paginated product endpoint used by the InfiniteList component's
// useInfiniteQuery hook.
//
// ── PAGE PARAM PROTOCOL ───────────────────────────────────────────────────
// TanStack Query's useInfiniteQuery drives pagination via getNextPageParam().
// The client passes `page` as a URL search param. The response includes
// `hasNextPage` so getNextPageParam can return undefined when exhausted.
//
// ── RESPONSE FORMAT ───────────────────────────────────────────────────────
// Returns ProductPage:
//   { items, page, pageSize, totalCount, totalPages, hasNextPage }
// HTTP 200 on success, 400 on bad params, 500 on unexpected error.

import { NextRequest, NextResponse } from "next/server";
import { parsePaginationParams, getProductPage } from "../../_lib/search-route";

/**
 * GET /c14-tanstack-query/api/products
 *
 * Query parameters:
 *   page     — 1-based page number (default 1)
 *   pageSize — items per page (1–20, default 6)
 *   q        — optional search filter
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;

  const { page, pageSize, q, error } = parsePaginationParams(searchParams);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const data = await getProductPage(page, pageSize, q);
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[c14/api/products] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
