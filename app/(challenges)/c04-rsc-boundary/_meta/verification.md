# Verification Checklist — RSC vs. Client Boundary Refactor

> **Purpose:** A human-runnable checklist to verify the challenge is set up
> correctly and the AFTER refactor is working.  Run each item in order.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 with no TypeScript errors.
- [ ] `npm run build` exits 0 with no build errors.
- [ ] Dev server starts with `npm run dev` and `/challenges/c04-rsc-boundary`
      loads with no console errors.

---

## Page Load Checks

- [ ] `/challenges/c04-rsc-boundary` returns HTTP 200.
- [ ] All six section headings appear on the page.
- [ ] The interactive counter in section 1 increments on click (+) and
  decrements (−).
- [ ] The live-metrics widget in section 4 shows numbers that change every
  ~3 seconds.

---

## CSR vs. SSR Split

- [ ] **Disable JavaScript** in DevTools (Settings → Debugger → Disable JS)
  and reload `/challenges/c04-rsc-boundary`:
  - [ ] Sections 1–3 (static header, info panel, serializable props table)
        are visible in the HTML.
  - [ ] Section 4 (SellerLiveMetrics) shows only the "Connecting..." loading
        state or nothing — the actual metrics are absent.  This confirms the
        widget is CSR-only.
  - [ ] Sections 5–6 (server-secret panel, account link) are visible.
- [ ] Re-enable JavaScript and reload.
- [ ] Visit `/challenges/c04-rsc-boundary/account`:
  - [ ] With JS disabled: the page shows either the "sign in" prompt or the
        user's name — both are in the server-rendered HTML.
  - [ ] With JS enabled: same result, no visible difference (SSR data does
        not depend on JS).

---

## Rendering Strategy

- [ ] No file in `app/(challenges)/c04-rsc-boundary/**` contains
  `export const dynamic` (disallowed under `cacheComponents: true`).
- [ ] Check the build output for this route.  It should show `◐` (Partial
  Prerender) or `○` (Static) — NOT `ƒ` (fully Dynamic) unless the account
  sub-page is inspected (which reads a cookie and may show `ƒ`).

---

## Bundle Size Check

- [ ] Open DevTools → Network → filter "JS".  Reload
  `/challenges/c04-rsc-boundary`.
- [ ] Identify the page-specific JS chunk.  It should be small (< 10 KB
  uncompressed) because only the interactive islands are bundled.
- [ ] Confirm that there is no chunk containing `server-secret` (the
  server-only module must not appear in any client chunk).

---

## Serializable Props

- [ ] The page renders section 2 (serializable props table) without errors.
- [ ] (Optional) Temporarily add a non-serializable prop (e.g., pass
  `new Date()` to `InteractiveIsland`) and confirm you see a Next.js runtime
  error about non-serializable props.  Revert afterward.

---

## Server-Only Secret

- [ ] Section 5 on the page shows a redacted secret value (e.g., `(sec*...`)
  in the server-rendered HTML.
- [ ] Search the page's JS source (DevTools → Sources) for `DEMO_API_SECRET`
  or `server-secret`.  Neither should appear in any client chunk.

---

## Auth Import Convention

- [ ] `grep -r "lib/auth/session" app/(challenges)/c04-rsc-boundary/` returns
  no results — the account page imports only from `@/lib/auth`.
- [ ] `grep -r "lib/auth/types" app/(challenges)/c04-rsc-boundary/` returns
  no results.

---

## Automated Tests

Run: `npm test -- --testPathPattern=c04`

- [ ] All tests pass (if a `_tests/` directory has been added by the test
  phase).
