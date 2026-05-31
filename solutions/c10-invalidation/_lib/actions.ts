"use server";

/**
 * solutions/c10-invalidation/_lib/actions.ts
 *
 * Reference implementation of the Server Actions for C10.
 *
 * This file mirrors the challenge's _lib/actions.ts but is the canonical
 * "correct" version — only the FIXED action (addReview), draft mode toggles,
 * and a path revalidation demo are included. The buggy version is intentionally
 * omitted from the solution to avoid confusion.
 *
 * IMPORTANT — revalidateTag v16 signature:
 * ─────────────────────────────────────────
 * In Next.js 16, the type definition is:
 *   revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined
 *
 * The second argument `profile` is a cacheLife profile name ("hours", "minutes",
 * "days", etc.) or an inline CacheLifeConfig ({ expire?: number }).
 *
 * FOOTGUN: omitting the second argument:
 *   revalidateTag("reviews:p-elec-001")  ← TypeScript ERROR in v16
 *   // Expected 2 arguments, but got 1.
 *
 * This is the most common migration mistake from Next.js 14/15.
 * Always pair your revalidateTag call with the same profile used in cacheLife()
 * inside the cached function.
 */

import { revalidateTag, revalidatePath } from "next/cache";
import { draftMode } from "next/headers";
// Alias the repository function to avoid naming collision with the exported
// Server Action below (both are called addReview but serve different purposes).
import { addReview as repoAddReview, tags } from "@/lib/data";

const DEMO_PRODUCT_ID = "p-elec-001";

// ─── Input validation ─────────────────────────────────────────────────────────

function parseReviewFormData(formData: FormData): {
  rating: number;
  body: string;
  error?: string;
} {
  const ratingStr = formData.get("rating");
  const rating = ratingStr ? parseInt(String(ratingStr), 10) : NaN;
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { rating: NaN, body, error: "Rating must be an integer between 1 and 5." };
  }
  if (!body) {
    return { rating, body, error: "Review body must not be empty." };
  }
  return { rating, body };
}

// ─── Primary action: addReview (correct invalidation) ────────────────────────

/**
 * Adds a review and correctly invalidates the cache.
 *
 * Steps:
 * 1. Validate inputs (guard against bad rating/empty body).
 * 2. Write to the in-memory store via lib/data's addReview.
 * 3. revalidateTag(tags.reviews(productId), "hours")
 *    → purges the cache entry created by getCachedReviews (which uses the
 *      same tag and the same "hours" profile).
 * 4. revalidatePath("/c10-invalidation")
 *    → belt-and-suspenders: also purges the full-route cache for the challenge
 *      page, so even components NOT using the reviews tag get refreshed.
 *
 * WHY two invalidation calls?
 * - revalidateTag is surgical: it only purges entries with the matching tag.
 *   Fast and precise. Use this when you know exactly which cache entries to
 *   purge (i.e. you own the cacheTag() call).
 * - revalidatePath is a sledgehammer: it purges everything cached for a URL.
 *   Use it when you are not sure which tags were used (third-party components,
 *   CMS content, etc.), or as a safety net alongside revalidateTag.
 *
 * Using both together is a valid production pattern: the tag purge handles
 * the data layer, the path purge handles any page-level cache you might have
 * missed.
 */
export async function addReview(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const { rating, body, error } = parseReviewFormData(formData);
  if (error) return { error };

  // Write to the data store. This is the only mutation in this challenge.
  // In a real app this would be a DB write; here it mutates the in-memory store.
  await repoAddReview({
    productId: DEMO_PRODUCT_ID,
    userId:     "u-buyer-1",
    authorName: "Demo User",
    rating,
    body,
  });

  // CORRECT two-argument form — required in v16.
  // Tag: "reviews:p-elec-001" (matches getCachedReviews' cacheTag call)
  // Profile: "hours" (matches getCachedReviews' cacheLife call)
  revalidateTag(tags.reviews(DEMO_PRODUCT_ID), "hours");

  // Belt-and-suspenders path invalidation.
  revalidatePath("/c10-invalidation");

  return { success: true };
}

// ─── Draft mode toggles ───────────────────────────────────────────────────────

export async function enableDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.enable();
  revalidatePath("/c10-invalidation/draft");
}

export async function disableDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.disable();
  revalidatePath("/c10-invalidation/draft");
}
