// ─── app/(challenges)/c13-route-handlers/_lib/search.ts ──────────────────
//
// Thin wrapper around @/lib/data for the C13 search Route Handler.
//
// Why a local _lib wrapper instead of importing lib/data directly in the
// route handler?
//
//  1. TEACHING ISOLATION: The challenge teaches the route-handler layer. By
//     keeping the data-access concern in its own module we can swap the
//     underlying source (in-memory, database, external API) without touching
//     the route handler itself.
//
//  2. SHAPE REDUCTION: The route handler only needs a minimal Product shape
//     (id, slug, name, priceCents, rating). Defining a local SearchResult
//     type here avoids leaking the full Product type through the API response,
//     which is a good API design principle (return only what the client needs).
//
//  3. INPUT VALIDATION: Validation of query parameters happens here rather than
//     inline in the route handler, keeping the route handler focused on HTTP
//     concerns (status codes, headers, response serialisation).

import { listProducts } from "@/lib/data";
import type { Product } from "@/lib/data";

// ── Public output type ────────────────────────────────────────────────────

/**
 * The minimal product shape returned by the search API.
 * Deliberately narrower than the full Product type — only the fields a search
 * results UI needs.
 */
export interface SearchResult {
  id: string;
  slug: string;
  name: string;
  /** Price in cents (integer). Divide by 100 for display. */
  priceCents: number;
  currency: string;
  rating: number;
  /** Primary image URL (first element of images array). */
  image: string | null;
}

// ── Input type ────────────────────────────────────────────────────────────

export interface SearchOptions {
  /** Full-text search query (matched against name + description). */
  q?: string;
  /**
   * Maximum number of results to return (1–50, default 10).
   * Capped server-side to prevent oversized responses.
   */
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  /** The sanitised query string that was actually used. */
  query: string;
}

// ── Validation ────────────────────────────────────────────────────────────

/**
 * Validates and sanitises search options from URL query parameters.
 *
 * Security note: all inputs from URL params are strings — we coerce and
 * validate before trusting them. We never reflect raw user input back in
 * error messages or use it in a way that could cause injection.
 */
export function parseSearchOptions(searchParams: URLSearchParams): {
  opts: SearchOptions;
  error: string | null;
} {
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = searchParams.get("limit");

  // Validate limit: must be a positive integer ≤ 50.
  let limit = 10; // default
  if (limitRaw !== null) {
    const parsed = parseInt(limitRaw, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50 || String(parsed) !== limitRaw) {
      return {
        opts: {},
        error: "Invalid 'limit' parameter: must be an integer between 1 and 50.",
      };
    }
    limit = parsed;
  }

  // q is optional; empty string means "list all" (up to limit).
  return { opts: { q: q || undefined, limit }, error: null };
}

// ── Data access ───────────────────────────────────────────────────────────

/**
 * Searches products via @/lib/data and maps them to the minimal SearchResult
 * shape. The mapping strips sensitive or irrelevant fields before the result
 * is serialised to JSON in the route handler.
 */
export async function searchProducts(
  opts: SearchOptions
): Promise<SearchResponse> {
  const { q, limit = 10 } = opts;

  // listProducts accepts a `q` option for full-text search and a `pageSize`
  // option for result count. We pass pageSize equal to limit to avoid
  // fetching more rows than we need.
  const result = await listProducts({ q, pageSize: limit, page: 1 });

  const results: SearchResult[] = result.items.map(
    (p: Product): SearchResult => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      currency: p.currency,
      rating: p.rating,
      // The images array may be empty in edge cases; null is safer than
      // undefined for JSON serialisation (undefined fields are omitted).
      image: p.images[0] ?? null,
    })
  );

  return {
    results,
    total: result.totalCount,
    query: q ?? "",
  };
}
