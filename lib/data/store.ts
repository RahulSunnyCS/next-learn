/**
 * In-memory stores for the Nextmart data layer.
 *
 * Design decisions:
 * - Map<id, entity> is used rather than an array so that O(1) look-ups are
 *   possible in the repository layer.  Arrays are kept as well (via
 *   Array.from(store.values())) only in list accessors where iteration is
 *   unavoidable.
 * - Stores are module-level singletons initialised once at import time from
 *   the seed fixtures.  This is the standard in-memory store pattern for
 *   Next.js development servers: data lives for the lifetime of the process
 *   and is reset on every server restart (dev HMR or cold start).
 * - A WARNING comment is added so that future contributors do not mistake this
 *   for durable storage.
 * - Deep-cloning the seed arrays on init (via structuredClone) means that the
 *   fixtures file stays pristine even after mutations — if the store is
 *   exported and modified externally the original seed objects are not touched.
 *
 * WARNING: all mutations (addReview, createOrder) are lost on server restart.
 * This is intentional — the data layer is a teaching scaffold, not a
 * production store.  Do not add persistence logic here.
 */

import { CATEGORIES, PRODUCTS, REVIEWS, USERS, ORDERS } from "./fixtures";
import type { Category, Product, Review, User, Order } from "./types";

// ---------------------------------------------------------------------------
// Store initialisation
// ---------------------------------------------------------------------------

// We structuredClone to decouple the live store from the static fixture
// objects.  This means mutations (e.g. addReview) never dirty the fixtures
// array, which matters for hot-module replacement in dev: if HMR re-runs
// the fixtures module the live data is only reset when the store module is
// also re-evaluated (which happens on full server restart, not HMR).
function buildMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, structuredClone(item)]));
}

/** Keyed by Category.id */
export const categoryStore: Map<string, Category> = buildMap(CATEGORIES);

/** Keyed by Product.id */
export const productStore: Map<string, Product> = buildMap(PRODUCTS);

/** Keyed by Review.id */
export const reviewStore: Map<string, Review> = buildMap(REVIEWS);

/** Keyed by User.id */
export const userStore: Map<string, User> = buildMap(USERS);

/** Keyed by Order.id */
export const orderStore: Map<string, Order> = buildMap(ORDERS);

// ---------------------------------------------------------------------------
// ID generators
// ---------------------------------------------------------------------------

/**
 * Generates a simple monotonic ID for new entities created at runtime.
 * Format: "<prefix>-<timestamp>-<counter>" — stable within a request but
 * unique across concurrent requests.
 *
 * NOTE: these IDs will not survive a server restart; they are adequate for
 * development and caching/mutation demos.
 */
let _counter = 0;
export function generateId(prefix: string): string {
  // Increment before use to avoid two calls in the same millisecond colliding.
  _counter += 1;
  return `${prefix}-${Date.now()}-${_counter}`;
}
