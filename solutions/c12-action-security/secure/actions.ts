"use server";
// ─── solutions/c12-action-security/secure/actions.ts ─────────────────────────
//
// Hardened Server Action — annotated reference implementation.
//
// This file is a HEAVILY COMMENTED reference for learners.
// The LIVE application uses the identical logic in:
//   app/(challenges)/c12-action-security/_lib/actions.ts
//
// Read this file alongside the insecure version in ../insecure/actions.ts
// to see every security guard and why it is in the order it is.

import { getSession } from "@/lib/auth";
import { getReviewById } from "@/lib/data";
import { z } from "zod";

// ── Zod schema ────────────────────────────────────────────────────────────────
//
// Why Zod in the action and not just in the browser form?
//
//   Browser validation is under the user's control.  A Server Action receives
//   raw HTTP data — it has no idea whether it came from the UI or from curl.
//   The Zod parse is the ONLY reliable validation gate.
//
// Why these specific constraints?
//   - reviewId: must be a non-empty string (store IDs are strings; we don't
//     impose a format here — existence + ownership are checked against the
//     actual store next)
//   - rating: integer 1–5.  .int() rejects 2.7 (float corruption).
//     .min(1).max(5) rejects 0, -1, 6, 999 (range corruption).
//   - body: .trim() collapses "   " to "" which fails min(1).
//     .max(2000) prevents a 10MB body that would consume 10MB of heap per
//     concurrent request.

const editReviewSchema = z.object({
  reviewId: z.string().min(1, "Review ID is required"),
  // Zod v4 uses { error: "..." } not { invalid_type_error: "..." }.
  rating: z
    .number({ error: "Rating must be a number" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  body: z
    .string({ error: "Body must be a string" })
    .trim()
    .min(1, "Review body must not be empty")
    .max(2000, "Review body must not exceed 2000 characters"),
});

// ── In-memory rate limiter ────────────────────────────────────────────────────
//
// PURPOSE: Limit the rate at which a single authenticated user can invoke this
// action.  Prevents enumeration attacks, brute-force floods, and amplified writes.
//
// MECHANISM:
//   A module-level Map holds { count, windowStart } per userId.
//   On each call, if the window has expired, start a new one.
//   If count >= MAX_REQUESTS within the window, return true (rate-limited).
//
// LIMITATIONS (production trade-offs):
//   1. Single-process only — does not work across replicas or after restart.
//   2. Window is fixed (resets at windowStart + WINDOW_MS) — a burst at window
//      edge can fire 2× MAX_REQUESTS in < WINDOW_MS.  A sliding-window
//      algorithm (Redis + sorted set) is precise but adds latency.
//
// PRODUCTION REPLACEMENT:
//   import { Ratelimit } from "@upstash/ratelimit";
//   import { Redis }      from "@upstash/redis";
//   const limiter = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(10, "1 m"),
//   });
//   const { success } = await limiter.limit(session.user.id);
//   if (!success) return { ok: false, error: "Too many requests" };

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

interface RateLimitEntry { count: number; windowStart: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= MAX_REQUESTS) return true;
  entry.count += 1;
  return false;
}

// ── Return type ───────────────────────────────────────────────────────────────
//
// Discriminated union rather than throwing so the form component can distinguish
// error types without a try/catch.  Throwing causes Next.js to display a
// generic error boundary (unhelpful for per-field validation messages).

export type EditReviewResult =
  | { ok: true;  reviewId: string }
  | { ok: false; error: string; issues?: string[] };

// ── The hardened action ───────────────────────────────────────────────────────
//
// Security layers and ORDER:
//
//   L1 Authentication  — getSession(); reject if null
//      WHY FIRST: cheapest gate.  No point parsing input or hitting the DB
//      for a caller we cannot identify.
//
//   L2 Rate limiting   — check counter; reject if over limit
//      WHY AFTER AUTH: we key the counter by verified session user ID.
//      Keying by caller-supplied value (e.g. an IP header) can be spoofed.
//
//   L3 Input validation — Zod.safeParse; reject if invalid
//      WHY AFTER RATE LIMIT: prevents an authenticated user from flooding
//      the Zod parser with malformed input.
//
//   L4 Authorization   — fetch resource, check ownership; reject if not owner
//      WHY AFTER VALIDATION: we only do a store read for inputs that are valid
//      (correct types, in range).  Prevents nonsensical store reads.
//
//   L5 Write           — apply validated, authorized mutation
//      WHY LAST: all guards have passed; the write is safe.

export async function editReview(
  reviewId: string,
  rating: number,
  body: string
): Promise<EditReviewResult> {

  // ── L1: Authentication ──────────────────────────────────────────────────────
  //
  // getSession() reads + cryptographically verifies the session JWT cookie.
  // Returns null if: cookie absent, JWT expired, JWT tampered, JWT malformed.
  //
  // GENERIC ERROR: we return "Unauthorized" not "no session found" or "invalid
  // token".  Detailed errors help attackers enumerate session states.
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  // ── L2: Rate limiting ───────────────────────────────────────────────────────
  //
  // Keyed by session.user.id — a server-verified identity, not a caller-supplied
  // value.  Called after auth so we never increment the counter for anonymous
  // requests (those are blocked cheaply in L1).
  if (isRateLimited(session.user.id)) {
    return { ok: false, error: "Too many requests — please wait before editing again" };
  }

  // ── L3: Input validation ────────────────────────────────────────────────────
  //
  // Parse through the Zod schema.  safeParse returns { success, data, error }
  // rather than throwing, which lets us collect all issues at once.
  //
  // After this point we ONLY use parsed.data — never the raw inputs.
  // TypeScript enforces this: `rating` (a `number`) could be NaN at runtime
  // (FormData converts "abc" to NaN via Number()); parsed.data.rating is
  // guaranteed to be an integer 1–5.
  const parsed = editReviewSchema.safeParse({ reviewId, rating, body });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message);
    return { ok: false, error: "Bad Request", issues };
  }

  const {
    reviewId: validatedId,
    rating:   validatedRating,
    body:     validatedBody,
  } = parsed.data;

  // ── L4: Authorization — IDOR prevention ────────────────────────────────────
  //
  // Fetch the review from the store and verify ownership.
  //
  // CRITICAL DESIGN DECISIONS:
  //
  //   (a) We use session.user.id (server-verified) NOT any caller-supplied
  //       userId.  If the action accepted a "userId" parameter and checked
  //       that instead, the caller could pass any userId they liked.
  //
  //   (b) Both "not found" and "wrong owner" return "Forbidden" — not "not
  //       found".  A distinct "not found" error would let an attacker brute-
  //       force valid review IDs (try IDs until "Forbidden" instead of "not
  //       found" — that tells them the ID exists).
  //
  //   (c) Checking ownership BEFORE writing prevents a Time-Of-Check-To-Time-
  //       Of-Use (TOCTOU) race.  In a DB this would be expressed as:
  //         UPDATE reviews SET ... WHERE id=? AND user_id=?
  //       which checks ownership atomically at write time.

  // Use getReviewById() from the public lib/data interface.
  // This avoids importing the internal store module directly, keeping the store
  // as an implementation detail.  In a real app: DB query by primary key.
  const review = await getReviewById(validatedId);

  // Generic "Forbidden" for both "not found" and "not the owner".
  if (!review || review.userId !== session.user.id) {
    return { ok: false, error: "Forbidden" };
  }

  // ── L5: Write ───────────────────────────────────────────────────────────────
  //
  // All four guards passed.  Safe to apply the validated mutation.
  //
  // We use validatedRating and validatedBody — not the raw inputs — as a final
  // reminder that only Zod-parsed values are trusted.
  //
  // getReviewById() returns a reference to the Map's stored object, so mutating
  // its properties is equivalent to a Map.set() — the in-memory store is updated.
  review.rating = validatedRating;
  review.body   = validatedBody;

  // In production: call revalidateTag(tags.review(review.id)) or
  // revalidatePath() here to invalidate any cached pages that show this review.

  return { ok: true, reviewId: validatedId };
}
