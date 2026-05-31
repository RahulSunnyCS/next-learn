/**
 * Unit tests for lib/data/repository.ts.
 *
 * Scope: proves that every accessor returns seeded data and that the write
 * operations behave correctly (addReview updates rating, createOrder
 * decrements stock, invalid inputs throw).
 *
 * Note on test isolation: each test imports the module fresh via the live
 * in-memory store.  Because vitest does not isolate module state between
 * tests by default, write operations (addReview, createOrder) that mutate
 * the store are tested last or use fixture IDs that won't interfere with
 * read-only tests.  Where isolation matters (stock decrement), the test
 * reads the before-state, performs the write, then reads the after-state.
 */

import { describe, it, expect } from "vitest";
import {
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
} from "../repository";
import { tags } from "../tags";
import { CATEGORIES, PRODUCTS, USERS, REVIEWS, ORDERS } from "../fixtures";

// ---------------------------------------------------------------------------
// Category tests
// ---------------------------------------------------------------------------

describe("listCategories", () => {
  it("returns all seeded categories", async () => {
    const result = await listCategories();
    expect(result).toHaveLength(CATEGORIES.length);
  });

  it("returns categories sorted alphabetically by name", async () => {
    const result = await listCategories();
    const names = result.map((c) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe("getCategoryBySlug", () => {
  it("returns the category with a matching slug", async () => {
    const cat = await getCategoryBySlug("electronics");
    expect(cat).not.toBeNull();
    expect(cat!.id).toBe("cat-electronics");
  });

  it("returns null for an unknown slug", async () => {
    const cat = await getCategoryBySlug("nonexistent-slug");
    expect(cat).toBeNull();
  });
});

describe("getCategoryById", () => {
  it("returns the category with a matching id", async () => {
    const cat = await getCategoryById("cat-books");
    expect(cat).not.toBeNull();
    expect(cat!.slug).toBe("books");
  });
});

// ---------------------------------------------------------------------------
// Product tests
// ---------------------------------------------------------------------------

describe("listProducts", () => {
  it("returns seeded products (first page, default page size)", async () => {
    const result = await listProducts();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.totalCount).toBe(PRODUCTS.length);
  });

  it("filters by categoryId", async () => {
    const result = await listProducts({ categoryId: "cat-electronics" });
    expect(result.items.length).toBeGreaterThan(0);
    for (const product of result.items) {
      expect(product.categoryId).toBe("cat-electronics");
    }
  });

  it("sorts by price-asc", async () => {
    const result = await listProducts({ sort: "price-asc", pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("sorts by price-desc", async () => {
    const result = await listProducts({ sort: "price-desc", pageSize: 100 });
    const prices = result.items.map((p) => p.priceCents);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it("filters by full-text search (q)", async () => {
    const result = await listProducts({ q: "merino", pageSize: 100 });
    expect(result.items.length).toBeGreaterThan(0);
    for (const product of result.items) {
      const combined = (product.name + " " + product.description).toLowerCase();
      expect(combined).toContain("merino");
    }
  });

  it("paginates correctly (page 1 + page 2 are non-overlapping)", async () => {
    const page1 = await listProducts({ page: 1, pageSize: 5 });
    const page2 = await listProducts({ page: 2, pageSize: 5 });
    const ids1 = new Set(page1.items.map((p) => p.id));
    const ids2 = new Set(page2.items.map((p) => p.id));
    for (const id of ids2) {
      expect(ids1.has(id)).toBe(false);
    }
  });

  it("returns correct totalPages", async () => {
    const result = await listProducts({ pageSize: 10 });
    const expected = Math.ceil(PRODUCTS.length / 10);
    expect(result.totalPages).toBe(expected);
  });
});

describe("getProductBySlug", () => {
  it("returns the product with the matching slug", async () => {
    const product = await getProductBySlug("wireless-noise-cancelling-headphones");
    expect(product).not.toBeNull();
    expect(product!.id).toBe("p-elec-001");
  });

  it("returns null for an unknown slug", async () => {
    const product = await getProductBySlug("no-such-product");
    expect(product).toBeNull();
  });
});

describe("getProductById", () => {
  it("returns the product with the matching id", async () => {
    const product = await getProductById("p-book-001");
    expect(product).not.toBeNull();
    expect(product!.slug).toBe("the-pragmatic-programmer-20th-anniversary");
  });
});

describe("listProductsBySeller", () => {
  it("returns only products belonging to the specified seller", async () => {
    const products = await listProductsBySeller("u-seller-1");
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      expect(p.sellerId).toBe("u-seller-1");
    }
  });

  it("returns an empty array for an unknown seller", async () => {
    const products = await listProductsBySeller("u-no-seller");
    expect(products).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Review tests
// ---------------------------------------------------------------------------

describe("listReviews", () => {
  it("returns reviews for a product that has seeded reviews", async () => {
    const reviews = await listReviews("p-elec-001");
    expect(reviews.length).toBeGreaterThan(0);
    for (const r of reviews) {
      expect(r.productId).toBe("p-elec-001");
    }
  });

  it("returns most recent review first", async () => {
    const reviews = await listReviews("p-elec-001");
    for (let i = 1; i < reviews.length; i++) {
      expect(reviews[i].createdAt <= reviews[i - 1].createdAt).toBe(true);
    }
  });

  it("returns an empty array for a product with no reviews", async () => {
    // p-elec-007 (USB-C Docking Station) has no seeded reviews.
    const reviews = await listReviews("p-elec-007");
    expect(reviews).toHaveLength(0);
  });
});

describe("addReview", () => {
  it("adds a review and returns it with a generated id", async () => {
    const before = await listReviews("p-elec-003");
    const review = await addReview({
      productId:  "p-elec-003",
      userId:     "u-buyer-1",
      authorName: "Jamie Rivera",
      rating:     4,
      body:       "Great action camera for the price.",
    });
    expect(review.id).toBeDefined();
    expect(review.productId).toBe("p-elec-003");
    expect(review.rating).toBe(4);

    const after = await listReviews("p-elec-003");
    expect(after.length).toBe(before.length + 1);
  });

  it("updates the product rating after adding a review", async () => {
    // Use p-elec-006 (Portable Bluetooth Speaker) — no seeded reviews.
    // We read the current reviews list first so the expected mean is always
    // computed from the live store state (guards against test-ordering effects).
    const reviewsBefore = await listReviews("p-elec-006");

    await addReview({
      productId:  "p-elec-006",
      userId:     "u-buyer-2",
      authorName: "Sam Patel",
      rating:     3,
      body:       "Good speaker but the bass is a bit lacking.",
    });

    const productAfter = await getProductById("p-elec-006");
    const reviewsAfter  = await listReviews("p-elec-006");

    // The new rating should be the mean of ALL reviews now in the store.
    const expectedRating =
      Math.round(
        (reviewsAfter.reduce((s, r) => s + r.rating, 0) / reviewsAfter.length) * 10
      ) / 10;

    expect(productAfter!.rating).toBe(expectedRating);
    // The review list should have grown by exactly one.
    expect(reviewsAfter.length).toBe(reviewsBefore.length + 1);
  });

  it("throws for an out-of-range rating", async () => {
    await expect(
      addReview({
        productId:  "p-elec-001",
        userId:     "u-buyer-1",
        authorName: "Jamie Rivera",
        rating:     6,
        body:       "Too high a rating.",
      })
    ).rejects.toThrow("rating must be an integer between 1 and 5");
  });

  it("throws for an empty review body", async () => {
    await expect(
      addReview({
        productId:  "p-elec-001",
        userId:     "u-buyer-1",
        authorName: "Jamie Rivera",
        rating:     3,
        body:       "   ",
      })
    ).rejects.toThrow("review body must not be empty");
  });

  it("throws for a non-existent productId", async () => {
    await expect(
      addReview({
        productId:  "p-does-not-exist",
        userId:     "u-buyer-1",
        authorName: "Jamie Rivera",
        rating:     3,
        body:       "Phantom product review.",
      })
    ).rejects.toThrow("product not found");
  });
});

// ---------------------------------------------------------------------------
// User tests
// ---------------------------------------------------------------------------

describe("getUserById", () => {
  it("returns the seller user by id", async () => {
    const user = await getUserById("u-seller-1");
    expect(user).not.toBeNull();
    expect(user!.role).toBe("seller");
  });

  it("returns a buyer user by id", async () => {
    const user = await getUserById("u-buyer-1");
    expect(user).not.toBeNull();
    expect(user!.role).toBe("buyer");
  });

  it("returns null for an unknown id", async () => {
    const user = await getUserById("u-nobody");
    expect(user).toBeNull();
  });
});

describe("getUserByEmail", () => {
  it("finds a user by exact email", async () => {
    const user = await getUserByEmail("seller@nextmart.dev");
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u-seller-1");
  });

  it("finds a user by case-insensitive email", async () => {
    const user = await getUserByEmail("BUYER1@NEXTMART.DEV");
    expect(user).not.toBeNull();
    expect(user!.id).toBe("u-buyer-1");
  });

  it("returns null for an unknown email", async () => {
    const user = await getUserByEmail("ghost@example.com");
    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Order tests
// ---------------------------------------------------------------------------

describe("listOrdersForUser", () => {
  it("returns orders for a user that has seeded orders", async () => {
    const orders = await listOrdersForUser("u-buyer-1");
    expect(orders.length).toBeGreaterThan(0);
    for (const o of orders) {
      expect(o.userId).toBe("u-buyer-1");
    }
  });

  it("returns most recent order first", async () => {
    const orders = await listOrdersForUser("u-buyer-1");
    if (orders.length >= 2) {
      expect(orders[0].createdAt >= orders[1].createdAt).toBe(true);
    }
  });

  it("returns an empty array for a user with no orders", async () => {
    const orders = await listOrdersForUser("u-no-orders");
    expect(orders).toHaveLength(0);
  });
});

describe("getOrderById", () => {
  it("returns the seeded order by id", async () => {
    const order = await getOrderById("o-001");
    expect(order).not.toBeNull();
    expect(order!.userId).toBe("u-buyer-1");
    expect(order!.items.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown order id", async () => {
    const order = await getOrderById("o-does-not-exist");
    expect(order).toBeNull();
  });
});

describe("createOrder", () => {
  it("creates an order and decrements stock", async () => {
    const targetId = "p-home-001"; // bamboo cutting board, stock=95
    const productBefore = await getProductById(targetId);
    const stockBefore = productBefore!.stock;

    const order = await createOrder({
      userId: "u-buyer-2",
      items: [{ productId: targetId, qty: 2, priceCents: 3499 }],
    });

    expect(order.id).toBeDefined();
    expect(order.status).toBe("pending");
    expect(order.totalCents).toBe(3499 * 2);
    expect(order.items[0].productId).toBe(targetId);

    const productAfter = await getProductById(targetId);
    expect(productAfter!.stock).toBe(stockBefore - 2);
  });

  it("throws for insufficient stock", async () => {
    // p-elec-002 laptop has stock=15; requesting 9999 should fail.
    await expect(
      createOrder({
        userId: "u-buyer-1",
        items: [{ productId: "p-elec-002", qty: 9999, priceCents: 129999 }],
      })
    ).rejects.toThrow("insufficient stock");
  });

  it("throws for empty items list", async () => {
    await expect(
      createOrder({ userId: "u-buyer-1", items: [] })
    ).rejects.toThrow("at least one item");
  });

  it("throws for a non-existent product", async () => {
    await expect(
      createOrder({
        userId: "u-buyer-1",
        items: [{ productId: "p-ghost-product", qty: 1, priceCents: 100 }],
      })
    ).rejects.toThrow("product not found");
  });
});

// ---------------------------------------------------------------------------
// Tags module
// ---------------------------------------------------------------------------

describe("tags", () => {
  it("exports a stable products collection tag", () => {
    expect(tags.products).toBe("products");
  });

  it("exports a stable categories collection tag", () => {
    expect(tags.categories).toBe("categories");
  });

  it("generates a per-product tag from an id", () => {
    expect(tags.product("p-elec-001")).toBe("product:p-elec-001");
  });

  it("generates a per-product tag from a slug", () => {
    expect(tags.product("wireless-noise-cancelling-headphones")).toBe(
      "product:wireless-noise-cancelling-headphones"
    );
  });

  it("generates a reviews tag scoped to a product", () => {
    expect(tags.reviews("p-elec-001")).toBe("reviews:p-elec-001");
  });

  it("generates a user tag", () => {
    expect(tags.user("u-buyer-1")).toBe("user:u-buyer-1");
  });

  it("generates an orders tag scoped to a user", () => {
    expect(tags.orders("u-buyer-1")).toBe("orders:u-buyer-1");
  });

  it("generates a seller-products tag", () => {
    expect(tags.sellerProducts("u-seller-1")).toBe("seller-products:u-seller-1");
  });
});

// ---------------------------------------------------------------------------
// Seed data integrity checks
// ---------------------------------------------------------------------------

describe("seed data integrity", () => {
  it("every product references a valid categoryId", () => {
    const catIds = new Set(CATEGORIES.map((c) => c.id));
    for (const p of PRODUCTS) {
      expect(catIds.has(p.categoryId)).toBe(true);
    }
  });

  it("every review references a valid productId", () => {
    const prodIds = new Set(PRODUCTS.map((p) => p.id));
    for (const r of REVIEWS) {
      expect(prodIds.has(r.productId)).toBe(true);
    }
  });

  it("every review references a valid userId", () => {
    const userIds = new Set(USERS.map((u) => u.id));
    for (const r of REVIEWS) {
      expect(userIds.has(r.userId)).toBe(true);
    }
  });

  it("every order references a valid userId", () => {
    const userIds = new Set(USERS.map((u) => u.id));
    for (const o of ORDERS) {
      expect(userIds.has(o.userId)).toBe(true);
    }
  });

  it("every order item references a valid productId", () => {
    const prodIds = new Set(PRODUCTS.map((p) => p.id));
    for (const o of ORDERS) {
      for (const item of o.items) {
        expect(prodIds.has(item.productId)).toBe(true);
      }
    }
  });

  it("has at least one seller user in the fixtures", () => {
    const sellers = USERS.filter((u) => u.role === "seller");
    expect(sellers.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 24 products (storefront coverage)", () => {
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(24);
  });
});
