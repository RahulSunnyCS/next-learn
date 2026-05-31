# Verification Checklist — Built-in Next.js Optimizations

> **Purpose:** A human-runnable checklist to verify each optimization is
> implemented correctly.  Run each section in order.  Check the box when
> the item passes.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] `npm run lint` exits 0 (no lint errors in this challenge's files).
- [ ] Dev server starts with `npm run dev` — navigate to `/lab-optimizations`,
  no browser console errors on first load.

---

## 1 — next/image: CLS Prevention

- [ ] **Wrong-way demo is shown** — The page renders a remote image with no
  explicit size reservation and labels it clearly as the anti-pattern.

- [ ] **Static import demo is shown** — The page renders `hero-shoe.svg` loaded
  via `import heroShoe from "./assets/hero-shoe.svg"`.  Inspect the rendered
  `<img>` tag in DevTools → Elements: it should have non-zero `width` and
  `height` attributes.

- [ ] **priority attribute** — The `StaticImportImage` component passes
  `priority` to `next/image`.  In DevTools → Elements → `<head>`, look for:
  ```html
  <link rel="preload" as="image" href="...hero-shoe..." />
  ```

- [ ] **placeholder="blur"** — Both static-import examples pass
  `placeholder="blur"`.  In dev mode, the image briefly shows a blurred
  preview before the full image loads (throttle the connection to observe).

- [ ] **Remote image with sizes** — The `RemoteImageWithSizes` component
  renders with explicit `width={800}`, `height={600}`, and `sizes=...`.
  The `<img>` in DevTools has a `srcset` attribute with multiple widths.

- [ ] **CLS score** (production build only):
  - `npm run build && npm run start`
  - Open `http://localhost:3000/lab-optimizations`
  - Run Lighthouse → Performance → check CLS < 0.1

---

## 2 — next/font: Self-hosted Fonts

- [ ] **No Google Fonts request** — In DevTools → Network (production build):
  - Filter by domain `fonts.googleapis.com` — **zero requests** should appear.
  - Filter by domain `fonts.gstatic.com` — **zero requests** should appear.

- [ ] **Font applied to the demo block** — The Inter font demo block shows text
  in Inter.  Open DevTools → Elements → select the demo paragraph → Computed
  tab → `font-family` should show `Inter` or `"Inter"` (not `system-ui`).

- [ ] **CSS variable set** — In DevTools → Elements → select the
  `<div class="__variable_...">` wrapper rendered by `layout.tsx` → Styles tab
  → you should see `--font-lab: ...` in the computed properties.

- [ ] **_lib/fonts.ts defines the font** — Open the file and confirm
  `Inter({ subsets: ["latin"], display: "swap", variable: "--font-lab" })`.

---

## 3 — next/script: Loading Strategies

- [ ] **afterInteractive fires after hydration** — Open DevTools → Console,
  navigate to the page, observe:
  ```
  [lab-optimizations] afterInteractive script ran
  ```
  This log should appear AFTER the page is interactive (not during initial
  HTML parse).

- [ ] **lazyOnload fires during idle** — Observe:
  ```
  [lab-optimizations] lazyOnload script ran
  ```
  This log appears after `afterInteractive` and typically after all other
  page activity settles.

- [ ] **State badges update** — The "onLoad fired" badge next to each strategy
  section should turn green after the respective script runs.

- [ ] **beforeInteractive code sample is shown** — The page shows a code block
  explaining `beforeInteractive` with the constraint that it must live in
  layout.tsx or page.tsx.  No live `<Script strategy="beforeInteractive">`
  is rendered from a nested component.

---

## 4 — Link Prefetching

- [ ] **Prefetch requests visible in production** (dev suppresses these):
  - `npm run build && npm run start`
  - Navigate to `/lab-optimizations`, open DevTools → Network → filter Fetch/XHR.
  - Clear the log.
  - Scroll until the Link buttons are visible.
  - Requests to routes containing `?_rsc=` (or similar RSC payload markers)
    should appear for the linked routes.

- [ ] **prefetch={false} link shown** — The page renders at least one Link
  with `prefetch={false}` labelled clearly as "no prefetch".

- [ ] **Comparison table shown** — The page includes a table with three rows:
  default / `prefetch={true}` / `prefetch={false}`.

- [ ] **Dev limitation documented** — The page explains prefetch only fires
  in production.

---

## 5 — Per-route Code Splitting

- [ ] **Dynamic import at module level** — In `page.tsx`, `next/dynamic` is
  called at the top-level module scope (not inside a component function or
  hook).

- [ ] **Chart renders with loading skeleton** — On first load, the
  "Loading chart chunk…" skeleton briefly flashes before the chart renders.
  (Throttle the network in DevTools to make it observable.)

- [ ] **Separate chunk in build output** — Run `npm run build`, then:
  ```bash
  ls .next/static/chunks/ | grep -i heavy
  ```
  At least one file whose name or path references `HeavyAnalyticsChart`
  should appear, separate from the main `lab-optimizations` route chunk.

- [ ] **ssr: false documented** — Open `_components/HeavyAnalyticsChart.tsx`.
  The comment at the top explains why `ssr: false` is needed (browser APIs /
  hydration mismatch).

---

## Challenge Registry

- [ ] Navigate to `/` (challenge index).  The entry
  "Built-in Next.js Optimizations — Guided Checklist" appears with slug
  `lab-optimizations`.

- [ ] `challenge.config.json` contains:
  ```json
  { "id": 7, "slug": "lab-optimizations", "tier": 1, "status": "not-started" }
  ```

---

## Automated Tests

Run: `npm test -- --testPathPattern=lab-optimizations`

- [ ] All tests pass (if a test file is present).

---

## QA Non-blockers

These items are non-blocking for gate purposes but should be verified manually:

- **CLS < 0.1** for the lab route in a production Lighthouse run.
- **Prefetch behaviour observable** in the Network tab (production build).
- **Code-splitting chunk verification** in `.next/static/chunks/`.
