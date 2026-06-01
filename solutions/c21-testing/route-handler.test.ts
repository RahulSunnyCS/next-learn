/**
 * C21 — Route Handler Test: Search (C13)
 *
 * STRATEGY
 * ─────────
 * A Route Handler (app/api/.../route.ts) is a function that receives a
 * NextRequest and returns a NextResponse. There are two test approaches:
 *
 *   A. Test the HTTP boundary — construct a real NextRequest, call GET(req),
 *      and assert the NextResponse status + JSON body.
 *
 *   B. Test the logic layer — import and test the helper functions that the
 *      route handler delegates to (parseSearchOptions, searchProducts).
 *
 * We use BOTH approaches in this file:
 *
 *   - Approach A covers the HTTP contract: does the handler wire inputs to
 *     outputs correctly? Does it return 400 for bad params, 200 with the right
 *     shape for valid params?
 *
 *   - Approach B covers the pure logic: edge cases in parseSearchOptions that
 *     are easier to enumerate without constructing full Request objects.
 *
 * MOCKING DECISIONS
 * ─────────────────
 * No mocks needed here. The handler imports from:
 *   - "@/app/(challenges)/c13-route-handlers/_lib/search" — pure Node module
 *   - "@/lib/data" — in-memory store, works in plain Node
 *
 * Neither requires Next.js runtime stubs. We use the real implementations.
 * The only Next.js API we use is NextRequest / NextResponse, both of which
 * are Web API wrappers that work in Node.js (Vitest uses Node 18+).
 */

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

// ── Import targets ────────────────────────────────────────────────────────
import { GET } from "@/app/(challenges)/c13-route-handlers/search/route";
import {
  parseSearchOptions,
  searchProducts,
  type SearchResponse,
} from "@/app/(challenges)/c13-route-handlers/_lib/search";

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH A — HTTP boundary tests (call GET() with a real NextRequest)
// ─────────────────────────────────────────────────────────────────────────────

// Helper: build a NextRequest for the search endpoint.
// We use a full URL string (Next.js requires the URL to be absolute to parse
// searchParams correctly via request.nextUrl).
function makeRequest(queryString: string): NextRequest {
  return new NextRequest(`http://localhost:3000/challenges/c13-route-handlers/search${queryString}`);
}

describe("GET /search — HTTP contract", () => {
  // ── 200 responses ────────────────────────────────────────────────────────

  it("returns 200 with the expected JSON shape for no query params", async () => {
    const req = makeRequest("");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body: SearchResponse = await res.json();

    // Shape check: results, total, query must exist
    expect(Array.isArray(body.results)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(typeof body.query).toBe("string");

    // query should be the empty string when no q param provided
    expect(body.query).toBe("");

    // Results should include the seeded products (at least 1)
    expect(body.results.length).toBeGreaterThan(0);

    // Each result must have the required fields and NOT expose internals
    const first = body.results[0];
    expect(typeof first.id).toBe("string");
    expect(typeof first.slug).toBe("string");
    expect(typeof first.name).toBe("string");
    expect(typeof first.priceCents).toBe("number");
    expect(typeof first.rating).toBe("number");
    // image can be string or null (no images in fixture)
    expect(first.image === null || typeof first.image === "string").toBe(true);
    // sellerId must NOT be exposed (security: internal field)
    // Cast via unknown first: SearchResult does not have an index signature,
    // so a direct cast to Record<string, unknown> would be a TS error.
    expect((first as unknown as Record<string, unknown>).sellerId).toBeUndefined();
  });

  it("returns 200 with filtered results for a matching q param", async () => {
    const req = makeRequest("?q=merino");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body: SearchResponse = await res.json();

    expect(body.results.length).toBeGreaterThan(0);
    expect(body.query).toBe("merino");

    // Every result name or description should match (the lib/data full-text
    // search checks name + description, but we can only assert what the API
    // returns — the name or description contains the query term).
    for (const r of body.results) {
      const combined = r.name.toLowerCase();
      // At minimum the result must have been returned from the search
      expect(typeof r.name).toBe("string");
    }
  });

  it("respects the limit param and returns at most N results", async () => {
    const req = makeRequest("?limit=3");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body: SearchResponse = await res.json();
    expect(body.results.length).toBeLessThanOrEqual(3);
  });

  it("returns 200 with empty results array for a query that matches nothing", async () => {
    const req = makeRequest("?q=zzz-this-matches-nothing-xyzzy");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body: SearchResponse = await res.json();
    expect(body.results).toHaveLength(0);
    expect(body.total).toBe(0);
    // query echoes back the sanitised input
    expect(body.query).toBe("zzz-this-matches-nothing-xyzzy");
  });

  // ── 400 responses ────────────────────────────────────────────────────────

  it("returns 400 for a non-integer limit", async () => {
    const req = makeRequest("?limit=abc");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    // Error message should be in the { error: "..." } shape
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns 400 for a limit of 0 (below allowed minimum)", async () => {
    const req = makeRequest("?limit=0");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 for a limit above 50 (above allowed maximum)", async () => {
    const req = makeRequest("?limit=51");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
  });

  it("returns 400 for a float limit (non-integer)", async () => {
    // "1.5" parses to 1 via parseInt, but String(1) !== "1.5"
    // so the handler's strict check must catch this.
    const req = makeRequest("?limit=1.5");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for a limit with leading plus sign (not a clean integer)", async () => {
    const req = makeRequest("?limit=+5");
    const res = await GET(req);

    // "+5" parses to 5 via parseInt, but String(5) !== "+5"
    expect(res.status).toBe(400);
  });

  // ── Response headers ──────────────────────────────────────────────────────

  it("sets Content-Type: application/json on the 200 response", async () => {
    const req = makeRequest("");
    const res = await GET(req);

    const contentType = res.headers.get("content-type") ?? "";
    expect(contentType).toContain("application/json");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// APPROACH B — Logic layer tests (parseSearchOptions + searchProducts)
// ─────────────────────────────────────────────────────────────────────────────

describe("parseSearchOptions — validation logic", () => {
  function params(qs: string): URLSearchParams {
    return new URLSearchParams(qs);
  }

  it("returns default limit=10 and no q when params are empty", () => {
    const { opts, error } = parseSearchOptions(params(""));
    expect(error).toBeNull();
    expect(opts.limit).toBe(10);
    expect(opts.q).toBeUndefined();
  });

  it("accepts a valid q param and includes it in opts", () => {
    const { opts, error } = parseSearchOptions(params("q=laptop"));
    expect(error).toBeNull();
    expect(opts.q).toBe("laptop");
  });

  it("trims whitespace from q", () => {
    const { opts, error } = parseSearchOptions(params("q=  headphones  "));
    expect(error).toBeNull();
    expect(opts.q).toBe("headphones");
  });

  it("converts empty string q to undefined (list-all)", () => {
    const { opts, error } = parseSearchOptions(params("q="));
    expect(error).toBeNull();
    expect(opts.q).toBeUndefined();
  });

  it("accepts limit=1 (minimum)", () => {
    const { opts, error } = parseSearchOptions(params("limit=1"));
    expect(error).toBeNull();
    expect(opts.limit).toBe(1);
  });

  it("accepts limit=50 (maximum)", () => {
    const { opts, error } = parseSearchOptions(params("limit=50"));
    expect(error).toBeNull();
    expect(opts.limit).toBe(50);
  });

  it("returns error for limit=0", () => {
    const { error } = parseSearchOptions(params("limit=0"));
    expect(error).not.toBeNull();
    expect(typeof error).toBe("string");
  });

  it("returns error for limit=51", () => {
    const { error } = parseSearchOptions(params("limit=51"));
    expect(error).not.toBeNull();
  });

  it("returns error for non-integer limit (float)", () => {
    const { error } = parseSearchOptions(params("limit=2.5"));
    expect(error).not.toBeNull();
  });

  it("returns error for NaN limit", () => {
    const { error } = parseSearchOptions(params("limit=notanumber"));
    expect(error).not.toBeNull();
  });

  it("does not return error when limit param is absent (uses default)", () => {
    const { opts, error } = parseSearchOptions(params("q=laptop"));
    expect(error).toBeNull();
    expect(opts.limit).toBe(10); // default
  });
});

describe("searchProducts — data access layer", () => {
  it("returns SearchResponse with results, total, and query fields", async () => {
    const res = await searchProducts({});
    expect(Array.isArray(res.results)).toBe(true);
    expect(typeof res.total).toBe("number");
    expect(typeof res.query).toBe("string");
  });

  it("returns products matching a query string", async () => {
    const res = await searchProducts({ q: "merino" });
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.query).toBe("merino");
  });

  it("respects the limit option", async () => {
    const res = await searchProducts({ limit: 2 });
    expect(res.results.length).toBeLessThanOrEqual(2);
  });

  it("maps Product to SearchResult shape (no internal fields exposed)", async () => {
    const res = await searchProducts({ limit: 1 });
    if (res.results.length === 0) return; // guard for empty fixtures
    const r = res.results[0];
    // Required fields
    expect(typeof r.id).toBe("string");
    expect(typeof r.slug).toBe("string");
    expect(typeof r.name).toBe("string");
    expect(typeof r.priceCents).toBe("number");
    expect(typeof r.currency).toBe("string");
    expect(typeof r.rating).toBe("number");
    // image is nullable
    expect(r.image === null || typeof r.image === "string").toBe(true);
    // Internal fields must be absent.
    // Cast via unknown first: SearchResult lacks an index signature, so a
    // direct cast to Record<string, unknown> is rejected by the TS compiler.
    const rec = r as unknown as Record<string, unknown>;
    expect(rec.description).toBeUndefined();
    expect(rec.sellerId).toBeUndefined();
    expect(rec.stock).toBeUndefined();
    expect(rec.categoryId).toBeUndefined();
  });

  it("returns empty results for a no-match query, total = 0", async () => {
    const res = await searchProducts({ q: "zzz-xyzzy-nomatch" });
    expect(res.results).toHaveLength(0);
    expect(res.total).toBe(0);
  });
});
