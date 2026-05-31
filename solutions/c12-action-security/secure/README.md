# Hardened Server Action — Reference Implementation

This directory contains the annotated reference implementation of the secure
`editReview` Server Action for C12.

The LIVE application uses the same logic from:
`app/(challenges)/c12-action-security/_lib/actions.ts`

This file adds extra comments explaining the WHY behind every decision.

---

## The Five Security Layers

Every mutating Server Action should implement these layers **in this order**:

### Layer 1: Authentication

```ts
const session = await getSession();
if (!session) return { ok: false, error: "Unauthorized" };
```

**Why first:** Cheapest gate.  An anonymous request is rejected before any
parsing, store reads, or counter increments.  `getSession()` reads a cookie and
verifies a JWT signature — O(1) cryptographic work, no DB round-trip.

**Generic error:** Return `"Unauthorized"` not `"no session found"`.  Detailed
errors leak implementation details that help attackers enumerate states.

---

### Layer 2: Rate Limiting

```ts
if (isRateLimited(session.user.id)) {
  return { ok: false, error: "Too many requests" };
}
```

**Why after auth:** The counter is keyed by `session.user.id` — a server-verified
identity.  Checking after auth ensures we never increment the counter for
anonymous callers (blocked cheaply in L1) and prevents IP-spoofing bypasses.

**In-memory vs production:** The in-memory Map shown here resets on server
restart and does not scale across multiple replicas.  Production replacement:
`@upstash/ratelimit` with a Redis back-end and a sliding-window algorithm.

---

### Layer 3: Input Validation (Zod)

```ts
const parsed = editReviewSchema.safeParse({ reviewId, rating, body });
if (!parsed.success) {
  return { ok: false, error: "Bad Request", issues };
}
```

**Why Zod and not just browser validation:** Browser validation is under the
user&apos;s control.  The action is an HTTP endpoint — there is no guarantee that
input went through the form.  The Zod parse is the ONLY reliable validation.

**After validation:** Only `parsed.data` fields are used in subsequent code.
Raw inputs (`reviewId`, `rating`, `body`) are never referenced again.  This is
not just style — `Number(formData.get("rating"))` could be `NaN` at runtime
even though TypeScript says it is `number`.

---

### Layer 4: Authorization (IDOR prevention)

```ts
const review = reviewStore.get(validatedId);
if (!review || review.userId !== session.user.id) {
  return { ok: false, error: "Forbidden" };
}
```

**Why the same error for not-found and wrong-owner:** A distinct "not found"
response would let an attacker enumerate valid review IDs by looking for
`"Forbidden"` vs `"not found"` — `"Forbidden"` tells them the ID exists.

**Never trust caller-supplied userId:** The check uses `session.user.id` (from
the verified JWT), never a `userId` parameter supplied by the caller.

---

### Layer 5: Write

```ts
review.rating = validatedRating;
review.body   = validatedBody;
reviewStore.set(review.id, review);
```

Only reached when all four guards have passed.  Uses `validatedRating` and
`validatedBody` — the Zod-parsed values — never the raw inputs.

---

## Next.js Built-in CSRF / Origin Protection

Next.js compares the `Origin` header of every Server Action POST to the
`Host` header.  A request from `evil.example.com` has
`Origin: https://evil.example.com` which does not match `nextmart.dev`, so it
is rejected at the framework level before your action code runs.

**What this protects:** Cross-site request forgery from a different origin.

**What this does NOT protect:**
- Unauthenticated mutations (Layer 1 gap)
- IDOR / missing ownership check (Layer 4 gap)
- Stored XSS on the same origin — injected script has the correct origin
- Direct API calls where the caller controls the `Origin` header

**Conclusion:** Next.js&apos; Origin check is a useful safety net, but it is not a
substitute for application-level authentication and authorization.  Add both.

---

## Compare: Insecure vs Hardened

| Concern | Insecure | Hardened |
|---|---|---|
| Authentication | Not checked | `getSession()` — reject if null |
| Authorization | Not checked | `review.userId === session.user.id` |
| Input validation | Not checked | Zod schema — reject on fail |
| Rate limiting | Not checked | In-memory counter (concept) |
| Error specificity | Could leak details | Generic errors ("Unauthorized", "Forbidden") |
| What fails first | Nothing — write always runs | L1 (auth) — cheapest gate first |
