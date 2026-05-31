// ─── _lib/tags.ts ─────────────────────────────────────────────────────────────
//
// Non-"use server" module for cache-tag helper functions.
//
// WHY A SEPARATE FILE:
//   In a "use server" module every export must be an async function (they
//   become Server Actions). A plain synchronous string helper cannot live
//   there. Moving tag helpers here keeps them importable from any context
//   (server components, route handlers, server actions) without triggering
//   the "Server Actions must be async functions" build error.

/** Returns the per-user saved-items cache tag used by cacheTag() and revalidateTag(). */
export function savedItemsTag(userId: string): string {
  return `saved-items:${userId}`;
}
