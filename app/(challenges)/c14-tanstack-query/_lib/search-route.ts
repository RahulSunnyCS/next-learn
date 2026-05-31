// ─── app/(challenges)/c14-tanstack-query/_lib/search-route.ts ─────────────
//
// Local data-access wrapper used by the c14 Route Handlers.
//
// WHY A LOCAL _lib INSTEAD OF IMPORTING @/lib/data DIRECTLY IN ROUTES?
//
//  1. TYPE NARROWING: The route handler should return only what the client
//     needs. A local SearchResult type strips fields like sellerId, stock,
//     and full description that belong server-side only.
//
//  2. VALIDATION: URL parameter parsing / validation lives here rather than
//     inline in the route handler, keeping HTTP concerns (status codes,
//     response format) separate from input-sanitisation concerns.
//
//  3. PAGINATED PRODUCTS: The infinite-scroll route needs a PaginatedPage
//     type so the client knows hasNextPage. Defining the shape here keeps
//     the route handler thin.
//
// IMPORTANT: this file imports from @/lib/data which uses Math.random()
// for simulated latency. That is a non-deterministic call — it is safe here
// because these functions are called from Route Handlers (dynamic by default
// in Next.js 16), not from Server Components at prerender time.

import { listProducts } from "@/lib/data";
import type { Product } from "@/lib/data";

// ── Search types ──────────────────────────────────────────────────────────

/** Minimal product shape for search results (server-side fields stripped). */
export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  /** Price in cents (integer). Divide by 100 to display. */
  priceCents: number;
  currency: string;
  rating: number;
  /** Primary image URL or null if not available. */
  image: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  /** The sanitised query string actually used. */
  query: string;
}

// ── Paginated products types ───────────────────────────────────────────────

/** Minimal product shape for the paginated / infinite-scroll list. */
export interface ProductPage {
  items: SearchResult[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /** Convenience flag so the client can compute hasNextPage. */
  hasNextPage: boolean;
}

// ── Validation helpers ────────────────────────────────────────────────────

/**
 * Validates and sanitises ?q and ?limit from URLSearchParams.
 * Returns the parsed opts and an error string (null if valid).
 * All inputs are strings from the URL — validate before use.
 */
export function parseSearchParams(searchParams: URLSearchParams): {
  q: string | undefined;
  limit: number;
  error: string | null;
} {
  const q = searchParams.get("q")?.trim() || undefined;
  const limitRaw = searchParams.get("limit");
  let limit = 10;

  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    // Reject non-integers, out-of-range values, and values with trailing chars.
    if (isNaN(parsed) || parsed < 1 || parsed > 50 || String(parsed) !== limitRaw) {
      return {
        q,
        limit,
        error: "Invalid 'limit' parameter: must be an integer between 1 and 50.",
      };
    }
    limit = parsed;
  }

  return { q, limit, error: null };
}

/**
 * Validates and sanitises ?page and ?pageSize from URLSearchParams.
 * Returns the parsed values and an error string (null if valid).
 */
export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  q: string | undefined;
  error: string | null;
} {
  const q = searchParams.get("q")?.trim() || undefined;
  const pageRaw = searchParams.get("page");
  const pageSizeRaw = searchParams.get("pageSize");

  let page = 1;
  let pageSize = 6; // smaller pageSize so infinite scroll is demonstrable

  if (pageRaw !== null) {
    const parsed = parseInt(pageRaw, 10);
    if (isNaN(parsed) || parsed < 1 || String(parsed) !== pageRaw) {
      return { q, page, pageSize, error: "Invalid 'page' parameter: must be a positive integer." };
    }
    page = parsed;
  }

  if (pageSizeRaw !== null) {
    const parsed = parseInt(pageSizeRaw, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 20 || String(parsed) !== pageSizeRaw) {
      return { q, page, pageSize, error: "Invalid 'pageSize' parameter: must be an integer between 1 and 20." };
    }
    pageSize = parsed;
  }

  return { q, page, pageSize, error: null };
}

// ── Data accessors ────────────────────────────────────────────────────────

function toSearchResult(p: Product): SearchResult {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    currency: p.currency,
    rating: p.rating,
    // images may be empty; null is safer than undefined for JSON serialisation.
    image: p.images[0] ?? null,
  };
}

/**
 * Searches products and returns a flat SearchResponse.
 * Used by GET /c14-tanstack-query/api/search.
 */
export async function searchProducts(
  q: string | undefined,
  limit: number
): Promise<SearchResponse> {
  const result = await listProducts({ q, pageSize: limit, page: 1 });
  return {
    results: result.items.map(toSearchResult),
    total: result.totalCount,
    query: q ?? "",
  };
}

/**
 * Returns a paginated product list.
 * Used by GET /c14-tanstack-query/api/products for infinite scroll.
 */
export async function getProductPage(
  page: number,
  pageSize: number,
  q: string | undefined
): Promise<ProductPage> {
  const result = await listProducts({ q, page, pageSize });
  return {
    items: result.items.map(toSearchResult),
    page: result.page,
    pageSize: result.pageSize,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    hasNextPage: result.page < result.totalPages,
  };
}
