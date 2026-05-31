# Challenge Spec — Server Action Security: Break It, Then Harden It

> **File:** `app/(challenges)/c12-action-security/_meta/spec.md`

---

## Learning Goal

Next.js Server Actions are **public POST endpoints**.  Any code that is marked
`"use server"` compiles into an HTTP endpoint that can be called directly with
`curl`, Burp Suite, or a custom `fetch()` — the React UI is not in the path.
This challenge teaches you to feel that threat concretely: you will study a
deliberately broken action, understand exactly how an attacker exploits it,
and then replace it with a hardened version that enforces authentication,
ownership authorization, input validation, rate limiting, and CSRF awareness.

---

## Threat Model

### T1 — Missing Authentication (Unauthenticated Mutation)

A Server Action that mutates data without calling `getSession()` allows
**anyone**, logged in or not, to invoke it.  The attacker needs only the
endpoint URL (revealed by React&apos;s `$$ACTION_ID` comment in the HTML source
or inferred by enumeration) and can send a POST with arbitrary input.

**Defense:** Call `await getSession()` as the very first thing in every
mutating action.  Reject with a generic error (`"Unauthorized"`) if the
result is `null`.

---

### T2 — Missing Authorization / IDOR (Insecure Direct Object Reference)

Even an authenticated user must only be allowed to mutate **their own** data.
Without an ownership check, any authenticated user can pass another user&apos;s
`reviewId` to the action and edit or delete their review.  This is IDOR
— the object is referenced directly (by ID) and no check verifies that the
caller owns it.

**Defense:** After authenticating, fetch the target record from the store and
verify that `record.userId === session.user.id`.  Return a generic `"Forbidden"`
error on mismatch (do not leak which IDs exist or whose they are).

---

### T3 — Missing Input Validation (Injection / Corrupt State)

A Server Action that passes caller-supplied data directly to the store without
validation trusts the caller completely.  An attacker can supply:
- A `rating` of `999` or `-1` to corrupt the product&apos;s average rating
- An extremely long `body` string to exhaust memory / storage
- A `productId` that does not exist, causing a server-side crash or
  unexpected side-effects

**Defense:** Validate all inputs with a Zod schema **before** touching the
store.  Reject with a `"Bad Request"` error on schema failure and return the
validation issues so the UI can surface them.

---

### T4 — CSRF / Origin Confusion

Server Actions are protected by Next.js&apos; built-in **Origin check**: the
framework compares the `Origin` header of every Action POST to the
`Host` header of the current request.  A cross-origin attacker (on
`evil.example.com`) cannot trick the user&apos;s browser into triggering an Action
on the app&apos;s origin — the browser sends the correct `Origin` and Next.js
rejects the mismatch.

**Important limitation:** Origin protection **prevents cross-site forgery**,
but it does NOT substitute for authentication (T1) or authorization (T2).  A
same-origin attacker (e.g. stored XSS on the same host) still passes the Origin
check.  Application-level authn + authz must be present.

**Note:** Do not add your own CSRF token for Server Actions; Next.js already
handles it at the framework level.  Adding a second CSRF layer creates
confusion and could be bypassed independently.

---

### T5 — Brute-Force / Abusive Invocation (Rate Limiting)

Because a Server Action is a plain HTTP endpoint, an attacker can call it
thousands of times per second — to brute-force content (e.g. trying all
possible `reviewId`s), flood the in-memory store with bogus reviews, or
amplify destructive mutations.

**Defense (concept demo):** Use an in-memory counter keyed by IP address (or
user ID after authentication) to allow at most N requests per window.  For a
real production system, replace this with Redis + `@upstash/ratelimit` or an
edge-network rate-limit rule.  The in-memory approach shown here resets on
server restart and does not work across multiple instances.

---

## Scenario

Nextmart stores product reviews.  The challenge shows an `editReview` action
that lets users update the `rating` and `body` of a review they have written.

- `solutions/c12-action-security/insecure/actions.ts` — the broken action.
  Study it; understand the four threats it exposes.
- `app/(challenges)/c12-action-security/_lib/actions.ts` — the hardened live
  demo.  This is the action the UI invokes.

---

## Tasks

### Part 1 — Read the Insecure Action

- [ ] **T1.1** — Open `solutions/c12-action-security/insecure/actions.ts`.
  Identify the four missing defenses (authn, authz, validation, rate-limit).

- [ ] **T1.2** — Read the attack walkthrough in
  `solutions/c12-action-security/insecure/README.md`.  Understand each `curl`
  exploit and why it works.

### Part 2 — Attack the Insecure Action (Conceptual)

- [ ] **T2.1 — Unauthenticated mutation.**  The insecure action has no session
  check.  Any `POST` with an `$$ACTION_ID` can edit a review without a session
  cookie.  Write down what `curl` command you would use.

- [ ] **T2.2 — IDOR.**  Log in as `buyer1@nextmart.dev`.  Pass the `id` of a
  review written by `buyer2@nextmart.dev` to the insecure action.  Note that
  it succeeds — you edited someone else&apos;s review.

- [ ] **T2.3 — Invalid input.**  Pass `rating: 999` to the insecure action.
  Observe that the product&apos;s average rating is corrupted.

### Part 3 — Study the Hardened Action

- [ ] **T3.1** — Open `app/(challenges)/c12-action-security/_lib/actions.ts`.
  Confirm the order: authenticate → authorize → validate → write.

- [ ] **T3.2** — Find where `getSession()` is called and what happens when
  it returns `null`.

- [ ] **T3.3** — Find the ownership check.  Note that it only compares
  `review.userId === session.user.id` — it does not use the caller-supplied
  userId.

- [ ] **T3.4** — Find the Zod schema in `_lib/schema.ts`.  Understand why
  `rating` is `z.number().int().min(1).max(5)` and `body` is
  `z.string().min(1).max(2000)`.

- [ ] **T3.5** — Find the rate-limiter.  Understand that it is a concept demo
  only (in-memory, single process) and what a production replacement looks like.

### Part 4 — Live Demo

- [ ] Navigate to `/c12-action-security`.
- [ ] Log in as `buyer1@nextmart.dev` in `/c01-auth` first.
- [ ] Use the form to edit your own review — it succeeds.
- [ ] Open DevTools → Network.  Note the Server Action POST to the current URL
  with a `Next-Action` header.
- [ ] Try editing a review you do not own (change the `reviewId` in the form
  hidden input with DevTools) — the action returns `"Forbidden"`.

---

## Acceptance Criteria

1. `next build` exits 0 with no type or lint errors.
2. `npx tsc --noEmit` exits 0.
3. The hardened action (`_lib/actions.ts`) rejects an unauthenticated call with
   `"Unauthorized"` and does NOT touch the store.
4. The hardened action rejects a valid session attempting to edit a review
   owned by a different user with `"Forbidden"` and does NOT touch the store.
5. The hardened action rejects an invalid `rating` (outside 1–5) or empty
   `body` with a validation error and does NOT touch the store.
6. The insecure action lives ONLY under `solutions/` and is never imported by
   any live application route.
7. `NOTES.md` explains Next.js&apos; built-in Origin/CSRF protection vs app-level
   checks, and documents the rate-limit concept.
