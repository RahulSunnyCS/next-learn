# C12 — Server Action Security: Notes

---

## What a Server Action Actually Is

When you write:

```ts
"use server";
export async function editReview(reviewId, rating, body) { ... }
```

Next.js compiles this function into an **HTTP POST endpoint**.  The React client
that calls it is a thin wrapper — the real mechanism is an HTTP request with:

- Method: POST
- URL: the current page&apos;s URL (same origin)
- Headers: `Next-Action: <action-id>` (a hash Next.js generates at build time)
- Body: the serialised function arguments (Next.js wire format, not JSON)

An attacker who finds the `Next-Action` ID (visible in the HTML source as
`$$ACTION_ID` comments, or discoverable by enumeration) can invoke the action
directly with `curl` or any HTTP client — bypassing the React UI entirely.

**Take-away:** Treat every `"use server"` function as a public API endpoint.
Apply the same security discipline you would to an Express route or a tRPC
mutation: authenticate, authorize, validate, rate-limit.

---

## Next.js Built-in CSRF / Origin Protection

### What it does

Next.js compares the `Origin` header of every Server Action POST to the
`Host` (or `X-Forwarded-Host`) of the current request:

```
Origin: https://app.example.com   ← matches Host → allowed
Origin: https://evil.example.com  ← mismatch     → 403 (rejected by Next.js)
```

This check runs inside the Next.js framework, **before your action code
executes**.  You cannot bypass it from within the action and you do not need to
implement it yourself — it is built-in.

### What it prevents

Classic cross-site request forgery (CSRF):
- An attacker hosts a page on `evil.example.com` with a form that auto-submits
  to `app.example.com`.
- The victim&apos;s browser sends the correct session cookie (because `sameSite=lax`
  does not block top-level navigations) but sets `Origin: https://evil.example.com`.
- Next.js sees the Origin mismatch and rejects the request with 403.

For Server Actions, **you do not need to add your own CSRF token**.  The Origin
check is the mechanism.  Adding a second CSRF layer creates confusion, may be
bypassed independently, and is not how the framework is designed.

### What it does NOT prevent

| Attack | Why Origin check does not help |
|---|---|
| Unauthenticated mutation | Same-origin tab (correct `Origin`) with no session cookie passes the Origin check |
| IDOR / missing authz | Authenticated user with correct Origin can edit other users&apos; resources |
| Stored XSS on same origin | Injected JS runs at `app.example.com` — correct Origin, passes check |
| Direct API call via curl | Caller can set `Origin` header to match `Host` when not in a browser |
| Server-side proxy | Proxy strips or rewrites `Origin` — framework sees no mismatch |

**Critical conclusion:** Next.js&apos; Origin protection is a useful safety net
against a specific class of cross-site attack.  It is **NOT** authentication,
**NOT** authorization, and **NOT** a general server-action security mechanism.
Application-level authn + authz + validation must be present regardless.

---

## Application-Level Rate Limiting — In-Memory Concept Demo

The hardened action in this challenge uses an in-memory counter:

```ts
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

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
```

### Why this is a concept demo, not production code

**Limitation 1 — No cross-replica sharing:**
A production deployment runs multiple Node.js processes (containers, pods,
serverless function instances).  Each process has its own `Map`.  An attacker
who knows the deployment has 10 replicas can send `MAX_REQUESTS` per replica per
window — a total of `10 × MAX_REQUESTS` per window — while never triggering the
limiter in any single process.

**Limitation 2 — Resets on restart:**
The Map lives in process memory.  Every deployment, crash, or restart empties
it.  An attacker who can trigger a deployment (or simply wait for one) gets a
fresh window immediately.

**Limitation 3 — Fixed window allows burst-at-boundary:**
If the window resets at `t=0`, an attacker can send `MAX_REQUESTS` at `t=-1ms`
and `MAX_REQUESTS` again at `t=+1ms` — `2 × MAX_REQUESTS` in under 2ms.  A
sliding-window algorithm (e.g. a Redis sorted set with a `ZADD` + `ZCOUNT`
pattern) avoids this.

### Production replacement

For a real application, replace the in-memory counter with one of these:

**Option A — `@upstash/ratelimit` (recommended for serverless):**
```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true, // optional: track hit rate in Upstash console
});

// In the action (after authentication):
const { success, remaining } = await limiter.limit(session.user.id);
if (!success) {
  return { ok: false, error: "Too many requests" };
}
```

**Option B — Edge network rate-limit rule (Cloudflare, Vercel):**
Configure a rate-limit rule at the CDN/edge layer that blocks requests to
`/c12-action-security` when a single IP exceeds a threshold.  This blocks at
the network layer before the request reaches Node.js — the cheapest possible
gate.  Combine with application-level rate limiting for defence-in-depth.

**Option C — Redis manually with ioredis:**
```ts
const key = `ratelimit:editReview:${session.user.id}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60); // set TTL on first increment
if (count > MAX_REQUESTS) return { ok: false, error: "Too many requests" };
```

---

## Summary: Defence Layers for a Server Action

```
1. Authentication  — getSession(); reject if null              (cost: JWT verify, O(1))
2. Rate limiting   — keyed by verified user ID; reject if over (cost: Map/Redis lookup)
3. Input validation — Zod.safeParse(); reject on schema fail   (cost: JS parse, cheap)
4. Authorization   — ownership check; reject if not owner      (cost: 1 store/DB read)
5. Write           — only if all guards pass                   (cost: 1 store/DB write)
```

**Order matters:**
- Cheapest guards first (L1 auth is O(1) crypto vs L4&apos;s DB read).
- Rate limiting after auth (key by verified identity, not spoofable IP).
- Validation before the store read (avoid nonsensical DB queries).
- Authorization before write (check ownership before applying the change).

**What Next.js handles for you:**
- Origin check (CSRF / cross-site forgery) — built-in, no action needed.
- Action ID obfuscation — Next.js generates opaque IDs, not function names.

**What you must implement yourself:**
- Authentication, Authorization, Validation, Rate Limiting.
