# Solution Notes — C23: Real OAuth with Auth.js (next-auth v5)

> **Intended audience:** Learners who have completed the challenge and want to
> compare their understanding with the reference implementation and dive deeper
> into the underlying concepts.

---

## What This Challenge Demonstrates

1. **OAuth 2.0 Authorization Code flow** — The 7-step handshake between your
   app, the user's browser, and the identity provider (GitHub).

2. **CSRF protection via the `state` parameter** — How Auth.js generates a
   random nonce, stores it in a cookie, appends it to the authorization URL,
   and verifies it on the callback — preventing CSRF attacks on the OAuth flow.

3. **Auth.js JWT session strategy** — Signed+encrypted JWE cookie (no DB), the
   `jwt` and `session` callbacks, and the trade-offs vs. database sessions.

4. **Self-contained, additive auth setup** — How to run a second Auth.js
   instance alongside the rest of the app without any collision (separate
   basePath, separate cookies, separate secret).

5. **cacheComponents: true discipline** — Dynamic session reads (`auth()`)
   inside `<Suspense>` boundaries; no route-segment config exports.

---

## The OAuth Flow — Step by Step

When the user clicks "Sign in with GitHub":

```
Browser                     Your App (Next.js)              GitHub
   │                               │                           │
   │─ click "Sign in" ────────────►│                           │
   │                               │ generate state nonce      │
   │                               │ store nonce in cookie     │
   │◄── 302 redirect ──────────────│                           │
   │    to GitHub authorize URL    │                           │
   │    (with state, client_id,    │                           │
   │     scope, redirect_uri)      │                           │
   │──────────────────────────────────────────────────────────►│
   │                               │              show consent │
   │◄──────────────────────────────────────────────────────────│
   │ user approves                 │                           │
   │──────────────────────────────────────────────────────────►│
   │                               │                           │
   │◄── 302 redirect ──────────────────────────────────────────│
   │    to /c23/.../callback/github│                           │
   │    with ?code=<code>&state=<nonce>                        │
   │                               │                           │
   │──► GET /callback/github ─────►│                           │
   │                               │ verify state == cookie    │
   │                               │ (CSRF check)              │
   │                               │                           │
   │                               │──► POST /access_token ───►│
   │                               │◄── access_token ──────────│
   │                               │──► GET /user ────────────►│
   │                               │◄── profile (name, email) ─│
   │                               │                           │
   │                               │ jwt callback              │
   │                               │ build JWE session cookie  │
   │◄── 302 redirect ──────────────│                           │
   │    to /c23-oauth-authjs       │                           │
   │    Set-Cookie: authjs.session-token=<JWE>                 │
```

---

## The `state` Parameter: CSRF Defence

**What it is:** A random, unguessable string (nonce) that Auth.js generates
at the start of the OAuth flow.

**How it works:**
1. Auth.js stores the nonce in a `__Host-authjs.state` cookie (httpOnly, sameSite=lax).
2. Auth.js appends `&state=<nonce>` to the GitHub authorization URL.
3. GitHub includes the same `state` in its redirect back to your callback.
4. Auth.js verifies: does the URL's `state` match the cookie's value?
   - Match → proceed to code exchange.
   - Mismatch → abort; return an error.

**What it prevents — CSRF on the callback:**

An attacker begins their own GitHub OAuth flow but does not complete it.
They obtain a callback URL with their own `code`:
```
/c23-oauth-authjs/api/auth/callback/github?code=ATTACKER_CODE&state=ATTACKER_STATE
```

They trick a victim into visiting this URL (e.g. via an `<img src="...">` or
a link in an email).

Without `state`: the victim's browser visits the callback, the code is
exchanged for the attacker's GitHub tokens, and the victim is signed in as
the attacker (account linking CSRF).

With `state`: the victim's browser has no cookie matching `ATTACKER_STATE`
(only the victim's own nonce is there, if any). Auth.js sees the mismatch
and aborts — the attack fails.

---

## JWT Strategy vs. Database Strategy

### JWT (this challenge)

Auth.js stores all session state in the cookie itself — a signed+encrypted
JWE containing the user's ID, name, email, role, and expiry.

```
Request:  Cookie: authjs.session-token=<JWE>
Server:   decrypt JWE → verify signature → check exp → read user data
          (no database call)
```

**Trade-offs:**
- No DB required — works out of the box.
- Scales horizontally (stateless).
- Cannot be revoked before `exp` without a blocklist (see Revoking JWT Sessions).
- Session data is "baked in" — updating a user's role requires them to re-login
  (or you implement a mechanism to force re-issuance).

### Database (with an Adapter)

Auth.js stores a session ID in the cookie. The session data lives in the DB.

```
Request:  Cookie: authjs.session-token=<SESSION_ID>
Server:   query DB → find session row → return user data
```

**Trade-offs:**
- Immediate revocation: delete the DB row → session is dead.
- Session data stays fresh — updating the DB updates the session instantly.
- Requires a persistent session store (PostgreSQL, MySQL, MongoDB, etc.).
- Every request = a DB query.

### Revoking JWT Sessions

If you need instant revocation with JWT strategy, add a token blocklist:

```ts
// In the jwt callback, add a unique token ID:
async jwt({ token, user }) {
  if (user) {
    token.jti = crypto.randomUUID(); // unique per session
  }
  return token;
}

// In a sign-out or password-change server action:
await redis.set(`revoked:${token.jti}`, 1, { ex: SESSION_DURATION_SECONDS });

// In the jwt callback, check the blocklist:
async jwt({ token }) {
  const revoked = await redis.get(`revoked:${token.jti}`);
  if (revoked) return null; // null → Auth.js treats as unauthenticated
  return token;
}
```

---

## How This Differs from C01 (Hand-Rolled `jose` Session)

| Aspect | C01 (`jose` + `lib/auth`) | C23 (Auth.js) |
|---|---|---|
| Token format | JWS (signed, payload readable) | JWE (encrypted, payload opaque) |
| Token creation | Manual `new SignJWT(...).sign(key)` | Auth.js `jwt` callback → automatic |
| Token verification | Manual `jwtVerify(token, key)` | Auth.js middleware → automatic |
| CSRF protection | Not implemented | Built-in (state nonce + CSRF cookie) |
| OAuth support | None | 20+ providers built in |
| Cookie management | Manual (`setSession`, `destroySession`) | Auth.js manages cookies |
| Custom claims | Add to payload manually | Add in `jwt` callback, expose in `session` callback |
| Cookie name | `nextmart_session` | `authjs.session-token` |
| Cookie flags | Manually set `httpOnly`, `sameSite`, `secure` | Auth.js sets them automatically |

**C01 teaches** the fundamentals: signing, verification, cookie flags, and
what happens when each piece is wrong.  You control every detail.

**C23 teaches** how OAuth works, how Auth.js orchestrates the flow, and when
to use a framework vs. roll your own.

Both systems run in this app **simultaneously without interference** — they
use different cookie names and different secrets.

---

## Middleware-Based Route Protection (Alternative Approach)

This challenge uses server component redirect (`redirect()` in an async
Server Component inside `<Suspense>`) to protect the `/protected` page.

Auth.js also supports middleware-based protection, which protects routes
before any page code runs:

```ts
// middleware.ts (at the project root)
import { auth } from "app/(challenges)/c23-oauth-authjs/_lib/auth-config";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith(
    "/c23-oauth-authjs/protected"
  );

  if (isProtectedRoute && !isAuthenticated) {
    return Response.redirect(new URL("/c23-oauth-authjs", req.url));
  }
});

export const config = {
  matcher: ["/c23-oauth-authjs/protected/:path*"],
};
```

**Trade-offs vs. server component redirect:**
- Middleware runs before the page component — no streaming delay for the redirect.
- Middleware runs on every matched request — slightly higher overhead.
- Middleware is harder to test in isolation.
- The server component approach is more explicit and colocated with the page.

This challenge uses the server component approach to keep the auth logic
visible within the page file and avoid adding middleware complexity.

---

## Security Notes

### What is safe in production (with correct env vars)
- AUTH_SECRET set to a random 32+ byte value → CSRF tokens and JWEs are secure.
- basePath isolation → no cookie or route collisions.
- `httpOnly` + `sameSite=lax` + `secure` (in prod) on session cookies.
- `state` nonce → CSRF protection on OAuth callback.

### What is intentionally simplified for the lab
- Credentials provider accepts any password → add bcrypt/argon2 in production.
- No password storage in lib/data → add a hashed password field in production.
- Dev fallback secret → must be replaced in production (the startup warning
  makes this visible).
- No token revocation → add a blocklist or database adapter if instant logout
  is required.

### The `trustHost: true` setting
Auth.js uses the request's `Host` header to construct the OAuth callback URL.
`trustHost: true` tells Auth.js to trust this header without further validation.
In production, ensure your reverse proxy (Vercel, nginx, Cloudflare) correctly
sets the `Host` header and does not allow host header injection.  Vercel does
this automatically.

---

## Files Created by This Challenge

```
app/(challenges)/c23-oauth-authjs/
├── _lib/
│   └── auth-config.ts          ← Auth.js config (basePath, providers, callbacks)
├── _components/
│   ├── AuthButtons.tsx          ← "use client" sign-in/out buttons
│   └── SessionProviderWrapper.tsx  ← "use client" SessionProvider with basePath
├── _meta/
│   ├── challenge.config.json   ← Registry discovery (id, slug, tier, topics)
│   ├── challenge.config.ts     ← Typed re-export of the JSON
│   ├── spec.md                 ← Challenge spec and OAuth explanation
│   ├── defend-it.md            ← 5 from-memory questions + model answers
│   └── verification.md        ← Human-runnable verification checklist
├── api/auth/[...nextauth]/
│   └── route.ts                ← Auth.js route handler (re-exports handlers)
├── page.tsx                    ← Static shell + <Suspense>-wrapped session panel
└── protected/
    └── page.tsx                ← Protected page (redirects if unauthenticated)

solutions/c23-oauth-authjs/
├── _lib/
│   └── auth-config.ts          ← Annotated reference implementation
├── .env.example                ← Env var documentation
└── NOTES.md                    ← This file
```
