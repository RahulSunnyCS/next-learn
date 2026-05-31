# Defend-It Worksheet — Built-in Next.js Optimizations

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/lab-optimizations/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — CLS and next/image

*What is Cumulative Layout Shift (CLS) and what specific property of a raw
`<img>` tag causes it?  How does a static import into `next/image` prevent it
at build time — not just at runtime?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

CLS measures how much the visible page layout shifts unexpectedly during load.
A score above 0.1 is "Needs Improvement" in Core Web Vitals.

A raw `<img src="...">` tag without `width` and `height` attributes gives the
browser no information about the image's dimensions until the file starts
downloading.  Until then the browser allocates zero height for it, so all
content below it sits higher on the page.  When the image arrives and its
natural dimensions are known, the browser inserts the image and pushes all
following content down.  This sudden jump IS the layout shift — it disorients
users who were reading or clicking below the image.

A **static import** (`import img from './assets/hero.png'`) works at build
time: Next.js (via a webpack/Turbopack loader) reads the image file's
dimensions from the binary headers before the app ever runs.  The result is a
`StaticImageData` object like `{ src: "/_next/...", width: 800, height: 600 }`.
When `<Image src={img}>` receives this, it knows the dimensions before the
browser starts rendering — it emits an `<img width="800" height="600">` in the
HTML which the browser uses to reserve exactly the right space.  The image can
arrive any time later; nothing moves because the space was already allocated.

</details>

---

### Q2 — next/font and size-adjust

*A developer says "I can just add `display: swap` to my `@font-face` rule and
there will be no layout shift."  Explain why this is wrong and what
`size-adjust` (used by `next/font`) actually solves.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`font-display: swap` tells the browser: show text immediately using the
fallback font, then swap to the custom font when it's ready.  This avoids
invisible text (FOIT — Flash of Invisible Text) but does NOT prevent layout
shift.

The problem: the fallback font (e.g. Arial) has different character widths than
the custom font (e.g. Inter).  When the swap happens, a word that was 120px
wide in Arial becomes 108px wide in Inter.  Text re-flows across lines, the
line count changes, and everything below the text block jumps — this IS a
layout shift.

`size-adjust` (a CSS `@font-face` descriptor, not a property) scales the
entire fallback font's character sizes by a percentage to match the custom
font's metrics.  If Inter's average glyph width is 85% of Arial's, `size-adjust:
117.6%` tells the browser to render Arial 17.6% wider than normal — making it
occupy the same space as Inter would.  When the real font swaps in, the text
takes up exactly the same space and nothing moves.

Next.js computes the correct `size-adjust` value from the font file's metrics
automatically and injects it into the `@font-face` rule.  You get zero-shift
font swap for free; `display: swap` alone would still shift.

</details>

---

### Q3 — next/script strategies

*Why is `strategy="beforeInteractive"` potentially dangerous if overused?
Name one scenario where it is genuinely required and two scenarios where
`afterInteractive` is the correct choice instead.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`beforeInteractive` injects the script into the initial server-rendered HTML
and blocks hydration until the script finishes loading and executing.  This
directly delays Time to Interactive (TTI) — the point at which the user can
interact with the page.  If a 300 kB script has `beforeInteractive`, the page
is visually painted but frozen (clicks do nothing) until that script finishes.
Every additional `beforeInteractive` script compounds this delay linearly.

**Genuinely required:** A GDPR Consent Management Platform (CMP) that must
gate all other JavaScript (analytics, advertising) until the user accepts.
If analytics scripts start firing before the CMP has a chance to intercept
them, you are in legal violation of GDPR.  The CMP must exist before any
other scripts run.

**Should be `afterInteractive` instead:**
1. Google Analytics / Segment / Mixpanel — these are observability tools.
   Losing a few seconds of early page-view tracking is acceptable.  They
   must not block the page from becoming interactive.
2. A/B testing scripts (Optimizely, VWO) — often incorrectly placed as
   `beforeInteractive` to prevent flash-of-original-content.  The visual
   flicker is far less harmful than a 2-second TTI penalty; these can be
   deferred and the flicker mitigated with CSS applied before paint.

</details>

---

### Q4 — Link prefetch

*Under what conditions does `next/link` fire a prefetch request, and why does
prefetching not happen in `next dev`?  Give one scenario where you would
deliberately set `prefetch={false}`.*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

In a **production build** (`next build + next start`), `<Link>` fires a
prefetch request when the element enters the browser viewport (detected via
`IntersectionObserver`).  The request fetches the linked route's RSC (React
Server Component) payload — the serialised component tree — so that navigating
to the link is instant: the data is already in the client router cache.

In **`next dev`**, prefetch is suppressed because the dev server recompiles
routes on demand.  Prefetching in dev would trigger unnecessary compilations
for every link that scrolls into view, making the dev server noticeably slower
and polluting the terminal with compile logs.

**One scenario for `prefetch={false}`:** A pagination component with 50 page
links.  As the user scrolls through the product list, all 50 pagination links
would prefetch simultaneously, firing 50 requests in the background, consuming
bandwidth and server resources.  Setting `prefetch={false}` on pagination links
means only the currently hovered/clicked link triggers a navigation.

</details>

---

### Q5 — next/dynamic and ssr: false

*What does `ssr: false` mean in a `next/dynamic` call?  Give a concrete example
of why a charting component might need it, and what the tradeoff is — what do
you lose by setting `ssr: false`?*

**Your answer:**

<!-- Write here -->

---

**Model answer (read AFTER filling yours in):**

<details>
<summary>Reveal model answer</summary>

`ssr: false` tells `next/dynamic` to skip rendering the component on the
server entirely — it will only render in the browser after hydration.  The
server renders nothing for that component (or the `loading` fallback if one
is provided).

**Concrete example for a charting component:** Libraries like Recharts,
Chart.js, and D3 use browser APIs (`canvas`, `ResizeObserver`, `window`,
`document`) that do not exist in Node.js.  If Next.js tries to server-render
a Recharts component, it crashes with `ReferenceError: window is not defined`
or `canvas is not supported`.  Setting `ssr: false` prevents the server from
ever touching the component's render path.

Additionally, even if the server somehow avoided the crash, the server-rendered
chart HTML would not match the client-rendered chart HTML (because chart
dimensions depend on the actual viewport size, which is unknown during SSR).
This causes a React hydration mismatch error in the browser.  `ssr: false`
eliminates the mismatch by ensuring server and client agree: "this component
is client-only."

**Tradeoff:** Search engine crawlers that do not execute JavaScript will never
see the chart content.  If the chart data is important for SEO (unlikely for
analytics dashboards, more likely for product visualisations), `ssr: false` is
a problem.  For internal dashboards and interactive charts that are not
SEO-sensitive, `ssr: false` is the right choice.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | CLS and next/image | | |
| 2 | next/font and size-adjust | | |
| 3 | next/script strategies | | |
| 4 | Link prefetch | | |
| 5 | next/dynamic and ssr: false | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/lab-optimizations/`.*
