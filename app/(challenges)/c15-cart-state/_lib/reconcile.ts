// ─── app/(challenges)/c15-cart-state/_lib/reconcile.ts ──────────────────────
//
// Server Action: reconcileCartOnLogin
//
// Called by the client when the user logs in.  The client passes its guest
// cart items; this action reads the user's server-side saved cart and returns
// a merged result.
//
// WHY A SERVER ACTION:
//   Reading the session (getSession) requires access to the httpOnly cookie,
//   which is only available in server context.  A Server Action is the correct
//   boundary for this — the client never has direct access to the session token.
//   "use server" at the file level marks every export as a Server Action.
//
// MERGE STRATEGY — take-the-max:
//   For products that appear in both guest and server carts, keep the larger
//   quantity.  Products that appear in only one cart are preserved as-is.
//   This never silently drops items.
//
//   Why take-the-max (not add)?
//   Adding quantities can create unintended bulk purchases: user adds 1 item
//   on desktop, has 1 saved on server from yesterday → now they have 2.
//   Take-the-max respects "I want at least this many" without multiplication.
//
//   Why not server-wins or guest-wins?
//   Server-wins discards shopping done before login (bad UX).
//   Guest-wins discards items added on another device (data loss).
//   Take-the-max is the safe default; add a user prompt for a real store.
//
// SECURITY:
//   - Auth is checked first (getSession) — unauthenticated calls are rejected.
//   - Guest cart data is validated (array of CartItem) before merging.
//   - No sensitive data is returned; only cart items (product IDs, names,
//     prices, quantities) are in scope.
//   - Input quantities are validated to be positive integers.
//   - Product prices are NOT trusted from the client — in a real app you would
//     re-fetch prices from the DB.  Here we accept the guest price for
//     simplicity and note the caveat in the type.

"use server";

import { getSession } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/data";
import type { CartItem } from "./cart-store";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export type ReconcileResult =
  | { merged: true; items: CartItem[] }
  | { merged: false; reason: "unauthenticated" | "error"; message?: string };

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Reconcile a guest cart with the logged-in user's most recent saved cart.
 *
 * @param guestItems - The cart items from the client's localStorage / Zustand store.
 * @returns A ReconcileResult with the merged item list, or a reason for failure.
 *
 * The caller (CartWidget) should call `mergeCart(result.items)` on the store
 * when `result.merged === true`.
 */
export async function reconcileCartOnLogin(
  guestItems: CartItem[]
): Promise<ReconcileResult> {
  // ── STEP 1: Authentication ─────────────────────────────────────────────────
  // getSession() reads and cryptographically verifies the session cookie.
  // If there is no session, there is no user to reconcile for.
  const session = await getSession();
  if (!session) {
    return { merged: false, reason: "unauthenticated" };
  }

  // ── STEP 2: Input validation ───────────────────────────────────────────────
  // Validate the guest cart input from the client.  We cannot trust the client
  // to send well-formed data.
  if (!Array.isArray(guestItems)) {
    return { merged: false, reason: "error", message: "guestItems must be an array" };
  }

  const validatedGuestItems: CartItem[] = [];
  for (const item of guestItems) {
    // Guard: each item must have the required fields with the right types.
    if (
      typeof item.productId !== "string" ||
      item.productId.trim().length === 0 ||
      typeof item.name !== "string" ||
      typeof item.priceCents !== "number" ||
      !Number.isInteger(item.priceCents) ||
      item.priceCents < 0 ||
      typeof item.qty !== "number" ||
      !Number.isInteger(item.qty) ||
      item.qty < 1
    ) {
      // Skip malformed items rather than failing the entire reconcile.
      // A real store would log this anomaly for fraud detection.
      continue;
    }
    validatedGuestItems.push({
      productId: item.productId.trim(),
      name: item.name,
      priceCents: item.priceCents,
      qty: item.qty,
    });
  }

  // ── STEP 3: Fetch server-side cart ─────────────────────────────────────────
  // In this demo, the "server cart" is the items from the user's most recent
  // pending order.  A real e-commerce system would have a dedicated cart table.
  // We use listOrdersForUser and look for a "pending" order as a proxy.
  let serverCartItems: CartItem[] = [];
  try {
    const orders = await listOrdersForUser(session.user.id);
    // Use the most recent pending order as the "saved cart".
    const pendingOrder = orders.find((o) => o.status === "pending");
    if (pendingOrder) {
      // Map order items to CartItem.  We do not have product names here —
      // in a real app you would join with the products table.
      // For this demo we use a placeholder name.
      serverCartItems = pendingOrder.items.map((item) => ({
        productId: item.productId,
        // NOTE: names for server-side items are not readily available from
        // the orders data structure (OrderItem only has productId + priceCents).
        // In a real app, join with products.  Here we use a stub name.
        name: `Product ${item.productId}`,
        priceCents: item.priceCents,
        qty: item.qty,
      }));
    }
  } catch (err) {
    // Log the error server-side.  Reconcile can still succeed with only the
    // guest cart — a failed server cart fetch should not lose guest items.
    console.error("[reconcileCartOnLogin] Failed to fetch server cart:", err);
    // Fall through with empty serverCartItems.
  }

  // ── STEP 4: Merge ──────────────────────────────────────────────────────────
  // take-the-max strategy: for products in both carts, keep larger qty.
  const mergedMap = new Map<string, CartItem>();

  // Seed with server cart items first.
  for (const item of serverCartItems) {
    mergedMap.set(item.productId, { ...item });
  }

  // Walk guest items and apply take-the-max.
  for (const guestItem of validatedGuestItems) {
    const existing = mergedMap.get(guestItem.productId);
    if (existing) {
      // Product in both — take the larger quantity.
      mergedMap.set(guestItem.productId, {
        ...existing,
        // Prefer guest item's name/price as it comes from the current
        // product catalog (fresher than a saved order snapshot).
        name: guestItem.name,
        priceCents: guestItem.priceCents,
        qty: Math.max(existing.qty, guestItem.qty),
      });
    } else {
      // Only in guest cart — preserve it.
      mergedMap.set(guestItem.productId, { ...guestItem });
    }
  }

  return { merged: true, items: Array.from(mergedMap.values()) };
}
