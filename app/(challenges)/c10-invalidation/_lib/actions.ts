"use server";

/**
 * actions.ts — C10 Challenge
 *
 * Server Actions for the invalidation + footgun challenge.
 *
 * This file contains THREE versions of the same "add a review" action to teach
 * the invalidation mechanics:
 *
 * 1. addReviewBuggy — submits a review but calls revalidateTag with the WRONG
 *    tag. The cached list is never purged. This is the FOOTGUN.
 *
 * 2. addReviewFixed — submits the same review and calls revalidateTag with the
 *    CORRECT tag that matches the cacheTag() used inside getCachedReviews (in
 *    page.tsx). The cached list IS purged and the next request shows fresh data.
 *
 * 3. enableDraft / disableDraft — toggle draftMode for the mini-lab page.
 *
 * KEY POINT — revalidateTag SIGNATURE IN NEXT.JS 16
 * ──────────────────────────────────────────────────
 * In Next.js 16, revalidateTag requires TWO arguments:
 *   revalidateTag(tag: string, profile: string | CacheLifeConfig): undefined
 *
 * The second argument is the cacheLife profile name (e.g. "hours", "minutes")
 * or an inline CacheLifeConfig object ({ expire?: number }).
 *
 * The legacy one-argument form:
 *   revalidateTag(tag)   ← DOES NOT COMPILE in v16 TypeScript strict mode.
 *
 * ALWAYS pass the same profile string you used in cacheLife() inside the
 * cached function. This is required so the cache knows how to re-schedule
 * background revalidation after the tag purge.
 *
 * SECURITY NOTE
 * ─────────────
 * Input validation is performed before the write:
 * - rating must be an integer 1–5
 * - body must be non-empty after trimming
 * - productId is a hard-coded constant (not taken from form data) to prevent
 *   ID injection
 */

import { revalidateTag, revalidatePath } from "next/cache";
import { draftMode } from "next/headers";
import { addReview as repoAddReview, tags } from "@/lib/data";

// The product we demo reviews for. Hard-coded to prevent parameter injection
// from the form — a real app would validate this against an allowlist or DB.
const DEMO_PRODUCT_ID = "p-elec-001";

// ─── Input validation helper ─────────────────────────────────────────────────

function validateReviewInput(
  formData: FormData
): { rating: number; body: string; error?: string } {
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

// ─── 1. Buggy Action — wrong tag (the FOOTGUN) ───────────────────────────────

/**
 * Writes a review, then calls revalidateTag with the WRONG tag.
 *
 * The cached function getCachedReviewsBuggy uses:
 *   cacheTag(tags.product(productId))   ← tag: "product:p-elec-001"
 *
 * But this action calls:
 *   revalidateTag(tags.reviews(productId), "hours")  ← purges "reviews:p-elec-001"
 *
 * Result: the cached entry is NEVER purged. The user continues to see the
 * stale review list until the cacheLife TTL expires naturally (up to 1 hour).
 * THIS IS THE FOOTGUN.
 */
export async function addReviewBuggy(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const { rating, body, error } = validateReviewInput(formData);
  if (error) return { error };

  await repoAddReview({
    productId: DEMO_PRODUCT_ID,
    userId: "u-buyer-1",
    authorName: "Demo User",
    rating,
    body,
  });

  // BUG: We're purging tags.reviews(productId) = "reviews:p-elec-001"
  // but the buggy cached function is tagged with tags.product(productId) = "product:p-elec-001".
  // These are DIFFERENT strings. The cache entry is NOT invalidated.
  revalidateTag(tags.reviews(DEMO_PRODUCT_ID), "hours");
  // Note: we deliberately do NOT call revalidatePath here for the buggy version
  // to make the stale-serve visible.

  return { success: true };
}

// ─── 2. Fixed Action — correct tag ───────────────────────────────────────────

/**
 * Writes a review, then calls revalidateTag with the CORRECT tag.
 *
 * The fixed cached function getCachedReviews uses:
 *   cacheTag(tags.reviews(productId))   ← tag: "reviews:p-elec-001"
 *
 * This action calls:
 *   revalidateTag(tags.reviews(productId), "hours")  ← purges "reviews:p-elec-001"
 *
 * Result: the cached entry IS purged. The next request re-runs the function
 * and returns the fresh list (including the just-added review).
 *
 * We also call revalidatePath as a belt-and-suspenders: it purges the full
 * route cache for /c10-invalidation regardless of tags, ensuring the page
 * shell itself is also refreshed.
 */
export async function addReviewFixed(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const { rating, body, error } = validateReviewInput(formData);
  if (error) return { error };

  await repoAddReview({
    productId: DEMO_PRODUCT_ID,
    userId: "u-buyer-1",
    authorName: "Demo User",
    rating,
    body,
  });

  // CORRECT: tag matches exactly what getCachedReviews uses in cacheTag().
  // Second argument "hours" is the cacheLife profile — required in v16.
  revalidateTag(tags.reviews(DEMO_PRODUCT_ID), "hours");

  // Belt-and-suspenders: also invalidate the full route path.
  // revalidatePath purges every cached response for /c10-invalidation
  // regardless of what tags were used. Useful as a fallback when tag
  // discipline is not guaranteed (e.g. third-party pages, CMS content).
  revalidatePath("/c10-invalidation");

  return { success: true };
}

// ─── 3. Draft Mode Actions ────────────────────────────────────────────────────

/**
 * Enables draft mode for the current session.
 * While active, `'use cache'` boundaries are bypassed — the response is always
 * rendered fresh. Designed for CMS editors previewing unpublished content.
 */
export async function enableDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.enable();
  // No revalidate needed — draft mode is a per-request flag in a cookie,
  // not a cache entry that needs purging.
  revalidatePath("/c10-invalidation/draft");
}

/**
 * Disables draft mode. Caching resumes normally for subsequent requests.
 */
export async function disableDraftMode(): Promise<void> {
  const draft = await draftMode();
  draft.disable();
  revalidatePath("/c10-invalidation/draft");
}
