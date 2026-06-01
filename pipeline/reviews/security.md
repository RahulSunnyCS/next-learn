# SECURITY AUDIT REPORT — Nextmart Next.js 16 Curriculum (Phase 4)

Scope: 25-challenge educational repo. Deep review of the five security-flagged
surfaces (lib/auth, c12 action security, c13 route handlers + proxy.ts, c23
OAuth/Auth.js, c11 server actions), plus a broad sweep of the remaining
challenges (secrets, XSS, secret-logging, server-action auth posture).

Calibration (per the audit brief): two lenses —
(1) does a reference SOLUTION teach an insecure pattern a learner would carry
to production? (primary harm for a security-teaching curriculum), and
(2) is there a real exploitable issue in the running demo (auth bypass,
committed secret, an insecure-teaching-artifact wired into a live route)?
A deliberately-insecure, clearly-labeled TEACHING TOY that is not reachable
from a live route is CORRECT, not a finding — and I verified isolation in
every case.

VERDICT: **PASS**

The security-teaching solutions are safe to learn from. The two reference auth
implementations (lib/auth jose session, c12 hardened Server Action) model
correct, production-grade patterns with accurate inline rationale. Both
deliberately-insecure toys (c01 base64 session, c12 unguarded action) are
clearly labeled, use distinct cookie/identifier names, are never imported by a
live route, and the c12 toy performs no store write at all. No secrets are
committed; .gitignore is correct; no XSS sinks take user input; no secret
logging. The findings below are all LOW severity — teaching-consistency and
defense-in-depth notes, none of which are exploitable in this localhost
educational app.

---

## FINDINGS

### FINDING 1 — proxy.ts auth-gate guards a route that does not exist; the real protected page relies solely on its own getSession()
Severity: **Low**
File and line: `proxy.ts:84,288` (matcher `/c13-route-handlers/account/:path*`),
vs. the actual account page at `app/(challenges)/c04-rsc-boundary/account/page.tsx`

What it is: The middleware's auth gate protects the path prefix
`/c13-route-handlers/account`, but there is no `account/` route under
`app/(challenges)/c13-route-handlers/` — that path 404s. The only real account
page lives in c04 (`/c04-rsc-boundary/account`), which is NOT covered by the
proxy matcher. So the cheap cookie-presence pre-filter the proxy demonstrates
never actually runs in front of a live protected page.

Why it matters (teaching): The proxy.ts comments correctly and emphatically
teach the right two-layer model — middleware does a cheap cookie-presence
check, and the *page* does the authoritative `getSession()` verification and
handles `null`. The good news: the real protected page (c04 account) DOES
correctly call `getSession()` inside a Suspense boundary and renders a sign-in
prompt when it returns null — so it is properly protected by Layer 2 on its
own, which is exactly what the proxy comments say is the authoritative layer.
The gap is purely that the demonstrated Layer-1 gate and the real protected
page are in different challenge directories and never line up, so a learner
cannot observe the two layers working together on one URL. This is a coherence
gap, NOT an auth bypass: no protected resource is left unguarded (the page-level
check is sufficient and present).

How to fix it: Either (a) add a minimal
`app/(challenges)/c13-route-handlers/account/page.tsx` that calls
`getSession()` and handles null, so the matcher guards a real page and the
two-layer story is observable end-to-end; or (b) point the proxy matcher at the
c04 account path so the existing real page gets the Layer-1 pre-filter too. Add
a one-line note cross-referencing the two so the learner knows where the
authoritative check lives.

### FINDING 2 — Live OG image route declares `export const runtime = "edge"`, which the repo's own Cache Components rules forbid
Severity: **Low** (build-correctness / teaching-consistency; not a security issue)
File and line: `app/(challenges)/c06-metadata-seo/[slug]/opengraph-image.tsx:35`

What it is: This live metadata file exports `export const runtime = "edge"`.
`docs/cache-components-rules.md` rule 1 states the `runtime` route-segment
export is incompatible with `cacheComponents: true` and fails the build "even
on Route Handlers." The file's own header comment claims metadata-image files
are "exempt" from the cacheComponents constraints — which directly contradicts
the project's canonical rules doc. (Note: the c13 `edge-geo/route.ts` correctly
does NOT export `runtime` and explains at length why it cannot; and the c09
`export const revalidate = 3600` I flagged during the sweep turned out to be
inside a `<pre>` display string, not a real export — so c09 is fine.)

Why it matters: Not a vulnerability. The OG image is rendered by Satori
(CSS-to-SVG → PNG) and executes no HTML/JS, so even though product
name/description flow into it there is no XSS sink. The concern is twofold:
(a) if the rules doc is right, this export breaks `next build`, meaning the app
may not run in the documented configuration; (b) it teaches a learner that
`export const runtime` is acceptable in some files, contradicting the rule the
curriculum spends real effort establishing elsewhere.

How to fix it: Reconcile the two. Either confirm metadata-image files are
genuinely exempt under the installed Next 16 version and update
`cache-components-rules.md` to say so explicitly (with a citation), or remove
the `runtime = "edge"` export from `opengraph-image.tsx` and let it fall back to
the default runtime (the comment already admits omitting it "still works").

### FINDING 3 — No server-side security response headers configured (CSP, X-Frame-Options, HSTS, X-Content-Type-Options)
Severity: **Low** (acceptable for a localhost teaching app; flagged for production-awareness)
File and line: `next.config.ts` (no `async headers()` block)

What it is: The app sets no Content-Security-Policy, X-Frame-Options /
frame-ancestors, Strict-Transport-Security, or X-Content-Type-Options headers.

Why it matters: For this repo's stated context (no production deploy, localhost
learning) this is reasonable and not a live risk. It is worth a note because a
security-teaching curriculum that covers httpOnly/sameSite/CSRF in depth is a
natural place for a learner to also expect response-header hardening — its
absence is a small teaching gap, not a vulnerability. The `secure` cookie flag
is correctly gated to production, so cookie transport is handled; only the
broader header set is missing.

How to fix it (optional, teaching value): Add a short `async headers()` block in
`next.config.ts` (or a dedicated challenge) demonstrating
`Content-Security-Policy`, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a note that HSTS is
set at the edge/host in production. Frame it as production-hardening so it does
not imply localhost needs it.

### FINDING 4 — Data layer trusts client-supplied `priceCents` for order line items (mitigated by server-side total, but worth a sharper teaching note)
Severity: **Low** (informational / teaching-precision)
File and line: `lib/data/repository.ts:331-360` (`createOrder`); related
client-trust caveat in `app/(challenges)/c15-cart-state/_lib/reconcile.ts:38`

What it is: `createOrder` computes `totalCents` server-side from the items
(good — the comment explicitly calls this out as preventing the caller from
supplying an arbitrary total), but the per-item `priceCents` it multiplies is
taken from the caller's input rather than re-sourced from the product record in
the store. So a caller could submit a correct-looking order whose unit prices
do not match the catalog, and the "server-computed" total would faithfully sum
the attacker's prices.

Why it matters (teaching): The code already teaches the right *headline* lesson
(never trust a client-supplied total). But the residual price-trust is the
subtler and more commonly-exploited half of price-manipulation bugs, and a
learner copying this `createOrder` shape into a real checkout could believe
they are protected because "the total is computed server-side." The cart
reconcile file is admirably explicit about the same caveat ("Product prices are
NOT trusted from the client — in a real app you would re-fetch prices from the
DB"); the data layer should match that candor.

How to fix it: In `createOrder`, look up each item's authoritative `priceCents`
from `productStore.get(item.productId)` and compute the total from the stored
price, ignoring any client-supplied price. At minimum, add a comment in
`createOrder` mirroring the reconcile.ts caveat so the price-trust limitation is
not silently taught as safe.

---

## VERIFIED SECURE (no action needed) — the security-critical surfaces

These were reviewed in depth and are correct; recorded so the sign-off is
auditable.

**lib/auth (frozen foundation — `session.ts`, `index.ts`, `types.ts`):**
jose JWS HS256. `getSession()` verifies signature + `exp` and pins
`algorithms: ["HS256"]` (explicit alg allowlist → blocks alg-confusion /
`alg:none`). Cookie flags correct: `httpOnly: true`, `secure` gated to
`NODE_ENV === "production"`, `sameSite: "lax"`, `path: "/"`, `maxAge` = 24h;
matching `exp` claim set at sign time. Post-verify payload shape guard rejects
correctly-signed-but-malformed tokens. Errors caught → returns `null` (never
throws on bad tokens); genuinely unexpected errors re-thrown. The dev-fallback
secret is loud (`console.warn`), localhost-only, and — critically — the warning
deliberately does NOT log the secret value or the raw token. Frozen public
interface is sound.

**c01 insecure toy (`solutions/c01-auth/insecure/session.ts`):** Correct
teaching toy. Uses a DISTINCT cookie name (`nextmart_insecure_session`), takes
an INJECTED cookie setter/getter (not wired to `next/headers`), and is never
imported by any live route — verified by grep: the only reference is an
explanatory `<code>` label in `auth-ui.tsx`. Heavily labeled "NEVER SHIP."
Not a finding.

**c12 hardened Server Action (`app/(challenges)/c12-action-security/_lib/
actions.ts` + secure reference):** Exemplary. Enforces, in the right order:
(1) authn via `getSession()` → `Unauthorized`; (2) rate-limit keyed by the
server-verified `session.user.id` (not a spoofable client value); (3) Zod
`safeParse` (rating int 1–5, body 1–2000 trimmed) before any store read;
(4) ownership/IDOR check using `session.user.id` vs `review.userId`; (5) write
only after all guards. Returns a generic `Forbidden` for both "not found" and
"wrong owner" → no ID-enumeration oracle. TOCTOU and `WHERE id=? AND user_id=?`
notes are accurate. The live action and the annotated secure reference match.

**c12 insecure toy (`solutions/c12-action-security/insecure/actions.ts`):**
Correct toy. Marked `"use server"` to make the "actions are public POST
endpoints" point, but it performs NO store write (the mutation is commented
out) and is never imported by a live page. Labeled "NEVER SHIP." Not a finding.

**c13 proxy.ts auth-gate + route handlers:** The cookie-presence-then-page-
verifies pattern is sound and correctly documented (the middleware comments are
explicit that presence ≠ validity and that the page MUST call `getSession()`).
See Finding 1 for the wiring-coherence gap. `search/route.ts` validates `limit`
strictly (`1–50`, integer, round-trip-checked), narrows the output shape
(strips sellerId/stock/internal fields), returns typed JSON errors with no
stack traces, logs server-side only, and only exports GET (405 for others).
`edge-geo/route.ts` validates against header allowlists, `safeDecodeURIComponent`
is injection-safe, `no-store` cache header. Locale negotiation validates against
a `SUPPORTED_LOCALES` allowlist — no reflected user input in redirect URLs.

**c23 OAuth / Auth.js (`_lib/auth-config.ts`, `[...nextauth]/route.ts`,
`protected/page.tsx`):** `trustHost: true` is documented (dev-server callback
URL construction). `AUTH_SECRET` dev fallback is loud (`console.warn`) and
clearly labeled public/dev-only. The Credentials provider validates the email
exists in the seeded store but accepts ANY password — and this is explicitly,
repeatedly labeled demo-only with "a production system MUST hash passwords with
bcrypt/argon2" and a note that Credentials uses the double-submit CSRF cookie
(not the OAuth `state` param). JWT/JWE session; `basePath` isolation prevents
cookie/route collision with the c01 session. `jwt`/`session` callbacks expose
only `role`/`uid` (no token/secret material). The protected page correctly
`await auth()` → `redirect()` on null. OAuth `state` CSRF flow is accurately
described for the (commented, opt-in) GitHub provider.

**c11 Server Actions (`_lib/actions.ts`):** Auth is intentionally deferred to
C12 with a clear, correct teaching note ("happy-path mechanics; auth is C12's
scope"). Despite that, it still validates ALL input server-side (rating int
1–5, body length bounds) before mutating, catches data-layer errors, logs
server-side only, and never returns raw stack traces. Correct framing for a
mechanics challenge.

**Secrets / env hygiene:** No committed secrets. `git ls-files` shows only
`.env.example` files tracked; both contain empty placeholders
(`SESSION_SECRET=`, `AUTH_SECRET=`) — no values. `.gitignore` correctly ignores
`.env` / `.env.*` while allow-listing `.env.example`. No real `.env`/`.env.local`
on disk. Targeted scan for `sk-…`, `AKIA…`, `ghp_…`, PEM private keys, Slack
tokens → none. Only client-exposed env is `NEXT_PUBLIC_SITE_URL` (a non-sensitive
URL). `DEMO_API_SECRET` is read only through a server-only-guarded module
(`c04 _lib/server-secret.ts`, with a `typeof window` runtime guard) and only a
REDACTED preview is rendered to the page — the raw value never reaches a client
chunk.

**XSS / injection sweep:** Only `dangerouslySetInnerHTML` usages are in
`lab-optimizations/_components/ScriptDemo.tsx` — static inline `__html` literals
(analytics-snippet placeholders), no user input, correctly commented as safe and
required by `next/script` for inline scripts. No `eval` / `new Function` /
`child_process` / `exec` in executable code (only doc text). All session/review/
user data rendered via JSX text (React auto-escaped). The OG image flows product
data through Satori (CSS-to-SVG), which executes no markup → no XSS. No SQL
(in-memory Maps only). No `console.*` logs secrets/tokens/cookies (verified the
only auth-related logs are the dev-fallback warnings, which omit the value).

**Other mutating Server Actions (c10, c15, c17, c18, c19):** All validate input
server-side (c19 uses a strict `/^[\w-]+$/` regex on item IDs; c17 uses Zod;
c15 reconcile checks authn first, validates each cart item, skips malformed
entries, and explicitly notes the client-price-trust caveat) and mutate only
local/in-memory stores — never the frozen `lib/data`. Each documents its
auth-deferral with a "no risk_flags / auth is C12's scope" note rather than
silently teaching unauthenticated mutation as acceptable. No insecure toy is
referenced by `lib/registry.ts`.

---

## SUMMARY

Critical: 0
High    : 0
Medium  : 0
Low     : 4

Overall verdict: **PASS**

One-paragraph sign-off: The security-teaching solutions are safe to learn from
and, in the two cases that matter most (the lib/auth jose session and the c12
hardened Server Action), are genuinely exemplary references a learner can carry
to production with confidence — correct cryptographic verification, correct
cookie flags, correct authn→rate-limit→validation→authz(IDOR)→write ordering,
and accurate inline rationale. Both deliberately-insecure toys are properly
quarantined: distinct identifiers, injected (not live) I/O seams, never imported
by a route, the c12 toy writes nothing, and both are unmistakably labeled. No
secrets are committed, no user input reaches an XSS or injection sink, and no
secret is logged. The four Low findings are teaching-consistency and
defense-in-depth refinements — a proxy matcher that points at a non-existent
route while the real protected page is correctly guarded elsewhere (no bypass);
an OG-image `runtime = "edge"` export that contradicts the repo's own Cache
Components rule (a build/teaching-consistency issue, not a vuln); absent
production response headers (fine for localhost); and a `createOrder` that trusts
client item prices while only the total is server-computed (the headline lesson
is taught, the subtler half deserves the same candor the cart-reconcile file
already shows). None block the curriculum.
