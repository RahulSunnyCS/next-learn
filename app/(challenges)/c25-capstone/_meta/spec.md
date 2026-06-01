# Challenge Spec — Capstone: Harden, Polish & Deploy Nextmart

> **File:** `app/(challenges)/c25-capstone/_meta/spec.md`

---

## Learning Goal

The capstone synthesises every skill from Tiers 0–4 into a single end-to-end
delivery. You will apply rendering-strategy knowledge, caching discipline,
security hardening, performance optimisation, accessibility auditing, and
production deployment — all on a real Next.js 16 application.

By the end, you will have:
- A Lighthouse score of 90+ in Performance, Accessibility, Best Practices,
  and SEO on at least one production URL.
- A documented performance budget with measured Core Web Vitals baselines.
- A documented accessibility audit with all critical findings addressed.
- A live, publicly accessible Vercel deployment.
- A portfolio-quality README that explains the curriculum and the project.

---

## Scenario

Nextmart has been built challenge by challenge. Now it is time to ship. You
are the lead engineer responsible for the production release. The product
manager has set the bar: no page should take more than 2.5s to become
interactive, all interactive elements must be keyboard-accessible, and the
site must be crawlable by search engines.

---

## Part 1 — Performance Budget

Define a concrete performance budget before measuring. Document it in
`docs/perf-budget.md` with the following targets:

| Metric | Target | Tool |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5 s | Lighthouse / CrUX |
| FID / INP (Interaction to Next Paint) | ≤ 200 ms | Lighthouse / CrUX |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | Lighthouse |
| TTFB (Time to First Byte) | ≤ 800 ms | WebPageTest |
| Total JS bundle (initial load) | ≤ 150 kB gzip | `next build` output |
| Lighthouse Performance score | ≥ 90 | Lighthouse |

### Tasks

- [ ] **P1.1** — Run `next build` and inspect the route table. Identify any
  routes marked `ƒ (Dynamic)` that could be `◐ (PPR)` or `○ (Static)`.
  Document your findings and rationale in `docs/perf-budget.md`.

- [ ] **P1.2** — Run Lighthouse against the deployed URL (or `npm run build &&
  npm start` locally). Record the scores for Performance, Accessibility,
  Best Practices, and SEO.

- [ ] **P1.3** — Identify the largest JS chunks in `.next/static/chunks/` and
  check whether any heavy imports can be lazily loaded (`next/dynamic`) or
  moved to a Server Component.

- [ ] **P1.4** — Verify all `<Image>` usage has `width`/`height` or `fill`
  and an appropriate `sizes` prop to prevent CLS.

---

## Part 2 — Accessibility Audit

Document findings in `docs/a11y-pass.md`.

### Tasks

- [ ] **A2.1** — Keyboard navigation: tab through every interactive element on
  the challenge index (`/`). Every focusable element must have a visible
  focus ring. No interactive element should be unreachable by keyboard alone.

- [ ] **A2.2** — Screen reader pass: use VoiceOver (macOS) or NVDA (Windows)
  to navigate the index. Headings must form a logical outline (h1 → h2 → h3,
  no skips). Every image must have meaningful `alt` text (decorative images
  use `alt=""`).

- [ ] **A2.3** — Colour contrast: run the Lighthouse accessibility audit. All
  text must meet WCAG 2.1 AA contrast ratios (4.5:1 for normal text, 3:1 for
  large text). Fix any failures.

- [ ] **A2.4** — Semantic HTML: verify the shell (`app/layout.tsx`) uses the
  correct landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`. The skip-to-
  content link (`#main-content`) must be the first focusable element and must
  become visible on focus.

- [ ] **A2.5** — ARIA: verify that dynamically loaded content (Suspense holes)
  is announced correctly to screen readers. Add `aria-live` regions where
  appropriate.

---

## Part 3 — Error, Empty & Loading States

- [ ] **E3.1** — Verify that `app/error.tsx` catches runtime errors and shows
  a user-friendly message with a retry button. Test by temporarily throwing an
  error in a Server Component.

- [ ] **E3.2** — Verify that `app/not-found.tsx` provides a helpful 404 page
  with a link back to the index.

- [ ] **E3.3** — Verify that `app/loading.tsx` provides a meaningful skeleton
  at the route level, not just a blank screen.

- [ ] **E3.4** — For each challenge with a dynamic data hole (Suspense boundary),
  ensure the `fallback` is a skeleton that matches the layout of the actual
  content (prevents CLS).

---

## Part 4 — SEO

- [ ] **S4.1** — Verify that `app/sitemap.ts` is reachable at `/sitemap.xml`
  and lists all challenge routes.

- [ ] **S4.2** — Verify that `app/robots.ts` is reachable at `/robots.txt`
  and contains a correct sitemap pointer.

- [ ] **S4.3** — Verify that every challenge page has a unique `<title>` and
  `<meta name="description">` tag (from the `metadata` export or
  `generateMetadata`).

- [ ] **S4.4** — Verify the OG image from c06 is reachable for the challenge
  index (`/og`). If not present, add a simple text-based OG image route.

---

## Part 5 — Deployment

Deploy to Vercel using the free tier.

- [ ] **D5.1** — Push the repository to GitHub (if not already there).

- [ ] **D5.2** — Import the project into Vercel. Set environment variables:
  `SESSION_SECRET` (32+ char random string), `NODE_ENV=production`,
  `NEXT_PUBLIC_SITE_URL=https://your-deployment.vercel.app`.

- [ ] **D5.3** — Verify the build log in Vercel. It must exit 0.

- [ ] **D5.4** — Open the deployed URL. Verify the challenge index renders,
  all challenges appear, and at least two challenges function end-to-end.

- [ ] **D5.5** — Document the deployment in `docs/deploy-notes.md` with:
  - The live URL
  - The environment variables required
  - Any caveats (e.g. the OAuth challenge requires additional provider setup)

---

## Acceptance Criteria

1. `npm run build` exits 0 with all challenge routes present in the route
   table, including `c25-capstone`.
2. `npm run lint` exits 0 (0 errors).
3. `npx tsc --noEmit` exits 0.
4. `npm test` — all existing vitest tests pass.
5. `docs/perf-budget.md` exists and defines the six metrics above with
   measured baselines.
6. `docs/a11y-pass.md` exists and records the results of each audit task
   (A2.1–A2.5), with findings addressed or explicitly accepted with rationale.
7. The shell (`app/layout.tsx`) uses semantic HTML landmarks and includes a
   skip-to-content link.
8. `app/sitemap.ts` generates a sitemap that includes all challenge routes.
9. `app/robots.ts` generates a valid `robots.txt` pointing at the sitemap.
10. `docs/deploy-notes.md` contains the live Vercel URL and setup instructions.

---

## Hints

<details>
<summary>Hint 1 — PPR vs Dynamic: when to prefer each</summary>

PPR (◐) is the right choice when the page has a meaningful static shell that
can prerender immediately and a small dynamic hole (e.g. the current user's
cart count). Pure dynamic (ƒ) is correct when the entire page depends on
per-request data (e.g. a personalised dashboard). If a page is currently ƒ
but has a large static portion, refactor: extract the static portion into the
outer Server Component (the shell) and move the dynamic read into a Suspense-
wrapped child component (the hole).

</details>

<details>
<summary>Hint 2 — Lighthouse in CI</summary>

Install `@lhci/cli` and run `lhci autorun` against `npm start` to integrate
Lighthouse into your CI pipeline. The `lighthouserc.js` config file lets you
assert score thresholds and fail the build if they drop below your budget.
For this challenge, a one-time local run and screenshot is sufficient.

</details>

<details>
<summary>Hint 3 — Skip-to-content link</summary>

```tsx
// In app/layout.tsx, before <header>:
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:rounded">
  Skip to main content
</a>
// On <main>:
<main id="main-content" ...>
```

The `sr-only` class hides it from sighted users. `focus:not-sr-only` makes
it visible when a keyboard user focuses it (the first Tab press). This is the
standard accessible skip-link pattern.

</details>

<details>
<summary>Hint 4 — Vercel environment variables</summary>

`SESSION_SECRET` must be at least 32 characters long. Generate one with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Add it in Vercel Dashboard → Settings → Environment Variables. Never commit
it to the repository.

</details>
