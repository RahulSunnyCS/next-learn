"use server";
// ─── _lib/actions.ts — Server Actions for Saved Items ─────────────────────────
//
// These Server Actions mutate the in-memory saved-items store, then call
// revalidateTag to invalidate the server-side 'use cache' entry.
//
// WHY separate from lib/data:
//   lib/data is a read-only fixture layer. We need a mutable store that is
//   local to this challenge (simulating a "saved items" feature not present
//   in the core data fixtures). We keep the state module-global in Node.js
//   process memory, which is fine for a dev-server demo (same trade-offs as
//   the lib/data store itself).
//
// SECURITY NOTE: in a real app these actions would validate the user session,
// sanitise inputs, and use a proper database. Here we skip auth because this
// challenge is about cache mechanics, not auth — and the task has no risk_flags.

import { revalidateTag } from "next/cache";

// ── In-process saved-items store ─────────────────────────────────────────────
//
// A module-level Set persists across requests within the same Node.js process
// (the dev server). This mirrors how lib/data's productStore works.
//
// We use a fixed userId "demo-user" so the challenge is stateless from the
// learner's perspective — no login required.
const DEMO_USER_ID = "demo-user";

// The store is a Map<userId, Set<itemId>>. We initialise it with a couple of
// items so the page is not blank on first load.
const savedItemsStore = new Map<string, Set<string>>([
  [DEMO_USER_ID, new Set(["item-alpha", "item-beta"])],
]);

// ── Cache tag ─────────────────────────────────────────────────────────────────
// This tag is what ties the Server Action to the 'use cache' boundary in page.tsx.
// When we call revalidateTag(savedItemsTag(userId)), Next.js marks the 'use cache'
// entry tagged with that string as stale and re-executes it on the next RSC render.
export function savedItemsTag(userId: string): string {
  return `saved-items:${userId}`;
}

// ── Data accessors (server-only) ─────────────────────────────────────────────

/** Returns the current saved item IDs for a user. */
export async function getSavedItems(userId: string): Promise<string[]> {
  const set = savedItemsStore.get(userId);
  if (!set) return [];
  return Array.from(set);
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean;
  error?: string;
  items?: string[];
}

/**
 * Saves an item for the demo user, then invalidates the server cache tag.
 *
 * After this action:
 *   - The 'use cache' boundary tagged with savedItemsTag(userId) is stale.
 *   - The TanStack Query cache is NOT invalidated (that is the divergence to demo).
 *   - The client must call invalidateQueries() + router.refresh() to reconcile.
 */
export async function saveItem(itemId: string): Promise<ActionResult> {
  // Input validation: itemId must be a non-empty string with no special chars.
  if (!itemId || typeof itemId !== "string" || !/^[\w-]+$/.test(itemId)) {
    return { success: false, error: "Invalid item ID" };
  }

  const set = savedItemsStore.get(DEMO_USER_ID) ?? new Set<string>();
  set.add(itemId);
  savedItemsStore.set(DEMO_USER_ID, set);

  // Invalidate the server-side 'use cache' entry.
  // The TWO-ARGUMENT form is v16's API: (tag: string, cacheProfile: string).
  // We use "seconds" so the demo shows immediate revalidation during the session.
  revalidateTag(savedItemsTag(DEMO_USER_ID));

  return { success: true, items: Array.from(set) };
}

/**
 * Removes a saved item for the demo user, then invalidates the server cache tag.
 *
 * Same cache mechanics as saveItem — the 'use cache' entry is stale after this
 * call, but the TanStack Query cache is not touched.
 */
export async function removeItem(itemId: string): Promise<ActionResult> {
  if (!itemId || typeof itemId !== "string" || !/^[\w-]+$/.test(itemId)) {
    return { success: false, error: "Invalid item ID" };
  }

  const set = savedItemsStore.get(DEMO_USER_ID);
  if (!set) return { success: true, items: [] };

  set.delete(itemId);
  savedItemsStore.set(DEMO_USER_ID, set);

  // Invalidate the server cache tag — same as saveItem.
  revalidateTag(savedItemsTag(DEMO_USER_ID));

  return { success: true, items: Array.from(set) };
}
