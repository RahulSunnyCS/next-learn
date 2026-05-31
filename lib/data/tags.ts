/**
 * Cache tag constants and builders for Next.js cacheTag / revalidateTag.
 *
 * Design decisions:
 * - Two categories of tags: COLLECTION tags (no argument — invalidate every
 *   item in a collection) and ENTITY tags (take an id/slug argument —
 *   invalidate one specific item).  This mirrors the two most common
 *   revalidation patterns:
 *     1. "Something was added to products" → revalidate the collection.
 *     2. "Product X was updated" → revalidate only that product's tag.
 * - Tag strings are lowercase kebab-case prefixed by the entity name.  This
 *   is the format recommended by Next.js docs and makes grep-able in codebase.
 * - The `tags` object is the single place where tag strings are defined.
 *   Challenge solutions import from here instead of hard-coding their own
 *   strings, so a rename only needs to happen in one file.
 * - We export the full object as both a named export (for destructuring) and
 *   a default export (for convenience import).
 * - Builder functions accept string | undefined so callers can pass a
 *   Product.id or Product.slug interchangeably — both are stable identifiers
 *   in the fixture data.
 */

// ---------------------------------------------------------------------------
// Tag builders
// ---------------------------------------------------------------------------

export const tags = {
  // ── Collection tags ──────────────────────────────────────────────────────

  /** Invalidate the entire product listing (any product was added/removed). */
  products: "products",

  /** Invalidate the entire category listing. */
  categories: "categories",

  // ── Entity tag builders ───────────────────────────────────────────────────

  /**
   * Tag for one specific product.
   * Pass either the product's `id` (e.g. "p-elec-001") or its `slug`
   * (e.g. "wireless-noise-cancelling-headphones") — both are stable.
   */
  product: (idOrSlug: string): string => `product:${idOrSlug}`,

  /**
   * Tag for the review list of one product.
   * Invalidated when a new review is submitted for that product.
   */
  reviews: (productId: string): string => `reviews:${productId}`,

  /**
   * Tag for one specific user's data (profile, seller info, etc.).
   */
  user: (userId: string): string => `user:${userId}`,

  /**
   * Tag for one specific user's order list.
   * Invalidated when a new order is created for that user.
   */
  orders: (userId: string): string => `orders:${userId}`,

  /**
   * Tag for one specific order (detail view).
   * Invalidated if the order status changes.
   */
  order: (orderId: string): string => `order:${orderId}`,

  /**
   * Tag for the product listing scoped to a seller.
   * Invalidated when a seller adds or removes a product.
   */
  sellerProducts: (sellerId: string): string => `seller-products:${sellerId}`,
} as const;

export default tags;
