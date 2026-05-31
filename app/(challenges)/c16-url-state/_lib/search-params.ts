// ─── _lib/search-params.ts — URL search-param helpers for C16 ─────────────
//
// This module is the SINGLE PLACE that defines the valid search-param keys
// and their defaults for the URL-state catalog page.  Both the server
// component (page.tsx) and the client controls bar (FilterBar.tsx) import from
// here, so the param names stay in sync automatically.
//
// WHY NOT A SHARED ENUM / CONST IN BOTH FILES?
//   A server component and a client component can both import from the same
//   utility module as long as the module itself has no "use client" directive.
//   This file has none, so it is importable from anywhere.

import type { ProductSortKey } from "@/lib/data";

// ---------------------------------------------------------------------------
// Param key constants
// ---------------------------------------------------------------------------

export const PARAM_KEYS = {
  /** Category slug filter, e.g. "electronics". Empty string = all. */
  category: "category",
  /** Sort key — one of the ProductSortKey union values. */
  sort: "sort",
  /** 1-based page number. */
  page: "page",
  /** Full-text search query. */
  q: "q",
} as const;

// ---------------------------------------------------------------------------
// Default values (used when the param is absent from the URL)
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  category: "",
  sort: "newest" as ProductSortKey,
  page: 1,
  q: "",
} as const;

// ---------------------------------------------------------------------------
// Parsed params type
// ---------------------------------------------------------------------------

export interface ParsedSearchParams {
  category: string;
  sort: ProductSortKey;
  page: number;
  q: string;
}

// ---------------------------------------------------------------------------
// Valid sort keys (used for validation so arbitrary strings can't be passed)
// ---------------------------------------------------------------------------

const VALID_SORT_KEYS: ProductSortKey[] = [
  "newest",
  "price-asc",
  "price-desc",
  "rating-desc",
];

// ---------------------------------------------------------------------------
// Parser — converts the raw searchParams record into typed values
// ---------------------------------------------------------------------------

/**
 * Parses the raw searchParams object (Next.js provides it as
 * `Promise<Record<string, string | string[] | undefined>>`) into the typed
 * ParsedSearchParams shape.
 *
 * This function:
 * 1. Picks only the keys we care about (ignores unknown params).
 * 2. Validates the `sort` key against the allowed union.
 * 3. Coerces `page` to a safe integer >= 1.
 * 4. Falls back to DEFAULTS for any missing / invalid value.
 *
 * INPUT VALIDATION NOTE: we accept raw strings from the URL and validate
 * them here rather than trusting the caller, because URL params are
 * user-controlled input.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): ParsedSearchParams {
  // Extract the first value for each key (ignore array duplicates — a single
  // scalar is expected for filter params).
  const category = firstString(raw[PARAM_KEYS.category]) ?? DEFAULTS.category;

  // Sort validation: only accept known sort keys, fall back to default.
  const rawSort = firstString(raw[PARAM_KEYS.sort]);
  const sort: ProductSortKey =
    rawSort && (VALID_SORT_KEYS as string[]).includes(rawSort)
      ? (rawSort as ProductSortKey)
      : DEFAULTS.sort;

  // Page coercion: parseInt, clamp to >= 1, fall back to 1.
  const rawPage = firstString(raw[PARAM_KEYS.page]);
  const parsedPage = rawPage ? parseInt(rawPage, 10) : NaN;
  const page = Number.isFinite(parsedPage) && parsedPage >= 1
    ? parsedPage
    : DEFAULTS.page;

  // Search query: trim whitespace.
  const q = (firstString(raw[PARAM_KEYS.q]) ?? DEFAULTS.q).trim();

  return { category, sort, page, q };
}

// ---------------------------------------------------------------------------
// URL builder — creates the query string for a filter update
// ---------------------------------------------------------------------------

/**
 * Takes the CURRENT set of parsed params and a partial override, then
 * returns a new URLSearchParams string (without the leading "?").
 *
 * Used by the client controls bar to construct the next URL on every
 * user interaction.
 *
 * IMPORTANT: when any filter changes (category, sort, q), page is reset
 * to 1 — otherwise the user could land on page 5 of results that only
 * has 3 pages after filtering.  Page changes are the one case where we
 * preserve the existing page.
 */
export function buildSearchParams(
  current: ParsedSearchParams,
  override: Partial<ParsedSearchParams>
): URLSearchParams {
  // Detect if a non-page filter is changing (triggers page reset).
  const filterChanging =
    "category" in override || "sort" in override || "q" in override;

  const merged: ParsedSearchParams = {
    ...current,
    ...override,
    // Reset page to 1 on any filter/sort change, unless page is explicitly overridden.
    page: "page" in override
      ? (override.page ?? 1)
      : filterChanging
        ? 1
        : current.page,
  };

  const sp = new URLSearchParams();

  // Only write non-default values to keep URLs clean.
  // This means "?sort=newest&page=1&q=&category=" becomes just "".
  if (merged.q) sp.set(PARAM_KEYS.q, merged.q);
  if (merged.category) sp.set(PARAM_KEYS.category, merged.category);
  if (merged.sort !== DEFAULTS.sort) sp.set(PARAM_KEYS.sort, merged.sort);
  if (merged.page > 1) sp.set(PARAM_KEYS.page, String(merged.page));

  return sp;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function firstString(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
