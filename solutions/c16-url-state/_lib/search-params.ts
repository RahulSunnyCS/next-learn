// ─── solutions/c16-url-state/_lib/search-params.ts ────────────────────────
//
// Reference solution: URL search-param helpers.
// Identical in API to the challenge _lib version.  The solution imports this
// rather than the challenge version so it is fully self-contained.
//
// See challenge _lib/search-params.ts for the detailed reasoning comments.

import type { ProductSortKey } from "@/lib/data";

export const PARAM_KEYS = {
  category: "category",
  sort: "sort",
  page: "page",
  q: "q",
} as const;

export const DEFAULTS = {
  category: "",
  sort: "newest" as ProductSortKey,
  page: 1,
  q: "",
} as const;

export interface ParsedSearchParams {
  category: string;
  sort: ProductSortKey;
  page: number;
  q: string;
}

const VALID_SORT_KEYS: ProductSortKey[] = [
  "newest",
  "price-asc",
  "price-desc",
  "rating-desc",
];

export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>
): ParsedSearchParams {
  const category = firstString(raw[PARAM_KEYS.category]) ?? DEFAULTS.category;

  const rawSort = firstString(raw[PARAM_KEYS.sort]);
  const sort: ProductSortKey =
    rawSort && (VALID_SORT_KEYS as string[]).includes(rawSort)
      ? (rawSort as ProductSortKey)
      : DEFAULTS.sort;

  const rawPage = firstString(raw[PARAM_KEYS.page]);
  const parsedPage = rawPage ? parseInt(rawPage, 10) : NaN;
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : DEFAULTS.page;

  const q = (firstString(raw[PARAM_KEYS.q]) ?? DEFAULTS.q).trim();

  return { category, sort, page, q };
}

export function buildSearchParams(
  current: ParsedSearchParams,
  override: Partial<ParsedSearchParams>
): URLSearchParams {
  const filterChanging =
    "category" in override || "sort" in override || "q" in override;

  const merged: ParsedSearchParams = {
    ...current,
    ...override,
    page:
      "page" in override
        ? override.page ?? 1
        : filterChanging
          ? 1
          : current.page,
  };

  const sp = new URLSearchParams();
  if (merged.q) sp.set(PARAM_KEYS.q, merged.q);
  if (merged.category) sp.set(PARAM_KEYS.category, merged.category);
  if (merged.sort !== DEFAULTS.sort) sp.set(PARAM_KEYS.sort, merged.sort);
  if (merged.page > 1) sp.set(PARAM_KEYS.page, String(merged.page));

  return sp;
}

function firstString(
  v: string | string[] | undefined
): string | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v[0];
  return v;
}
