# Verification Checklist — Capstone: Harden, Polish & Deploy Nextmart

> **Purpose:** A human-runnable checklist to verify the capstone is complete.
> Run each item in order. Check the box when it passes.

---

## Build & Code Quality

- [ ] `npm run build` exits 0 — no TypeScript errors, no lint errors.
- [ ] The route table in the build output includes `/c25-capstone`.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm run lint` reports 0 errors.
- [ ] `npm test` — all vitest tests pass.

---

## Shell: Layout & Navigation

- [ ] Navigate to `/`. The page renders the challenge index with a header,
  footer, and all challenge cards.
- [ ] The first Tab press on the page focuses the **skip to main content**
  link — it becomes visible (positioned top-left, with a visible focus ring).
  Pressing Enter jumps focus to the main content area.
- [ ] Tab through the nav items. The Nextmart logo link and the
  &quot;Challenges&quot; link are keyboard-accessible with visible focus styles.
- [ ] The `<header>`, `<nav>`, `<main>`, and `<footer>` landmarks are present
  in the DOM (verify in DevTools → Accessibility or with a screen reader).
- [ ] The footer shows the correct Next.js version and copyright year.

---

## Challenge Index (app/page.tsx)

- [ ] The hero section (project title + subtitle) is visible at the top.
- [ ] A &quot;How this works&quot; / Defend-It workflow section is present.
- [ ] Each tier section shows its description text (not just its label).
- [ ] All 25 challenges are listed (Tier 0 through Tier 5).
- [ ] The total challenge count is displayed and matches the actual count.
- [ ] Each challenge card links to the correct route.

---

## Global States

- [ ] Navigate to a non-existent URL (e.g. `/does-not-exist`). A custom 404
  page is shown with a link back to the challenge index.
- [ ] The loading state (`app/loading.tsx`) renders a skeleton during
  navigation — verify by throttling the network in DevTools.

---

## SEO

- [ ] Navigate to `/sitemap.xml`. A valid XML sitemap is returned, listing at
  least the challenge index (`/`) and all challenge routes.
- [ ] Navigate to `/robots.txt`. A valid robots.txt is returned, with an
  `Allow: /` rule and a `Sitemap:` pointer.
- [ ] View source on `/`. The `<title>` is &quot;Nextmart&quot; and a
  `<meta name="description">` is present.
- [ ] Navigate to a challenge page (e.g. `/c01-auth`). The `<title>` includes
  the challenge name (e.g. &quot;C01 — Session Security | Nextmart&quot;).

---

## Performance Budget

- [ ] `docs/perf-budget.md` exists and contains the six target metrics with
  measured baselines.
- [ ] At least one Lighthouse run screenshot or recorded score shows ≥ 90 on
  Performance, Accessibility, Best Practices, and SEO (or the gap and a plan
  to close it are documented).

---

## Accessibility Audit

- [ ] `docs/a11y-pass.md` exists and records the findings from all five audit
  tasks (A2.1–A2.5).
- [ ] All Lighthouse accessibility failures are addressed or explicitly
  accepted with documented rationale.

---

## Deployment

- [ ] `docs/deploy-notes.md` exists and contains:
  - [ ] The live Vercel URL.
  - [ ] The required environment variables.
  - [ ] A note about any challenge-specific caveats (e.g. OAuth setup).
- [ ] The live Vercel URL is reachable and the challenge index renders.
- [ ] At least two challenge pages function end-to-end in production (pick
  any two from Tiers 0–4).

---

## README

- [ ] `README.md` exists at the repo root and explains:
  - [ ] What Nextmart is (a Next.js 16 learning curriculum).
  - [ ] How to run the project locally (`npm install`, `npm run dev`).
  - [ ] The curriculum structure (tiers and challenge list).
  - [ ] The Defend-It workflow.
  - [ ] Pointers to `docs/cache-components-rules.md` and
    `docs/decision-log.md`.
  - [ ] The tech stack.
