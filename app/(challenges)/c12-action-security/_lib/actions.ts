"use server";
// ─── app/(challenges)/c12-action-security/_lib/actions.ts ────────────────────
//
// HARDENED Server Action — editReview
//
// This is the LIVE action used by the challenge page.  It is the reference
// implementation of a correctly-secured Server Action.
//
// Security layers (in order — order matters):
//   1. Authentication  — getSession(); reject if null
//   2. Authorization   — ownership check (is THIS session user the review author?)
//   3. Validation      — Zod schema parse; reject on bad input
//   4. Rate limiting   — in-memory counter (concept demo; see NOTES.md for prod)
//   5. Write           — only reached when all guards pass
//
// A caller who bypasses the UI (raw POST with curl/fetch) hits these same
// guards — the "use server" boundary is a public HTTP endpoint, not a private
// function.

import { getSession } from "@/lib/auth";
import { getReviewById } from "@/lib/data";
import { editReviewSchema } from "./schema";

// ── In-memory rate limiter (concept demo) ─────────────────────────────────────
//
// Allows at most MAX_REQUESTS calls per user ID within WINDOW_MS milliseconds.
//
// LIMITATIONS (intentional — this is a teaching example):
//   - Does NOT work across multiple server instances (each has its own Map).
//   - Resets on every server restart / deployment.
//   - For production: replace with Redis + @upstash/ratelimit or an edge-network
//     rate-limit rule.  See NOTES.md for detail.
//
// We use a Map rather than a module-level object literal so that the entries()
// iterator works predictably across runtimes.

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10; // 10 edits per user per minute

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Module-level singleton — lives as long as the Node.js process.
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Returns true if the caller has exceeded the rate limit.
 * Side effect: increments the counter for this userId.
 */
function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    // No entry or window has expired — start a new window.
    rateLimitStore.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_REQUESTS) {
    // Within the window and over the limit.
    return true;
  }

  // Within the window but under the limit — increment.
  entry.count += 1;
  return false;
}

// ── Return type ───────────────────────────────────────────────────────────────
//
// Using a discriminated union rather than throwing makes it easy for the form
// component to distinguish error types without try/catch.  Throwing from a
// Server Action causes Next.js to produce a generic error boundary, which is
// not useful for per-field validation feedback.

export type EditReviewResult =
  | { ok: true; reviewId: string }
  | { ok: false; error: string; issues?: string[] };

// ── The action ────────────────────────────────────────────────────────────────

export async function editReview(
  reviewId: string,
  rating: number,
  body: string
): Promise<EditReviewResult> {
  // ── LAYER 1: Authentication ─────────────────────────────────────────────────
  //
  // getSession() reads and cryptographically verifies the session cookie.
  // Returns null if the cookie is absent, expired, or tampered.
  // We check this FIRST — there is no point looking up a review or validating
  // input for a caller we cannot identify.
  //
  // Security note: we return a GENERIC error string, not "no session found"
  // or similar.  Leaking session state helps attackers enumerate endpoints.
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Unauthorized" };
  }

  // ── LAYER 2: Rate limiting ──────────────────────────────────────────────────
  //
  // Rate-limit after authentication so we key by verified user ID (not a
  // caller-supplied value that could be spoofed).  Checking before validation
  // or the store look-up avoids even parsing input for over-limit callers.
  if (isRateLimited(session.user.id)) {
    return { ok: false, error: "Too many requests — please wait before editing again" };
  }

  // ── LAYER 3: Input validation ───────────────────────────────────────────────
  //
  // Parse raw inputs through the Zod schema before touching the store.
  // This rejects:
  //   - out-of-range ratings (e.g. 999, -1, 1.5)
  //   - empty or over-length bodies
  //   - missing / wrong-type fields
  //
  // We validate AFTER authentication so that an unauthenticated flood of bad
  // requests is rejected cheaply at Layer 1 and never hits the Zod parser.
  // The rate limiter (Layer 2) prevents an authenticated user from flooding
  // the validator.
  const parsed = editReviewSchema.safeParse({ reviewId, rating, body });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message);
    return { ok: false, error: "Bad Request", issues };
  }

  // From this point we use parsed.data exclusively — never the raw inputs.
  const { reviewId: validatedId, rating: validatedRating, body: validatedBody } = parsed.data;

  // ── LAYER 4: Authorization (IDOR prevention) ────────────────────────────────
  //
  // Fetch the review and verify ownership BEFORE writing.
  // The ownership check uses session.user.id (server-verified) not any
  // caller-supplied userId (which would be bypassable).
  //
  // We use getReviewById() from the public lib/data interface rather than
  // importing the store directly.  This keeps the store as an implementation
  // detail and avoids coupling this action to internal module paths.
  // In a real app: const review = await db.reviews.findUnique({ where: { id: validatedId } })
  //
  // Note: we do NOT leak whether the review exists at all in the error message.
  // Both "not found" and "wrong owner" return "Forbidden" to prevent attackers
  // from using the action as an oracle to enumerate valid review IDs.
  const review = await getReviewById(validatedId);

  if (!review || review.userId !== session.user.id) {
    // Return generic "Forbidden" for both "not found" and "wrong owner".
    // This prevents the action from being used as an oracle to enumerate IDs.
    return { ok: false, error: "Forbidden" };
  }

  // ── LAYER 5: Write ──────────────────────────────────────────────────────────
  //
  // All guards passed.  Mutate the in-memory store.
  // In a real app this would be a parameterised DB query:
  //   UPDATE reviews SET rating=$1, body=$2 WHERE id=$3 AND user_id=$4
  // The WHERE user_id=$4 clause is the database-layer ownership guard —
  // it prevents a TOCTOU race between the authz check and the write.
  //
  // Because getReviewById returns a reference to the in-memory object, we can
  // mutate it directly (the store and the returned object share the same reference).
  review.rating = validatedRating;
  review.body = validatedBody;

  // NOTE: In a production app we would call revalidateTag() or revalidatePath()
  // here to invalidate the cached product page so the new review rating appears.
  // Omitted in this demo because the store is in-memory and the page re-renders
  // on every request in dev mode.

  return { ok: true, reviewId: validatedId };
}

// Re-export the return type alias so the form component can import it from
// this module rather than knowing about the schema module.
export type { EditReviewInput } from "./schema";
