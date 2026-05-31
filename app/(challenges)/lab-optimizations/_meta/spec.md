# Challenge Spec — Built-in Next.js Optimizations

> **File:** `app/(challenges)/lab-optimizations/_meta/spec.md`

---

## Learning Goal

Work through five built-in Next.js optimizations by reading, running, and
verifying each demo in the lab page.  By the end you will be able to explain
what each optimization prevents, how it works mechanically, and when (and when
NOT) to use each option.

---

## Scenario

You are auditing Nextmart's front-end for Core Web Vitals regressions before a
big sale event.  The site uses a mix of raw `<img>` tags, Google Fonts `<link>`
tags, inline `<script>` blocks, and a charting component bundled into every
page.  Your job is to replace each of these with the Next.js equivalent and
verify the improvement.

---

## Sections & Acceptance Criteria

### 1 — next/image: CLS Prevention

- [ ] **AC-1.1** The lab page demonstrates the *wrong* way (remote image without
  explicit dimensions or size reservation) and explains why it causes CLS.
- [ ] **AC-1.2** The lab page demonstrates the *right* way using a **static
  import** (`import img from './assets/...'`) — dimensions are extracted at
  build time, no CLS possible.
- [ ] **AC-1.3** The LCP image has `priority` set, emitting a `<link rel="preload">`
  in the page `<head>`.
- [ ] **AC-1.4** At least one image uses `placeholder="blur"` to fill the reserved
  space smoothly while loading.
- [ ] **AC-1.5** A remote image example uses explicit `width`, `height`, and `sizes`
  so the correct srcset variant is served per viewport.
- [ ] **AC-1.6** CLS score (measured by Lighthouse or Chrome DevTools Performance)
  is < 0.1 for this lab route in a production build.

### 2 — next/font: Self-hosted Fonts

- [ ] **AC-2.1** A Google font (Inter) is loaded via `next/font/google` in
  `_lib/fonts.ts` — **not** via a `<link href="fonts.googleapis.com">` tag.
- [ ] **AC-2.2** The font is applied via a CSS variable (`--font-lab`) scoped to
  the challenge's local `layout.tsx` wrapper — it does not affect other routes.
- [ ] **AC-2.3** In a production build's Network tab, no request to
  `fonts.googleapis.com` or `fonts.gstatic.com` appears when loading this route.
- [ ] **AC-2.4** The `display: "swap"` option is set (documented in `_lib/fonts.ts`
  with explanation of what `size-adjust` does to prevent CLS).

### 3 — next/script: Loading Strategies

- [ ] **AC-3.1** `afterInteractive` is demonstrated with a real `<Script>` element
  and its `onLoad` callback fires after hydration (visible in the demo).
- [ ] **AC-3.2** `lazyOnload` is demonstrated with a real `<Script>` element and
  its `onLoad` callback fires during idle time (visible in the demo).
- [ ] **AC-3.3** `beforeInteractive` is explained (with a code sample) and the
  constraint that it must live in a layout or page (not a nested component) is
  documented.
- [ ] **AC-3.4** A comparison table shows all three strategies with their timing,
  use case, and TTI impact.

### 4 — `<Link>` Prefetching

- [ ] **AC-4.1** At least two `<Link>` elements are shown with default prefetch
  behaviour and the mechanism (viewport-entry trigger, RSC payload request)
  is explained.
- [ ] **AC-4.2** At least one `<Link prefetch={false}>` is shown with an
  explanation of when disabling prefetch is appropriate.
- [ ] **AC-4.3** The limitation (prefetch only fires in production, not in `next dev`)
  is documented.
- [ ] **AC-4.4** A table summarises the three prefetch modes.

### 5 — Per-route Code Splitting via `next/dynamic`

- [ ] **AC-5.1** `HeavyAnalyticsChart` is loaded via `next/dynamic` at module level
  (not inside a render function) with `ssr: false` and a `loading` fallback.
- [ ] **AC-5.2** The page renders the chart via the dynamically-imported component
  with a loading skeleton while the chunk fetches.
- [ ] **AC-5.3** `checklist.md` in the solution contains verification steps:
  which build-output chunk contains `HeavyAnalyticsChart` vs the route chunk,
  and how to observe the chunk fetch in DevTools Network.
- [ ] **AC-5.4** The reason for `ssr: false` (browser APIs, hydration mismatch
  avoidance) is documented in the component file.

---

## General Constraints

- No new npm dependencies — all five demos use only what Next.js ships.
- All code follows the Cache Components rules: no `export const dynamic`,
  dynamic data reads only inside `<Suspense>`, cache with `'use cache'`.
- The page must render as a ◐ (Partial Prerender) or ○ (Static) in the build
  route table — not ƒ (fully dynamic).
- Local image assets live under `_components/assets/` and are SVGs so the
  repo stays lightweight (no binary blobs in git).

---

## Hints

<details>
<summary>Hint 1 — What is a static import for next/image?</summary>

Instead of:
```tsx
<Image src="/images/hero.png" width={800} height={600} alt="..." />
```

Write:
```tsx
import heroImg from "./_components/assets/hero.png";
// ...
<Image src={heroImg} alt="..." />  // width + height come from the import
```

Next.js reads the file dimensions at build time and bakes them in.  You cannot
accidentally forget them because TypeScript will complain if `src` is a
`StaticImageData` but `width`/`height` are missing when you also pass `fill`.

</details>

<details>
<summary>Hint 2 — Why does next/font use size-adjust?</summary>

When you swap from a system font (Arial/Helvetica) to a custom font, the
glyphs are wider or narrower.  This causes a layout shift: text re-flows and
everything below it jumps.  `size-adjust` is a CSS descriptor that scales the
fallback font's character widths to match the custom font's metrics — so when
the real font loads and replaces the fallback, the text takes up exactly the
same space and nothing moves.  Next.js calculates the correct `size-adjust`
value automatically from the font file metrics.

</details>

<details>
<summary>Hint 3 — How to see prefetch requests in DevTools</summary>

1. Build and start a production server: `npm run build && npm run start`.
2. Open `http://localhost:3000/lab-optimizations`.
3. Open DevTools → Network → filter to "Fetch/XHR".
4. Clear the log.
5. Scroll slowly so the `<Link>` elements enter the viewport.
6. Look for requests whose URL contains `?_rsc=` — those are the prefetch
   requests Next.js fires for the linked routes' RSC payloads.

In `next dev`, these requests do NOT appear — prefetch is suppressed in
development mode.

</details>

<details>
<summary>Hint 4 — How to verify code splitting in the build output</summary>

1. Run `npm run build`.
2. In the terminal output, find the route `○ /lab-optimizations` and note its
   "First Load JS" size.
3. Run: `ls .next/static/chunks/ | grep -i heavy`
   You should see a file that contains `HeavyAnalyticsChart` code separate
   from the main route chunk.
4. Alternatively, open the build output's `pages-manifest.json` or look for
   `app/` manifest files to trace which chunks belong to which route.

</details>
