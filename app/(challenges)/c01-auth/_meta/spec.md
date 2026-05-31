# Challenge Spec — Session Security: Attack the Toy, Then Build It Right

> **File:** `app/(challenges)/c01-auth/_meta/spec.md`

---

## Learning Goal

This challenge teaches session security from the attacker's perspective first.
You will forge and tamper with a deliberately insecure session (a plain
base64-encoded cookie), understand exactly why it is dangerous, and then
replace it with a correctly-implemented signed JWT using the `jose` library.
By the end, you will understand what each cookie security flag protects against,
why token signatures are necessary, and what an attacker gains when these
defences are absent.

---

## Scenario

Nextmart's checkout flow and account page both depend on knowing who the
current user is.  A previous developer shipped a "quick and dirty" session
implementation that just base64-encodes the user object into a cookie.
Your first job is to attack it — change your own role to `"seller"`, forge a
session as a different user, and observe that the server accepts the tampered
cookie without complaint.  Your second job is to replace it with a production-
grade session using `lib/auth` — which you will study and understand.

---

## Starting Point

The `solutions/c01-auth/insecure/session.ts` file contains the toy
implementation.  Read it carefully before attacking it.

The live demo at `/c01-auth` shows both the insecure toy behaviour and the
secure `lib/auth` behaviour side-by-side.  Experiment with the login/logout
demo, then open your browser's DevTools and inspect the cookies.

---

## Tasks

### Part 1 — Attack the Toy

- [ ] **T1.1 — Read the insecure implementation** in
  `solutions/c01-auth/insecure/session.ts` and understand how it works.

- [ ] **T1.2 — Forge a session.** In your browser DevTools (Application →
  Cookies), find the `nextmart_insecure_session` cookie set by the toy.
  Decode it with `atob()` in the console.  Modify the JSON to change your
  role to `"seller"`, then re-encode it with `btoa()` and paste it back.
  Reload the page — you are now a seller without the server ever checking
  whether you were authorised.

- [ ] **T1.3 — Forge a different user.** Change `id` and `email` to a
  completely different user (e.g. user id `u999`, email `attacker@evil.com`).
  The server still accepts it.  Note that there is no signature or secret —
  anyone who can write a cookie can impersonate any user.

- [ ] **T1.4 — Replay a past session.** The toy never sets an expiry on the
  cookie.  This means a session stolen from a browser log or from a network
  packet (on HTTP, not HTTPS) is valid forever.  Note that there is no `exp`
  field in the decoded payload.

### Part 2 — Understand the Secure Version

- [ ] **T2.1 — Read `lib/auth/session.ts`.**  Identify: (a) which jose
  function signs the token, (b) which jose function verifies it, (c) what
  claims are set, and (d) what would happen if you changed a single byte of
  the cookie value.

- [ ] **T2.2 — Inspect the secure cookie** in DevTools.  Observe the
  `httpOnly` flag (greyed out — JavaScript cannot read it), the `SameSite`
  attribute, and the `Expires` field.  Try to decode the token with
  `atob(token.split('.')[1])` — you can READ the payload (it is not
  encrypted), but any modification breaks the signature.

- [ ] **T2.3 — Try to forge the secure session.** Attempt T1.2 again but
  against the `nextmart_session` cookie.  Paste a modified token.  The
  server rejects it — `jwtVerify` returns a `JWTSignatureInvalid` error
  and `getSession()` returns `null`.

### Part 3 — Extend (optional bonus)

- [ ] **T3.1 — Add a "remember me" checkbox** to the login form that extends
  the session duration from 24 hours to 30 days (change `SESSION_DURATION_S`
  dynamically in `createSession`).  Verify the `Expires` cookie attribute
  updates accordingly.

- [ ] **T3.2 — Upgrade to JWE.** Replace `SignJWT` + `jwtVerify` with
  `EncryptJWT` + `jwtDecrypt` using the `"A256GCM"` content algorithm and
  `"dir"` key management.  Verify that the payload is no longer readable
  from the browser console.

---

## Acceptance Criteria

1. `next build` exits 0 with no type or lint errors.
2. Loading `/c01-auth` shows a login demo — clicking "Log in" sets the
   `nextmart_session` cookie with `httpOnly` and `SameSite=Lax` attributes
   visible in DevTools.
3. After login, the page shows the current user's name and role.
4. Clicking "Log out" clears the cookie and the page shows "No session".
5. Manually altering the cookie value in DevTools and reloading shows "No
   session" (the tampered token is rejected).
6. The insecure toy at `solutions/c01-auth/insecure/session.ts` is never
   imported by any live application route.

---

## Hints

<details>
<summary>Hint 1 — How base64 encoding differs from signing</summary>

`btoa(JSON.stringify(obj))` is NOT a security measure — it is just encoding.
Anyone can reverse it with `JSON.parse(atob(token))`.  A cryptographic
signature (HMAC-SHA256) requires knowledge of the secret to produce, so a
verifier can detect any modification without the secret ever leaving the
server.

</details>

<details>
<summary>Hint 2 — Why httpOnly matters</summary>

Without `httpOnly`, a browser script can read `document.cookie` and send all
cookies to an attacker's server.  This is the classic XSS session-hijack
vector.  With `httpOnly`, the cookie is invisible to JavaScript — it is only
sent by the browser automatically with each request.

</details>

<details>
<summary>Hint 3 — Why sameSite=lax is the right default</summary>

`sameSite=strict` would block the cookie on top-level navigations from
external links (e.g. an email link that takes you back to your account).
`sameSite=none` disables all CSRF protection and requires `secure`.
`sameSite=lax` blocks cross-origin `fetch`/`XMLHttpRequest` and form `POST`
requests (the primary CSRF vectors) while allowing top-level GET navigations
and OAuth redirect flows.

</details>
