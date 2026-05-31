# Cache Flow — C01 Auth

> This document explains the rendering and caching strategy for the C01
> challenge page and why session data forces dynamic rendering.

---

## Rendering Strategy: force-dynamic

The C01 challenge page (`app/(challenges)/c01-auth/page.tsx`) uses:

```ts
export const dynamic = "force-dynamic";
```

### Why not static?

The page calls `getSession()`, which reads the `nextmart_session` cookie via
`next/headers cookies()`.  Cookie reads are inherently per-request — each
visitor has a different (or absent) session cookie.  If the page were
statically generated at build time:

1. `cookies()` would return an empty store (no request context exists at
   build time).
2. The page would bake in a "No session" state.
3. Every user would see "No session" regardless of whether they are logged in.

Setting `dynamic = "force-dynamic"` tells Next.js to render this page fresh
on every request, so `getSession()` sees the actual cookie from the HTTP
request.

### Why not PPR (Partial Pre-Rendering)?

PPR with `experimental_ppr = true` allows a static shell + dynamic islands.
For this challenge the entire page content depends on the session state —
there is no meaningful "static above the fold" content that would benefit from
PPR.  The simplest correct strategy is full dynamic rendering.

---

## Cookie → Server Component → Props → Client Component Flow

```
Browser request
  │
  ├─ HTTP header: Cookie: nextmart_session=<jwt>
  │
  └─ Next.js App Router: renders page.tsx (Server Component)
       │
       ├─ calls getSession() → reads cookie via next/headers cookies()
       │    → jwtVerify(token, key) → returns Session | null
       │
       └─ passes session as prop to <SessionDisplay session={session} />
            │
            └─ Client Component ("use client") renders the session state
               but NEVER calls getSession() itself — it only displays
               what the server already read and verified.
```

### Why Client Components never import lib/auth

`lib/auth/session.ts` calls `cookies()` from `next/headers`, which is a
**server-only API**.  If a Client Component imported it, the Next.js bundler
would include `next/headers` in the client bundle, which is not supported and
causes a build error.

The correct pattern (used here) is:
1. Server Component reads and verifies the session.
2. Server Component passes the plain data as props.
3. Client Component receives typed props and renders them.

This also means the signing secret (`SESSION_SECRET`) never reaches the
client bundle — it is only accessed inside `getSigningKey()` which runs
exclusively in the server-side `session.ts` module.

---

## Token Lifetime vs Cookie Lifetime

Two separate expiry mechanisms exist:

| Mechanism | What it does | Where it lives |
|---|---|---|
| Cookie `maxAge` | Browser removes the cookie after N seconds | HTTP `Set-Cookie` header attribute |
| JWT `exp` claim | `jwtVerify` rejects tokens past this timestamp | Inside the signed token payload |

Both are set to 24 hours in `createSession`.  They are redundant by design:
- If the browser respects `maxAge`, the cookie is gone before the JWT expires.
- If the browser ignores `maxAge` (unusual) or if someone manually copies the
  raw token value, the `exp` claim provides a server-side backstop.

A production system would typically make `maxAge` slightly longer than the
JWT `exp` so the browser keeps the cookie until the JWT self-invalidates,
rather than having the browser aggressively remove still-valid cookies.
