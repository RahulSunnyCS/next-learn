// ─── app/(challenges)/c24-normalized-state/_lib/normalize.ts ─────────────────
//
// WHY NORMALIZATION?
//
// With nested arrays (the naive approach), to update ONE product you must map
// over the entire products array — every item is touched, every downstream
// selector re-evaluates, and React re-renders every Row component even if only
// one row changed.
//
// With a normalized shape (byId map + allIds array) you get O(1) point updates:
//   state.byId[id] = { ...state.byId[id], stock: newStock }
// No looping, no touching unrelated rows.  Selectors that depend on a specific
// row only re-run when that row's entry in byId changes — others stay referentially
// stable, so React.memo and memoized selectors cut re-renders to the affected row.
//
// The classic reference is Redux's "Normalizing State Shape" documentation, but
// the pattern is store-agnostic — it works identically with Zustand.

import type { Product, Order } from "@/lib/data";

// ---------------------------------------------------------------------------
// Normalized shape types
// ---------------------------------------------------------------------------

/**
 * A normalized collection: O(1) look-up via byId, iteration order via allIds.
 *
 * T must have a string `id` field.
 */
export interface Normalized<T> {
  byId: Record<string, T>;
  allIds: string[];
}

// The seller's view of a product (extended with client-side editable fields).
export interface SellerProduct extends Product {
  /** Whether this row is selected in the grid (multi-select checkbox). */
  selected: boolean;
}

// A summary row produced by joining products and orders, used in the grid.
export interface SellerRow {
  id: string;         // productId
  name: string;
  priceCents: number;
  stock: number;
  rating: number;
  categoryId: string;
  currency: string;
  /** Total revenue from orders containing this product (priceCents * qty summed). */
  revenueCents: number;
  /** How many times this product appeared across all orders. */
  orderCount: number;
  selected: boolean;
}

export type NormalizedProducts = Normalized<SellerProduct>;
export type NormalizedRows = Normalized<SellerRow>;

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/**
 * Convert a flat Product[] into a Normalized<SellerProduct>.
 *
 * allIds preserves the original sort order of the input array (the server
 * already applied any default sort — we keep that order as the "natural" order
 * and let selectors add client-side sorting on top without mutating this map).
 */
export function normalizeProducts(products: Product[]): NormalizedProducts {
  const byId: Record<string, SellerProduct> = {};
  const allIds: string[] = [];

  for (const product of products) {
    allIds.push(product.id);
    byId[product.id] = { ...product, selected: false };
  }

  return { byId, allIds };
}

/**
 * Join products and orders into a flat SellerRow[] and then normalize.
 *
 * Why join here rather than in a selector?
 * Because the join itself is a one-time O(n) pass that should run once when
 * data arrives, not on every render.  The normalized output is the stable
 * "source of truth" in the store.  Selectors then derive VIEWS (filter/sort)
 * from that stable source without re-doing the join.
 */
export function buildNormalizedRows(
  products: Product[],
  orders: Order[]
): NormalizedRows {
  // Build a revenue/orderCount aggregation per productId in O(n) time.
  // O(n) map build, O(m) order iteration — cheaper than re-running on each render.
  const revenueByProductId: Record<string, number> = {};
  const orderCountByProductId: Record<string, number> = {};

  for (const order of orders) {
    // Ignore cancelled orders — they don't count as revenue.
    if (order.status === "cancelled") continue;

    for (const item of order.items) {
      revenueByProductId[item.productId] =
        (revenueByProductId[item.productId] ?? 0) + item.priceCents * item.qty;
      orderCountByProductId[item.productId] =
        (orderCountByProductId[item.productId] ?? 0) + 1;
    }
  }

  const byId: Record<string, SellerRow> = {};
  const allIds: string[] = [];

  for (const product of products) {
    allIds.push(product.id);
    byId[product.id] = {
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      stock: product.stock,
      rating: product.rating,
      categoryId: product.categoryId,
      currency: product.currency,
      revenueCents: revenueByProductId[product.id] ?? 0,
      orderCount: orderCountByProductId[product.id] ?? 0,
      selected: false,
    };
  }

  return { byId, allIds };
}

/**
 * Synthesize additional rows from real data to reach a target count.
 *
 * The real dataset has ~30 products, which is too small to show virtualization
 * benefits.  This helper generates synthetic rows derived from real product
 * data so the grid can demonstrate rendering 500+ rows with only ~10 visible.
 *
 * The synthetic rows are CLIENT-ONLY — they never go to the server.
 */
export function expandToCount(
  rows: NormalizedRows,
  targetCount: number
): NormalizedRows {
  if (rows.allIds.length >= targetCount) return rows;

  const byId = { ...rows.byId };
  const allIds = [...rows.allIds];
  const realIds = rows.allIds;
  let counter = allIds.length;

  while (allIds.length < targetCount) {
    // Cycle through real products as templates.
    const templateId = realIds[counter % realIds.length];
    const template = rows.byId[templateId];
    const syntheticId = `synthetic-${counter}`;

    byId[syntheticId] = {
      ...template,
      id: syntheticId,
      // Vary price and stock to make the grid visually interesting.
      priceCents: Math.round(template.priceCents * (0.8 + (counter % 5) * 0.1)),
      stock: (counter * 7) % 100,
      // Vary revenue to make sorting interesting.
      revenueCents: Math.round(template.revenueCents * (0.5 + (counter % 10) * 0.07)),
      orderCount: counter % 20,
      name: `${template.name} (Variant ${counter - realIds.length + 1})`,
      selected: false,
    };
    allIds.push(syntheticId);
    counter++;
  }

  return { byId, allIds };
}
