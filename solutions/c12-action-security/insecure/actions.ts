"use server";
// ─── solutions/c12-action-security/insecure/actions.ts ───────────────────────
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  INSECURE — FOR DEMONSTRATION ONLY.  NEVER SHIP THIS CODE.              ║
// ║  This file is a teaching artefact showing FOUR deliberate vulnerabilities.║
// ║  It lives under solutions/ and is NEVER imported by the live application. ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// This "use server" action marks the function as a Next.js Server Action —
// an HTTP POST endpoint.  Despite running server-side, it is fully reachable
// by anyone who knows the action ID (exposed in the HTML source as
// $$ACTION_ID comments or discovered by enumeration).
//
// VULNERABILITIES:
//   1. No authentication  — no getSession() call; any HTTP client can invoke it
//   2. No authorization   — no ownership check; any user can edit any review
//   3. No input validation — no Zod; caller controls rating and body values freely
//   4. No rate limiting   — no counter; attacker can flood with 10k/s requests
//
// See README.md in this directory for attack walkthroughs.

// We import only what is needed to simulate the mutation.
// Note: this file NEVER uses lib/auth — that is the entire point.
import type { Review } from "@/lib/data";

// ── INSECURE editReview ───────────────────────────────────────────────────────
//
// This action receives a reviewId, rating, and body and blindly applies them
// to the store.  There is no check for:
//   - Whether the caller has a valid session
//   - Whether the caller owns the review being edited
//   - Whether rating is within 1–5 or body is non-empty / within length limits
//
// VULNERABILITY 1 — No Authentication:
//   The action can be called by any HTTP client without a session cookie.
//   Example attack: see README.md → Attack 1.
//
// VULNERABILITY 2 — No Authorization (IDOR):
//   An authenticated user can supply any reviewId and edit a review they do
//   not own.  Example attack: see README.md → Attack 2.
//
// VULNERABILITY 3 — No Input Validation:
//   A caller can pass rating: 999 which corrupts the product's average rating.
//   Example attack: see README.md → Attack 3.
//
// VULNERABILITY 4 — No Rate Limiting:
//   A bot can call this 10,000 times per second with arbitrary payloads.

export async function insecureEditReview(
  reviewId: string,
  rating: number,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  // !! NO AUTHENTICATION — any caller reaches this point !!

  // !! NO AUTHORIZATION — we do not check who owns this review !!

  // !! NO VALIDATION — we trust rating and body completely !!
  // rating could be -1, 0, 6, 999, NaN, Infinity, or a string coerced via
  // TypeScript erasure at runtime.

  // Simulate the store write.  In the real insecure scenario this would call
  // the repository directly:
  //
  //   const { reviewStore } = await import("@/lib/data/store");
  //   const review = reviewStore.get(reviewId);
  //   if (!review) return { ok: false, error: "Not found" };
  //   review.rating = rating;   // ← unchecked — could be 999
  //   review.body   = body;     // ← unchecked — could be 10MB
  //   reviewStore.set(review.id, review);
  //
  // We do NOT actually run the write here because this file is a teaching
  // artefact only — it should never touch the store.

  // Return success to simulate what the insecure action would return.
  return { ok: true };
}

// ── What the hardened version looks like (contrast) ──────────────────────────
//
// The hardened version in app/(challenges)/c12-action-security/_lib/actions.ts
// does this instead:
//
//   1. const session = await getSession();            // Authentication
//      if (!session) return { ok: false, error: "Unauthorized" };
//
//   2. if (isRateLimited(session.user.id)) { ... }   // Rate limit
//
//   3. const parsed = editReviewSchema.safeParse(...); // Validation
//      if (!parsed.success) { ... }
//
//   4. const review = reviewStore.get(validatedId);   // Authorization
//      if (!review || review.userId !== session.user.id)
//        return { ok: false, error: "Forbidden" };
//
//   5. review.rating = validatedRating;               // Write (all guards passed)
//      review.body = validatedBody;
//
// Compare this file (0 guards) to that file (4 guards) to see the full delta.

export type InsecureEditReviewResult = Awaited<ReturnType<typeof insecureEditReview>>;
