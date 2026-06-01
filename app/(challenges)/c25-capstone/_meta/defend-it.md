# Defend-It Worksheet — Capstone: Harden, Polish & Deploy Nextmart

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c25-capstone/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Static vs PPR vs Dynamic: the decision

*You have a product listing page that shows a grid of products (fetched from
a data layer) and a personalised cart-item count in the header. Which Next.js
rendering strategy would you choose for this page and why? What would you
place in the static shell vs the Suspense hole?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

The right strategy is **Partial Prerendering (PPR, ◐)**. The product grid
can be made static with `'use cache'` (products do not change on every
request) and prerendered at build or revalidation time — this gives an
immediate first paint with no server wait. The personalised cart count
depends on the session cookie (per-request data) and must NOT be in the
static shell, because reading `cookies()` at the route&apos;s top level fails the
`cacheComponents: true` build.

Structure:
- **Static shell** (prerendered): `<header>` with nav and logo, the product
  grid (wrapped in `'use cache'`), and the page skeleton/layout.
- **Suspense hole** (streamed per-request): `<CartCount>` — a child Server
  Component that calls `await cookies()` and `await getSession()` inside a
  `<Suspense fallback={<span>...</span>}>`.

This pattern gives the fastest possible first paint (the static shell arrives
from CDN in ~50ms) while still personalising the header with fresh session
data. Choosing pure `ƒ (Dynamic)` for the entire page would add 300–500ms of
server wait for every visitor just to personalise the cart count.

</details>

---

### Q2 — Core Web Vitals: what they measure and how to fix them

*Name the three Core Web Vitals, what each one measures, and one concrete
Next.js-specific technique to improve each.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

**LCP — Largest Contentful Paint** measures how long until the largest visible
element (usually a hero image or the largest text block) is painted. In
Next.js: use `<Image priority>` on the above-the-fold hero image to preload
it. Without `priority`, `next/image` lazy-loads all images by default, which
hurts LCP on the main product image.

**INP — Interaction to Next Paint** (replaced FID in 2024) measures the time
between a user interaction (click, keypress) and the next frame paint. In
Next.js: move expensive logic to Server Components or Server Actions so the
client JS bundle stays small. A large bundle means more main-thread parse
time, which blocks the browser from responding to interactions quickly.

**CLS — Cumulative Layout Shift** measures unexpected layout shifts during
load. The most common cause in Next.js is images without explicit dimensions
(the browser reserves no space before the image loads, so the page jumps when
it arrives). Fix: always provide `width` and `height` (or `fill` + a sized
container) to every `<Image>`. Also avoid injecting content (banners, cookie
notices) above existing content after first paint.

</details>

---

### Q3 — Accessibility: semantic HTML and the skip link

*Why does a site need a &quot;skip to main content&quot; link, what users benefit from
it, and how do you implement one in Next.js without it being visible to mouse
users?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Keyboard and screen-reader users navigate page-to-page by pressing Tab
repeatedly. Without a skip link, every new page requires the user to Tab
through the entire navigation (logo, all nav links, any secondary nav) before
reaching the main content. On a site with 10 nav items, that is 10 Tab
presses of wasted effort on every page load — a significant friction for
users who cannot use a mouse.

The skip link is the first focusable element on the page. It points to
`#main-content` (the `id` on `<main>`). Sighted mouse users never see it
because it is hidden off-screen (`sr-only` = `position: absolute; clip:
rect(0,0,0,0)`). The moment a keyboard user presses Tab, the skip link
receives focus and the CSS `focus:not-sr-only` class makes it visible — it
appears as a small button in the top-left corner. Pressing Enter jumps focus
directly to `<main>`, bypassing the nav.

Implementation in Next.js `app/layout.tsx`:
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
             focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:ring-2
             focus:ring-indigo-500 focus:rounded-md"
>
  Skip to main content
</a>
```
Then `<main id="main-content">` — the `id` is the anchor target.

</details>

---

### Q4 — Deployment: environment variables and secrets

*When deploying a Next.js app to Vercel, what is the difference between
`NEXT_PUBLIC_` and non-prefixed environment variables? Give a concrete example
of each from Nextmart and explain the security implication of prefixing a
secret with `NEXT_PUBLIC_`.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`NEXT_PUBLIC_` variables are **inlined into the client-side JavaScript bundle
at build time** — they are publicly readable by anyone who downloads the
bundle. Use them only for non-secret, user-facing values.

Non-prefixed variables are **server-only**: they are available in Server
Components, Route Handlers, and Server Actions (the server runtime), but Next
strips them from any client bundle. Use them for secrets.

Nextmart examples:
- `NEXT_PUBLIC_SITE_URL=https://nextmart.vercel.app` — safe to be public;
  used in OG tags and the sitemap to build absolute URLs. Clients can see
  their own site URL.
- `SESSION_SECRET=<32 byte hex>` — a symmetric key used by `lib/auth` to
  sign and verify JWTs. If this were `NEXT_PUBLIC_SESSION_SECRET`, an
  attacker could download the JS bundle, extract the secret, sign forged
  JWTs, and authenticate as any user. It must be server-only.

Security implication: prefixing `SESSION_SECRET` with `NEXT_PUBLIC_` would
immediately compromise the entire authentication system. There is no mitigation
short of rotating the secret — invalidating all existing sessions.

</details>

---

### Q5 — sitemap.ts vs robots.ts: location and purpose

*A junior developer puts sitemap.ts inside a route segment
(`app/(challenges)/c06-metadata-seo/sitemap.ts`). What is wrong with this,
and how does the correct `app/sitemap.ts` differ in both location and URL
behaviour?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

Search engines expect `sitemap.xml` to live at the root of the domain:
`https://example.com/sitemap.xml`. Next.js generates this automatically from
`app/sitemap.ts` (the file at the `app/` root). A `sitemap.ts` inside a
nested route segment is treated by Next.js as a segment-scoped sitemap — it
generates XML at the segment&apos;s URL path, e.g.
`/c06-metadata-seo/sitemap.xml`. Google would never find it at the
conventional location, and even if you submitted it manually, it would only
list routes under that segment.

Similarly, `robots.txt` must be at `https://example.com/robots.txt`. A
`robots.ts` inside a segment generates `/c06-metadata-seo/robots.txt`, which
crawlers never look for.

The fix: place both files at `app/sitemap.ts` and `app/robots.ts`. The
segment-level files (like the c06 example) are useful as teaching examples
but must never be confused with the real production files.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Static vs PPR vs Dynamic | | |
| 2 | Core Web Vitals | | |
| 3 | Accessibility and skip link | | |
| 4 | Environment variables and secrets | | |
| 5 | sitemap.ts location | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or &quot;I don&apos;t know&quot; — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c25-capstone/`.*
