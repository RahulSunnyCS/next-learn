# Checklist — Built-in Optimizations Lab (solutions reference)

This file documents the per-route code-splitting verification steps and serves
as the canonical reference for QA non-blockers AC-5.2 and AC-5.3.

---

## Per-route Code Splitting Verification

### What is a "chunk" and which is client vs server?

Next.js App Router splits output into two categories:

| Chunk type | Where it runs | How to identify |
|---|---|---|
| **Server component tree** | Node.js, never sent to browser | RSC payload (JSON-like stream) in `__next_f` script tags |
| **Client chunk** | Browser JS engine | `.js` files in `.next/static/chunks/` loaded by `<script>` tags |

`HeavyAnalyticsChart` is a **client component** (`"use client"` directive).
Its code lives in a `.js` file in `.next/static/chunks/`.

The lab-optimizations route page itself (`page.tsx`) is a **server component**
(no `"use client"` directive).  Its JSX is rendered on the server; only the
`<Script>` demo and the dynamic chart need client JS.

---

### Step 1 — Build the app

```bash
npm run build
```

Look for this line in the terminal output (values will differ):

```
Route (app)                              Size     First Load JS
○ /lab-optimizations                    X.X kB        Y.Y kB
```

The "First Load JS" for `/lab-optimizations` should be **small** (< 50 kB
in a typical dev setup) — because `HeavyAnalyticsChart` is NOT in this number.

---

### Step 2 — Find the HeavyAnalyticsChart chunk

```bash
ls .next/static/chunks/ | grep -i heavy
```

Or search by content:

```bash
grep -rl "HeavyAnalyticsChart" .next/static/ 2>/dev/null
```

You should find at least one file that is NOT the main `page` chunk for the
`lab-optimizations` route.  This separate file is the dynamically-split chunk.

---

### Step 3 — Observe the chunk fetch in the browser (production)

1. `npm run start` (or `npm run build && npm run start`)
2. Open `http://localhost:3000/lab-optimizations`
3. DevTools → Network → filter by `.js`
4. Clear the log and reload.

You should see two separate JS requests:
- The main route chunk (arrives first, enables hydration)
- The `HeavyAnalyticsChart` chunk (arrives after hydration, triggers chart render)

The second request fires **after** the first because `next/dynamic` with
`ssr: false` delays the import until the browser is ready.

---

### Step 4 — Verify the chart is NOT in the main route chunk

```bash
# Get the hash of the lab-optimizations route chunk
ls .next/static/chunks/app/ | grep "lab-optimizations"

# Confirm HeavyAnalyticsChart code is NOT in that chunk
grep -l "HeavyAnalyticsChart" .next/static/chunks/app/lab-optimizations* 2>/dev/null
# Should print nothing — the chart is in a different file.
```

---

## Image CLS Verification (non-blocker)

1. Production build: `npm run build && npm run start`
2. Open `http://localhost:3000/lab-optimizations` in Chrome
3. DevTools → Lighthouse → Performance → Generate Report
4. **CLS** in the Core Web Vitals section should be **< 0.1** (green)

Key factors that keep CLS low:
- Static imports on `hero-shoe.svg` and `product-badge.svg` — dimensions
  known at build time
- `priority` on the hero image — preloaded before layout is committed
- `placeholder="blur"` — space is filled with a blurred preview, no jump

---

## Prefetch Verification (non-blocker)

1. Production build + start
2. Navigate to `/lab-optimizations`
3. DevTools → Network → Fetch/XHR → Clear
4. Scroll slowly so the Link buttons enter the viewport
5. Look for requests like:
   ```
   GET /c01-auth?_rsc=...    (prefetch for C01 Auth route)
   GET /c02-catalog-ssg-isr?_rsc=...  (prefetch for C02)
   ```
6. The `prefetch={false}` link should NOT generate a prefetch request, even
   when it is fully visible on screen.

---

## Summary of Code-split Chunks (expected)

| Chunk | Content | When loaded |
|---|---|---|
| main route chunk | page.tsx JSX (server-rendered) + ScriptDemo client wrapper | Immediately on navigation |
| HeavyAnalyticsChart chunk | Chart component JS | After hydration, when component renders |
| ScriptDemo chunk | ScriptDemo component JS | After hydration |

The server component tree (FeaturedProducts, catalog data) is sent as an RSC
payload — it has **no client JS chunk**; it is pure HTML/text serialised by
the server.
