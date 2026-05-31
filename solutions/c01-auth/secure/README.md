# Secure Session — Reference Solution

This directory contains the annotated reference implementation of the secure
session used in C01.  The **live application** imports from `lib/auth` — not
from this file.  Read this for learning; the actual imports go to `lib/auth`.

---

## What Changed from the Toy

| Property | Insecure toy | This solution |
|---|---|---|
| Token format | `btoa(JSON.stringify(user))` | Compact JWS (HS256) |
| Forgeable? | Yes — trivially | No — requires signing secret |
| Expiry | None | 24-hour `exp` claim |
| httpOnly | No | Yes |
| secure | No | Yes (production) |
| sameSite | No | lax |
| Tamper detection | None | HMAC-SHA256 signature |

---

## The JWT Structure

A compact JWS looks like: `header.payload.signature` — three base64url parts
separated by dots.

```
eyJhbGciOiJIUzI1NiJ9    ← header:    {"alg":"HS256"}
.
eyJ1c2VyIjp7...fX0     ← payload:   {"user":{...},"iat":...,"exp":...}
.
dGhpcyBpcyBub3Q...      ← signature: HMAC-SHA256(header+"."+payload, secret)
```

The payload is NOT encrypted — it is only base64url-encoded.  You CAN read
it (try `JSON.parse(atob(token.split('.')[1]))`).  But you cannot modify a
single byte without invalidating the signature, because the HMAC is computed
over the exact bytes of the encoded header and payload.

---

## Key Security Properties

### Signature (tamper detection)
`jwtVerify` recomputes `HMAC-SHA256(header + "." + payload, key)` and
compares it to the signature in the token.  A one-byte difference in the
payload produces a completely different HMAC — this is the avalanche effect
of cryptographic hash functions.

### Expiry (exp claim)
`jwtVerify` automatically checks `exp < now` and throws `JWTExpired` if the
token has expired.  The check is inside the library — you cannot forget it.

### Algorithm check
```ts
jwtVerify(raw, key, { algorithms: ["HS256"] })
```
The explicit allowlist prevents algorithm confusion: an attacker cannot send
a token with `alg:"none"` to bypass signature verification.

### httpOnly cookie
The browser's JavaScript layer cannot read the cookie.  `document.cookie` in
the console returns an empty string (for httpOnly cookies).  An XSS payload
cannot steal the token.

---

## Model Answers to Defend-It Questions

See `app/(challenges)/c01-auth/_meta/defend-it.md` for the full questions and
model answers.  Summary:

1. **httpOnly** — blocks XSS `document.cookie` theft.
2. **base64 is not security** — encoding is reversible; only a cryptographic
   signature (requiring the secret) prevents forgery.
3. **sameSite=lax** — blocks CSRF form-POST/fetch from other origins; allows
   top-level navigations and OAuth redirects.
4. **JWT expiry / revocation** — `exp` limits stolen token lifetime; immediate
   revocation requires a server-side blocklist (Redis/DB).
5. **secure flag** — prevents cookie transmission over HTTP (plaintext);
   off on localhost for developer convenience.
