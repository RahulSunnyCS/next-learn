# Verification Checklist — C10: Cache Invalidation, Dynamic Triggers & Footguns

> **Purpose:** A human-runnable checklist to verify the challenge is correctly
> understood and the solution works as expected.

---

## Environment

- [ ] `npx tsc --noEmit` exits 0 (no TypeScript errors).
- [ ] Dev server starts with `npm run dev` (no console errors on first load).

---

## Route Table (build output)

- [ ] `/c10-invalidation` is marked **◐** (Partial Prerender) — the static
  shell prerender, dynamic holes stream in via Suspense.
- [ ] `/c10-invalidation/draft` is marked **ƒ** (Dynamic) — draftMode() makes
  the whole page dynamic.

---

## Section 1 — Cached Reviews List (correct invalidation)

- [ ] Open `http://localhost:3000/c10-invalidation` in a browser.
- [ ] The page shows a list of existing reviews for product `p-elec-001`
  (Wireless Noise-Cancelling Headphones). These are loaded from the cached
  `getCachedReviews` function.
- [ ] The page shows an **Add Review** form.
- [ ] Submit the form with a rating (1–5) and a review body.
- [ ] After submission, the page reloads / re-renders. The new review appears
  in the list. The stale cached entry has been purged by `revalidateTag`.

---

## Section 2 — The Footgun (wrong tag)

- [ ] The page shows a **Footgun Demo** section with a second review list
  labelled &quot;BUGGY (wrong tag)&quot;.
- [ ] Submit the Add Review form again (another review).
- [ ] The BUGGY section still shows the OLD review list (before the most recent
  submission), demonstrating that the wrong `cacheTag` was not invalidated.
- [ ] The FIXED section shows the updated list.
  *(In dev mode caching is less aggressive — observe the labels and code
  comments to understand the difference; in production the bug is starkly
  visible.)*

---

## Section 3 — Dynamic-Rendering Probes

- [ ] The page has a **Dynamic Triggers** section that shows:
  - A cookie read probe (inside `<Suspense>`) — visible value or placeholder.
  - A header read probe (inside `<Suspense>`).
  - A searchParams probe — add `?tab=reviews` to the URL and see it reflect.
- [ ] Each probe is wrapped in its own `<Suspense>` boundary with a fallback
  skeleton, confirming the Cache Components rule is respected.
- [ ] The probe descriptions explain why each trigger opts the route into
  dynamic rendering.

---

## Section 4 — Draft Mode Mini-Lab

- [ ] Navigate to `http://localhost:3000/c10-invalidation/draft`.
- [ ] The page shows the current draft mode state (enabled / disabled).
- [ ] Click the **Enable Draft Mode** button.
- [ ] The page re-renders with `draftMode().isEnabled === true` and shows a
  notice that cache is bypassed.
- [ ] Click **Disable Draft Mode**. The page returns to cached mode.

---

## Section 5 — TypeScript

- [ ] `npx tsc --noEmit` passes with 0 errors.
- [ ] `_lib/actions.ts` uses `revalidateTag(tag, "hours")` — the two-argument
  v16 form. The one-argument form would be a TypeScript error.
- [ ] All `await cookies()`, `await headers()`, `await searchParams` calls are
  inside async Server Components that are themselves inside `<Suspense>`.

---

## Done

- [ ] Fill in `_meta/defend-it.md` with your own answers and commit it.
- [ ] Read `solutions/c10-invalidation/NOTES.md` to check your reasoning.
