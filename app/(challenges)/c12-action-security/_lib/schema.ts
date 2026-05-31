// ─── app/(challenges)/c12-action-security/_lib/schema.ts ─────────────────────
//
// Zod validation schema for the editReview Server Action.
//
// DESIGN NOTES:
//
// 1. The schema is defined HERE (server-side module) rather than in a shared
//    file imported by client components.  Client components may import a
//    TypeScript *type* derived from this schema for form typing, but the Zod
//    module itself is server-only: it is used inside the "use server" action
//    and never bundled into the client.
//
// 2. Field constraints reflect genuine business rules, not arbitrary limits:
//    - reviewId: any non-empty string (the store uses string IDs)
//    - rating:   integer 1–5 (the data layer already guards this, but we guard
//                here too as defense-in-depth so the store never receives bad data)
//    - body:     1–2000 chars (enough for a thorough review; prevents memory DoS)
//
// 3. .trim() on the body removes leading/trailing whitespace so an empty-looking
//    body (e.g. "   ") fails the min(1) check rather than being stored as spaces.

import { z } from "zod";

export const editReviewSchema = z.object({
  // reviewId is a store-generated string ID; we only verify it is non-empty.
  // The action verifies existence and ownership against the actual store —
  // Zod only validates shape, not semantics.
  reviewId: z.string().min(1, "Review ID is required"),

  // Integer rating 1–5.  The .int() check rejects floats (1.5, 2.9) that
  // would corrupt the product's average rating calculation.
  rating: z
    .number({ invalid_type_error: "Rating must be a number" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),

  // Non-empty review body, max 2000 chars.  The 2000-char cap prevents a
  // trivial memory DoS (10MB body × 100 concurrent requests = 1GB of heap).
  body: z
    .string({ invalid_type_error: "Body must be a string" })
    .trim()
    .min(1, "Review body must not be empty")
    .max(2000, "Review body must not exceed 2000 characters"),
});

// TypeScript type inferred from the schema.
// Exported so the client-side form can use it for type-safe field access
// without importing the Zod runtime.
export type EditReviewInput = z.infer<typeof editReviewSchema>;
