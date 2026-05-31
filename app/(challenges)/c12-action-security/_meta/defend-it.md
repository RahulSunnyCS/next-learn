# Defend-It Worksheet — Server Action Security: Break It, Then Harden It

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c12-action-security/`.  Write in your own words —
> the goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Why Server Actions are public POST endpoints

*A junior developer says &quot;Server Actions are safe because they only run on the
server.&quot;  Explain why this reasoning is dangerously wrong.  What must every
mutating Server Action check before touching any data?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

&quot;Runs on the server&quot; only means the function body executes in Node.js, not in
the browser.  It does NOT mean the function is private.  Next.js compiles every
`&quot;use server&quot;` function into an HTTP endpoint that accepts a POST request.
The React UI is just a convenience layer on top of this endpoint — an attacker
can bypass it entirely with `curl`, Postman, or a custom `fetch()`.

The only thing that makes an action &quot;private&quot; is application-level enforcement:

1. **Authentication** — call `await getSession()` and reject (`throw` or
   `return { error: &quot;Unauthorized&quot; }`) if `null`.
2. **Authorization** — verify that the authenticated user is allowed to perform
   this specific operation on this specific resource (ownership check).
3. **Validation** — parse all inputs through a Zod schema before any write.

Without these three checks, the action is an unauthenticated, unvalidated HTTP
endpoint open to the entire internet.

</details>

---

### Q2 — IDOR: what it is and why an ownership check closes it

*Describe an Insecure Direct Object Reference (IDOR) attack in the context of
a Server Action.  A user is logged in as `buyer1@nextmart.dev`.  The action
receives `{ reviewId: &quot;r-002&quot;, rating: 1, body: &quot;garbage&quot; }`.  Review `r-002`
belongs to `buyer2@nextmart.dev`.  Walk through what happens in an insecure
action vs a hardened action.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

An IDOR attack occurs when an application accepts a user-controlled identifier
(here `reviewId`) and uses it to look up a record without checking that the
caller is authorised to access that record.  The object is referenced directly
by its ID, and there is no ownership gate.

**Insecure action flow:**
1. Look up review `r-002` from the store.
2. Update `rating` and `body` with the caller-supplied values.
3. Write back to the store.
4. `buyer1` has just overwritten `buyer2`&apos;s review.

**Hardened action flow:**
1. Call `getSession()` — confirm the caller is `buyer1` (`u-buyer-1`).
2. Look up review `r-002` from the store.
3. Check `review.userId === session.user.id`:
   `&quot;u-buyer-2&quot; === &quot;u-buyer-1&quot;` → **false**.
4. Return `{ error: &quot;Forbidden&quot; }`.  The store is never touched.

The key insight: the ownership check ONLY uses the server-verified session
user ID — it NEVER trusts a `userId` field supplied by the caller (that would
be trivially bypassable).

</details>

---

### Q3 — Next.js Origin protection vs application-level checks

*What does Next.js&apos; built-in Server Action CSRF / Origin protection actually
prevent?  What does it NOT prevent?  Give a concrete example of an attack that
bypasses Origin protection.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Next.js compares the `Origin` header of every Server Action POST to the
application&apos;s `Host`.  If they differ — meaning the request came from a
different origin — the framework rejects the request with a 403 before your
action code even runs.  This prevents classic CSRF: an attacker on
`evil.example.com` cannot embed an HTML form that submits to the Nextmart
action and have the victim&apos;s browser trigger it successfully.

**What it does NOT prevent:**

1. **Unauthenticated mutation** — the action is reachable from the same origin
   without a session.  A new tab on `localhost:3000` has the correct origin
   and passes the Origin check even with no session cookie.

2. **IDOR** — an authenticated attacker with a valid session passes the Origin
   check, then passes a victim&apos;s resource ID to overwrite their data.

3. **Stored XSS** — JavaScript injected into the same host (e.g. through an
   unescaped user-supplied value rendered into the page) runs in the same
   origin context and can call Server Actions directly with `fetch()`.  The
   Origin check sees `https://nextmart.dev` and passes — but the action is
   being invoked by injected code.

**Concrete example of bypassing Origin protection:**
Burp Suite configured as a proxy can modify the `Origin` header of outgoing
requests.  More commonly, a developer tool or server-side proxy strips or
overrides `Origin`.  The defense is to rely on application-level authn + authz
(which verify the session, not just the header) rather than Origin alone.

</details>

---

### Q4 — Zod validation: why validate in the action, not just the UI

*The edit-review form already validates inputs in the browser before submitting.
Why must the Server Action also validate with Zod?  Give two concrete examples
of what an attacker can bypass if server-side validation is absent.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Browser validation is entirely under the user&apos;s control.  The action receives
raw data over HTTP; it has no way to know whether that data went through the
browser&apos;s form or arrived directly from `curl`.  Client-side validation is
**UI sugar** — it improves user experience but provides zero security.

**Two concrete bypasses:**

1. **`curl` with out-of-range rating:**
   ```bash
   curl -X POST https://app.example.com/c12-action-security \
     -H &quot;Next-Action: <action-id>&quot; \
     -d &apos;[&quot;r-001&quot;, 999, &quot;garbage&quot;]&apos;
   ```
   Without Zod validation, `rating: 999` flows directly into `addReview`,
   which then computes an average rating like `503.5 / 4` — corrupting the
   product&apos;s displayed rating permanently.

2. **Body length explosion:**
   ```bash
   # body is a 10 MB string
   curl -X POST ... -d &quot;[\"r-001\", 5, \"$(python3 -c &apos;print(&quot;A&quot;*10000000)&apos;)\"]&quot;
   ```
   Without a `max` constraint on `body`, the server allocates 10 MB per
   request.  At 100 concurrent requests this is 1 GB of heap — a practical
   memory DoS against a Node.js server.

Zod validation in the action closes both: `z.number().int().min(1).max(5)`
rejects `999`; `z.string().min(1).max(2000)` rejects anything longer than
2000 characters.  The guard runs BEFORE any write, so the store is never
touched.

</details>

---

### Q5 — Rate limiting: in-memory concept vs production

*The hardened action uses an in-memory rate limiter (a `Map` keyed by user ID).
Explain two specific failure modes of this approach in a production system.
What should replace it in production, and why?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**Failure mode 1 — Multiple server instances:**
Node.js is single-process per server, but a production deployment runs many
replicas (containers, Kubernetes pods, serverless function instances).  Each
replica has its own in-memory `Map`.  An attacker sending 10 requests per
replica per minute can drive 10 × N total requests per minute (N = number of
replicas) while never exceeding the per-replica limit.  The rate limiter is
completely ineffective across the fleet.

**Failure mode 2 — Server restart wipes state:**
The in-memory counter resets to zero on every deployment, server restart, or
crash.  An attacker can trigger 500 requests (all passing if the limit is
50/hour), wait for the server to restart (easily detectable by observing
deployment schedules or probing for 502 errors), and immediately flood with
another 500.  The window is unbounded.

**Production replacement — Redis with a sliding-window algorithm:**
A shared Redis instance (e.g. `@upstash/ratelimit` or `ioredis`) stores the
counter in a single place that all server instances share.  The counter
survives server restarts.  A sliding-window algorithm (e.g. &quot;50 edits per
user per hour, window slides in real time&quot;) is precise and does not allow
burst-at-window-boundary attacks that a fixed-window allows.

An alternative for edge deployments is a CDN / edge-network rate-limit rule
(Cloudflare Rate Limiting, Vercel Edge Middleware) that blocks at the network
layer before the request even reaches Node.js.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Server Actions as public endpoints | | |
| 2 | IDOR and ownership check | | |
| 3 | Origin protection vs app-level checks | | |
| 4 | Zod validation: server not just client | | |
| 5 | Rate limiting: in-memory vs production | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c12-action-security/`.*
