/**
 * Barrel re-export for the lib/data module.
 *
 * Import convention for consumers:
 *   import { listProducts, getProductBySlug, tags } from "@/lib/data";
 *
 * All public symbols are re-exported here so challenge pages and Route
 * Handlers only need a single import path.  The internal sub-modules
 * (store, fixtures) are intentionally NOT re-exported — they are
 * implementation details that external code should not depend on directly.
 */

// Types
export type {
  Category,
  Product,
  Review,
  User,
  Order,
  OrderItem,
  OrderStatus,
  UserRole,
  AddReviewInput,
  CreateOrderInput,
  ListProductsOptions,
  PaginatedResult,
  ProductSortKey,
} from "./types";

// Repository (async data accessors)
export {
  delay,
  listCategories,
  getCategoryBySlug,
  getCategoryById,
  listProducts,
  getProductBySlug,
  getProductById,
  listProductsBySeller,
  listReviews,
  addReview,
  getUserById,
  getUserByEmail,
  listOrdersForUser,
  getOrderById,
  createOrder,
} from "./repository";

// Cache tags
export { tags } from "./tags";
export { default as tagHelpers } from "./tags";
