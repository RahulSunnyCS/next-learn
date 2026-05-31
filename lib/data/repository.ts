/**
 * Async data accessors for the Nextmart in-memory store.
 *
 * Design decisions:
 * ─ Simulated latency:
 *   Every accessor awaits a small random delay before returning data.  This is
 *   intentional — the challenges teach Next.js caching, streaming, and request
 *   de-duplication, and those patterns only produce observable differences when
 *   fetches take measurable time.  Without latency, all requests complete in
 *   <1ms and caching/waterfall demos look identical with or without optimisation.
 *
 *   The delay range (30–120ms) is chosen to be:
 *     • Long enough to make a waterfall vs. parallel difference visible in the
 *       Network tab (3 sequential calls = ~100–360ms vs. ~30–120ms in parallel).
 *     • Short enough that the dev server remains snappy during normal browsing.
 *
 * ─ No top-level browser-only APIs:
 *   This file imports only from ./store and built-in types.  It has no
 *   dependency on React, window, document, or any Next.js request-context API,
 *   so it is safe to import from both Server Components and Route Handlers.
 *
 * ─ Full-text search (listProducts q param):
 *   Case-insensitive substring match against name + description.  Good enough
 *   for the demo data size; a real app would use a search engine.
 *
 * ─ Pagination:
 *   1-based page number, configurable pageSize (default 12).  Returns a
 *   PaginatedResult<Product> so the UI can render "page X of Y" chrome.
 *
 * ─ addReview side-effect:
 *   Updates the product's in-memory rating to keep it consistent with the
 *   new review.  This is the only mutating operation that touches two stores.
 *
 * ─ createOrder side-effect:
 *   Decrements stock on each purchased product.  Throws if any product has
 *   insufficient stock so the UI can surface a meaningful error.
 *
 * ─ Input validation:
 *   Basic guard clauses are applied on write operations (rating range, non-empty
 *   body, non-empty items list).  More thorough validation belongs in the API
 *   route layer that calls these functions.
 */

import {
  categoryStore,
  productStore,
  reviewStore,
  userStore,
  orderStore,
  generateId,
} from "./store";
import type {
  Product,
  Category,
  Review,
  User,
  Order,
  AddReviewInput,
  CreateOrderInput,
  ListProductsOptions,
  PaginatedResult,
} from "./types";

// ---------------------------------------------------------------------------
// Latency helper
// ---------------------------------------------------------------------------

/**
 * Resolves after a random delay between minMs and maxMs (inclusive).
 * Used by every accessor to simulate real database/network latency.
 */
export function delay(
  minMs: number = 30,
  maxMs: number = 120
): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Category accessors
// ---------------------------------------------------------------------------

/** Returns all categories, sorted alphabetically by name. */
export async function listCategories(): Promise<Category[]> {
  await delay();
  return Array.from(categoryStore.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/** Returns the category with the given slug, or null if not found. */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  await delay();
  for (const cat of categoryStore.values()) {
    if (cat.slug === slug) return cat;
  }
  return null;
}

/** Returns the category with the given id, or null if not found. */
export async function getCategoryById(id: string): Promise<Category | null> {
  await delay();
  return categoryStore.get(id) ?? null;
}

// ---------------------------------------------------------------------------
// Product accessors
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of products with optional filtering, sorting, and
 * full-text search.
 *
 * @param opts.categoryId  Filter to products in this category.
 * @param opts.sort        "price-asc" | "price-desc" | "rating-desc" | "newest"
 * @param opts.page        1-based page number (default 1).
 * @param opts.pageSize    Items per page (default 12).
 * @param opts.q           Case-insensitive substring match on name + description.
 */
export async function listProducts(
  opts: ListProductsOptions = {}
): Promise<PaginatedResult<Product>> {
  await delay();

  const { categoryId, sort = "newest", page = 1, pageSize = 12, q } = opts;

  let items = Array.from(productStore.values());

  // ── Filter ───────────────────────────────────────────────────────────────
  if (categoryId) {
    items = items.filter((p) => p.categoryId === categoryId);
  }

  if (q && q.trim().length > 0) {
    const lower = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
    );
  }

  // ── Sort ─────────────────────────────────────────────────────────────────
  switch (sort) {
    case "price-asc":
      items = items.sort((a, b) => a.priceCents - b.priceCents);
      break;
    case "price-desc":
      items = items.sort((a, b) => b.priceCents - a.priceCents);
      break;
    case "rating-desc":
      items = items.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
    default:
      // ISO-8601 strings sort lexicographically, which matches chronological order.
      items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
  }

  // ── Paginate ──────────────────────────────────────────────────────────────
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    items: paged,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** Returns the product with the given slug, or null if not found. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  await delay();
  for (const product of productStore.values()) {
    if (product.slug === slug) return product;
  }
  return null;
}

/** Returns the product with the given id, or null if not found. */
export async function getProductById(id: string): Promise<Product | null> {
  await delay();
  return productStore.get(id) ?? null;
}

/**
 * Returns all products belonging to a specific seller.
 * Useful for the seller dashboard challenge.
 */
export async function listProductsBySeller(sellerId: string): Promise<Product[]> {
  await delay();
  return Array.from(productStore.values()).filter(
    (p) => p.sellerId === sellerId
  );
}

// ---------------------------------------------------------------------------
// Review accessors
// ---------------------------------------------------------------------------

/**
 * Returns all reviews for a product, ordered by most recent first.
 */
export async function listReviews(productId: string): Promise<Review[]> {
  await delay();
  return Array.from(reviewStore.values())
    .filter((r) => r.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Adds a new review and updates the product's average rating.
 *
 * Validation:
 * - rating must be an integer between 1 and 5 (inclusive).
 * - body must be a non-empty string.
 * - productId must reference an existing product.
 *
 * Throws on validation failure so Route Handlers can surface a 400 error.
 */
export async function addReview(input: AddReviewInput): Promise<Review> {
  await delay();

  // Validate rating range (integer 1–5).
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new Error("rating must be an integer between 1 and 5");
  }

  if (!input.body || input.body.trim().length === 0) {
    throw new Error("review body must not be empty");
  }

  const product = productStore.get(input.productId);
  if (!product) {
    throw new Error(`product not found: ${input.productId}`);
  }

  const review: Review = {
    id:         generateId("r"),
    productId:  input.productId,
    userId:     input.userId,
    authorName: input.authorName,
    rating:     input.rating,
    body:       input.body.trim(),
    createdAt:  new Date().toISOString(),
  };

  reviewStore.set(review.id, review);

  // Recompute the product's average rating to keep it consistent.
  // We recompute from the store (rather than incrementally) to handle
  // concurrent writes correctly in single-threaded Node.js.
  const productReviews = Array.from(reviewStore.values()).filter(
    (r) => r.productId === input.productId
  );
  const avg =
    productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
  // Round to one decimal place (matches seed fixture format).
  product.rating = Math.round(avg * 10) / 10;
  productStore.set(product.id, product);

  return review;
}

// ---------------------------------------------------------------------------
// User accessors
// ---------------------------------------------------------------------------

/** Returns the user with the given id, or null if not found. */
export async function getUserById(id: string): Promise<User | null> {
  await delay();
  return userStore.get(id) ?? null;
}

/**
 * Returns the user with the given email (case-insensitive), or null if not found.
 * Used by auth flows to look up users at login.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  await delay();
  const lower = email.toLowerCase();
  for (const user of userStore.values()) {
    if (user.email.toLowerCase() === lower) return user;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Order accessors
// ---------------------------------------------------------------------------

/**
 * Returns all orders for a given user, ordered by most recent first.
 */
export async function listOrdersForUser(userId: string): Promise<Order[]> {
  await delay();
  return Array.from(orderStore.values())
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Returns the order with the given id, or null if not found.
 */
export async function getOrderById(id: string): Promise<Order | null> {
  await delay();
  return orderStore.get(id) ?? null;
}

/**
 * Creates a new order.
 *
 * Side effects:
 * - Decrements stock for each purchased product.
 * - Throws if any product does not exist or has insufficient stock.
 *
 * totalCents is computed from the order items (sum of priceCents × qty)
 * rather than trusting the caller, to prevent price manipulation.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  await delay();

  if (!input.items || input.items.length === 0) {
    throw new Error("order must have at least one item");
  }

  // Validate all items before mutating any stock.
  for (const item of input.items) {
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      throw new Error(`invalid quantity for product ${item.productId}`);
    }
    const product = productStore.get(item.productId);
    if (!product) {
      throw new Error(`product not found: ${item.productId}`);
    }
    if (product.stock < item.qty) {
      throw new Error(
        `insufficient stock for product ${item.productId}: ` +
          `requested ${item.qty}, available ${product.stock}`
      );
    }
  }

  // Compute server-side total to prevent caller from supplying an
  // arbitrary totalCents value.
  const totalCents = input.items.reduce(
    (sum, item) => sum + item.priceCents * item.qty,
    0
  );

  // Decrement stock now that we know all items are valid.
  for (const item of input.items) {
    const product = productStore.get(item.productId)!;
    product.stock -= item.qty;
    productStore.set(product.id, product);
  }

  const order: Order = {
    id:         generateId("o"),
    userId:     input.userId,
    items:      input.items,
    status:     "pending",
    totalCents,
    createdAt:  new Date().toISOString(),
  };

  orderStore.set(order.id, order);
  return order;
}
