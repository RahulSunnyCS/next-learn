/**
 * Domain types for the Nextmart in-memory data layer.
 *
 * Design notes:
 * - priceCents / totalCents are integers (cents) rather than floats to avoid
 *   floating-point rounding errors in price arithmetic.
 * - currency is a string (e.g. "USD") rather than an enum so that seed data
 *   is easily serialisable and we don't need to import enum members everywhere.
 * - createdAt is stored as an ISO-8601 string rather than a Date object so
 *   that fixtures can be declared as plain object literals and the data remains
 *   fully JSON-serialisable (important for Next.js Server Component / Route
 *   Handler compatibility and for future revalidation demos).
 * - role on User is a union literal rather than an enum for the same reason.
 */

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  /** URL-safe slug used in routes, e.g. "electronics". */
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  /** URL-safe slug for the PDP route, e.g. "airmax-pro-white-42". */
  slug: string;
  name: string;
  description: string;
  /** Price in the smallest currency unit (e.g. cents for USD). */
  priceCents: number;
  /** ISO 4217 currency code, e.g. "USD". */
  currency: string;
  categoryId: string;
  /** Ordered array of image URLs (first element is the primary image). */
  images: string[];
  /** Current stock count (0 = out of stock). */
  stock: number;
  /**
   * Pre-computed average rating (0–5, one decimal place) derived from seeded
   * reviews.  In a real app this would be a DB aggregate; here we store it
   * directly on the product for simplicity and update it when addReview is
   * called.
   */
  rating: number;
  createdAt: string; // ISO-8601
  sellerId: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  authorName: string;
  /** Star rating 1–5 (integer). */
  rating: number;
  body: string;
  createdAt: string; // ISO-8601
}

export type UserRole = "buyer" | "seller";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface OrderItem {
  productId: string;
  qty: number;
  /** The unit price at time of purchase (snapshot — products can change price later). */
  priceCents: number;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  /** Sum of item.priceCents * item.qty for all items. */
  totalCents: number;
  createdAt: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// Input types for write operations
// ---------------------------------------------------------------------------

/** Input payload accepted by repository.addReview(). */
export interface AddReviewInput {
  productId: string;
  userId: string;
  authorName: string;
  /** Star rating 1–5. */
  rating: number;
  body: string;
}

/** Input payload accepted by repository.createOrder(). */
export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
}

// ---------------------------------------------------------------------------
// Query option types
// ---------------------------------------------------------------------------

export type ProductSortKey = "price-asc" | "price-desc" | "rating-desc" | "newest";

export interface ListProductsOptions {
  categoryId?: string;
  sort?: ProductSortKey;
  /** 1-based page number for simple pagination. */
  page?: number;
  /** Items per page (default 12). */
  pageSize?: number;
  /** Full-text search string matched against name + description. */
  q?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
