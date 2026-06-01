# Solution Notes — Capstone: Harden, Polish & Deploy Nextmart

> **Read AFTER completing the challenge and filling in defend-it.md.**

---

## What the Capstone Is Really Testing

The capstone is not a new technical concept — it is a forcing function. It
makes you apply five different skills simultaneously on a single codebase
under real delivery conditions. The skills are:

1. **Rendering strategy discipline** — knowing when to use ○ Static, ◐ PPR,
   or ƒ Dynamic and why (from Tiers 1–2).
2. **Performance measurement** — defining budgets BEFORE measuring, not after
   (so you have an objective pass/fail, not a subjective "looks fast enough").
3. **Accessibility auditing** — systematic, not ad hoc. The five-task framework
   (A2.1–A2.5) mirrors what a WCAG auditor does.
4. **Production deployment** — environment variables, secrets management, build
   verification, and smoke testing the live URL.
5. **Communication** — README.md, deploy-notes.md, and perf-budget.md are
   the deliverables that a senior engineer would hand to a teammate.

---

## Why the Skip Link Matters (Q3 model answer extension)

The skip link is required by WCAG 2.4.1 (Bypass Blocks, Level A — the lowest
bar). It is one of the most commonly failed accessibility criteria on
developer-built sites because developers always test with a mouse.

The Tailwind `sr-only` utility sets:
```css
position: absolute;
width: 1px;
height: 1px;
padding: 0;
margin: -1px;
overflow: hidden;
clip: rect(0, 0, 0, 0);
white-space: nowrap;
border-width: 0;
```

When a sighted keyboard user presses Tab, the link receives focus. The
`focus:not-sr-only` modifier removes all of the above rules, making the link
visible. `focus:absolute focus:top-3 focus:left-3` positions it in the top-
left corner where keyboard users expect to find it.

---

## Rendering Strategy Decisions (P1 answers)

### Why the challenge index is ○ Static

`discoverChallenges()` uses `fs.globSync` — a synchronous filesystem read.
This is not a network call and not a per-request value. The list of challenges
is fixed at build time. There is no reason to re-render it on every request.

Under `cacheComponents: true`, a page that reads no dynamic data is
automatically classified as ○ Static. No `export const dynamic` is needed (in
fact, that directive is incompatible with cacheComponents).

### Why the capstone page (c25-capstone) is ○ Static

Same reason as the index: no dynamic data. The five-part structure, the
tier-connection table, and the acceptance criteria are all compile-time
constants. Prerendering to HTML means the capstone page is served from CDN
with ~0ms TTFB.

### Contrasting: why /c01-auth is ◐ PPR

The session panel reads `cookies()` (per-request data). If this were at the
route's top level, the build would fail:
```
Error: Uncached data was accessed outside of <Suspense>
```
Moving the `cookies()` call inside a child component (`<SessionPanel>`) that
is wrapped in `<Suspense>` makes the shell static and the hole dynamic. The
static shell prerenders; the hole streams in per-request.

---

## Performance Budget: Key Insight

Define the budget BEFORE you run Lighthouse. If you run Lighthouse first and
then set targets based on what you see, you are not setting a budget — you are
rationalising existing performance. A budget forces you to ask: "What do our
users need?" not "What did we happen to achieve?"

The six metrics in the budget are the ones Google uses to rank pages in Core
Web Vitals. Lighthouse scores correlate with but are not identical to field
data (CrUX). Field data matters more for SEO; Lighthouse matters more for
catching regressions in CI.

---

## Accessibility: the Colour Contrast Gap

The `text-gray-400` on white contrast ratio (~3.1:1) fails WCAG AA for normal-
weight text at small sizes. This is a real, known issue in many Tailwind-based
designs: `gray-400` looks soft and elegant but is insufficient for readability
compliance.

Remediation options (choose one):
1. **Quickest:** change `text-gray-400` to `text-gray-500` on all secondary
   text labels. Ratio: ~5.2:1. Passes AA.
2. **Best UX:** use `text-gray-600` for secondary text. Ratio: ~7.0:1.
   Passes AA and AAA. Slightly darker but still clearly secondary.
3. **Acceptable for purely decorative text:** mark the element with
   `aria-hidden="true"` if it conveys no information not already present
   elsewhere. This exempts it from contrast requirements but means screen
   reader users can't access it.

For the tier headings (all-caps, small, uppercase), WCAG allows a lower
threshold (3:1) for text at 18pt bold or 14pt bold. Uppercase small text may
qualify as "large text" depending on the computed font size. The recommended
approach is still to use `text-gray-500` or higher.

---

## Deployment: Environment Variables Security Model

The separation between `NEXT_PUBLIC_` and non-prefixed env vars maps directly
to the server/client split in Next.js:

```
Server Components, Route Handlers, Server Actions
  → process.env.SESSION_SECRET   ✓ available
  → process.env.NEXT_PUBLIC_URL  ✓ available

Client Components ("use client"), browser JS bundle
  → process.env.SESSION_SECRET   ✗ undefined (stripped at build)
  → process.env.NEXT_PUBLIC_URL  ✓ inlined at build time (string literal)
```

Vercel enforces this correctly when you mark variables as "Server-only" in
the dashboard. As a learner, always pause before naming an env var and ask:
"Would a user seeing this in the JS bundle be a security problem?" If yes —
do not prefix with `NEXT_PUBLIC_`.

---

## Common Capstone Mistakes

1. **Adding npm dependencies** — The task contract forbids it (`package.json`
   is frozen). All required libraries are already installed. If you think you
   need a new package, find the native Web API or Next.js built-in equivalent.

2. **Forgetting to test the skip link** — Press Tab on a fresh page load.
   The skip link must be the first focused element. Many implementations
   accidentally put a hidden `<input>` or a non-interactive element before it
   in the DOM order.

3. **Setting targets after measuring** — See the performance budget insight
   above. Set the number first, measure second.

4. **Not updating NEXT_PUBLIC_SITE_URL after the first deploy** — The first
   deploy produces a URL like `https://next-learn-xyz123.vercel.app`. Update
   the env var to this URL and redeploy so the sitemap lists the correct
   domain. Without this, `/sitemap.xml` lists `https://nextmart.vercel.app`
   (the fallback default) regardless of the actual URL.

5. **Checking all boxes before running `npm run build`** — Always verify
   the build passes after every set of changes. The capstone acceptance
   criteria require a clean build.

---

## Reference Implementation

The shell changes (app/layout.tsx, app/page.tsx, app/globals.css) and the
global state files (app/error.tsx, app/not-found.tsx, app/loading.tsx) are
the reference implementation. Compare your changes against the committed
versions of these files.

The docs files (docs/perf-budget.md, docs/a11y-pass.md, docs/deploy-notes.md)
are templates — you must fill in the measured baselines and your live URL.

---

*This is the final challenge in the Nextmart curriculum. Well done.*
