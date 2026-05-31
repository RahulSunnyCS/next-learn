# Defend-It Worksheet — Session Security: Attack the Toy, Then Build It Right

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c01-auth/`.  Write in your own words — the goal
> is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Cookie flags: httpOnly

*Why does the session cookie need the `httpOnly` flag?  What specific attack
does it prevent, and what would an attacker do if it were missing?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The `httpOnly` flag prevents browser JavaScript from reading the cookie via
`document.cookie`.  Without it, any injected script on the page — whether
from a stored XSS payload, a compromised third-party script, or a browser
extension — can execute `document.cookie` and send every cookie value to an
attacker-controlled server.  The attacker pastes the stolen value into their
own browser, sets the cookie, and is now authenticated as the victim for the
remainder of the session lifetime.

With `httpOnly`, the browser still sends the cookie with every request (the
HTTP layer sees it), but the JavaScript layer cannot access it at all.  This
breaks the most common XSS session-hijack vector.  Note: `httpOnly` does NOT
protect against CSRF — that is the job of `sameSite`.

</details>

---

### Q2 — Why base64 is not security

*The insecure toy encodes the session as `btoa(JSON.stringify(user))`.  A
developer argues "nobody will bother to decode it."  Explain precisely why
this reasoning is wrong and what it would take to make it actually secure.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`btoa` is **encoding**, not **encryption** and not **signing**.  Any person
with a browser console can run `JSON.parse(atob(tokenValue))` and read the
payload in under five seconds.  "Security through obscurity" — the hope that
no one will bother — fails at scale: automated tools scan for base64-encoded
data in cookies as a standard step in a web application pentest.

Making it actually secure requires a **cryptographic signature**: computing
an HMAC over the payload using a secret the server keeps private.  The
server can then verify that any token it receives was produced by itself and
has not been modified.  Without the secret an attacker cannot produce a valid
signature for a modified payload.  This is what `SignJWT` / `jwtVerify` with
HS256 provides — the base64url payload is still readable (it is only encoded,
not encrypted) but any modification invalidates the HMAC, and the server
detects the forgery.

</details>

---

### Q3 — sameSite vs CSRF

*What is a Cross-Site Request Forgery (CSRF) attack and how does `sameSite=lax`
on the session cookie prevent it?  Why is `sameSite=strict` not the right
default for most applications?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In a CSRF attack the attacker tricks an already-authenticated user into
making an unintended state-changing request to the target application.  A
classic vector: an attacker hosts a page with `<form action="https://nextmart.example/checkout/confirm" method="POST">` that auto-submits on load.  If the session cookie has no `sameSite` restriction, the browser attaches it to the cross-origin POST, and the server processes the request as if the user intended it.

`sameSite=lax` prevents this by blocking the cookie from being sent on
cross-origin **sub-resource requests** (form POST from another origin, fetch/
XHR from another origin).  The cookie IS sent on top-level navigations (the
user clicking a link that takes them to Nextmart) — this covers the OAuth
redirect-back flow where the identity provider redirects the browser to the
application's callback URL.

`sameSite=strict` would be stronger — it also blocks the cookie on top-level
navigations from external origins.  The practical cost: any link in an email,
a search result, or a social media post that takes the user to their account
page would arrive without the cookie, forcing them to log in again.  For
most applications this friction is unacceptable and the marginal security
gain over `lax` is small (CSRF via GET requests is rare in well-designed APIs
that follow the POST-for-state-change convention).

</details>

---

### Q4 — JWT expiry and token revocation

*The signed JWT has an `exp` claim.  What does it protect against?  The
`destroySession` function deletes the cookie — if an attacker already copied
the raw token value, can they still use it after logout?  What would a
production system add to prevent this?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The `exp` claim is a Unix timestamp embedded in the signed payload.
`jwtVerify` automatically rejects any token whose `exp` is in the past —
this means a token stolen from a network log (HTTP traffic, browser storage
forensics) expires automatically after at most 24 hours (the SESSION_DURATION_S
constant) rather than being valid forever as in the toy implementation.

`destroySession` deletes the cookie from the browser.  If the attacker has
already copied the raw token value (e.g. from a previous XSS exfiltration),
they still hold a cryptographically valid token that `jwtVerify` will accept
until it expires.  Cookie deletion is **browser-side only** — the server has
no concept of "this token is now invalid" beyond the expiry timestamp.

A production system that needs **immediate revocation** (e.g. "revoke all
sessions for this user after a password reset" or "log out everywhere") adds
a **token blocklist** — a database table or Redis set keyed by a unique token
ID (`jti` JWT claim) or user ID.  `getSession` checks the blocklist on every
request and returns null if the token's `jti` appears there.  The blocklist
only needs entries for the remaining lifetime of issued tokens (entries older
than SESSION_DURATION_S can be pruned).

</details>

---

### Q5 — Secure cookie flag and production deployments

*The code sets `secure: process.env.NODE_ENV === "production"`.  Why is the
`secure` flag important, and why is it intentionally OFF in development?
What risk does this introduce, and how is it mitigated?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The `secure` flag tells the browser to send the cookie ONLY over HTTPS
connections.  Without it, the browser will include the cookie in HTTP
requests.  Anyone on the network path — a coffee-shop router, an ISP, an
enterprise proxy, or a TLS-stripping reverse proxy — could read the cookie
value from the plaintext HTTP traffic and use it to hijack the session.

In development the application typically runs on `http://localhost` without
TLS.  If `secure` were set, the browser would silently drop the cookie and
the application would appear to never establish a session.  Setting `secure`
only when `NODE_ENV === "production"` means the cookie is sent over localhost
HTTP in dev but only over HTTPS in prod — a pragmatic compromise.

The risk introduced: if a developer accidentally deploys a build with
`NODE_ENV !== "production"` to a public server (e.g. a staging environment
accessed over HTTP), the cookie would travel in plaintext.  Mitigations:
(1) ensure CI/CD sets `NODE_ENV=production` for all internet-facing
deployments; (2) monitor for HTTP (non-TLS) traffic on production hosts;
(3) consider using an explicit `FORCE_SECURE_COOKIES=true` env var rather
than relying on `NODE_ENV` for clearer intent.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | httpOnly cookie flag | | |
| 2 | base64 is not security | | |
| 3 | sameSite vs CSRF | | |
| 4 | JWT expiry and revocation | | |
| 5 | secure flag in production | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c01-auth/`.*
