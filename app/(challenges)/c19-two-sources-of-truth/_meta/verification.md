# Verification Checklist — C19 Two Sources of Truth + Cross-Tab Sync

Manual test steps to verify the challenge works correctly. Run these after implementing your
solution. Each step maps to an acceptance criterion in spec.md.

---

## Setup

1. Open the page at `/c19-two-sources-of-truth`.
2. Open the browser DevTools Console and Network tabs.
3. Open a **second browser tab** to the same URL (`/c19-two-sources-of-truth`).

---

## Section 1 — Visible Divergence

- [ ] Page loads with both panels visible:
  - Left panel (TanStack Query): shows "Saved Items" list, displays `dataUpdatedAt` timestamp.
  - Right panel (RSC Server): shows "Server-Cached Items" list, displays `cachedAt` timestamp.
- [ ] Both panels initially show the same items (or both empty).
- [ ] Click **"Save Item"** button in the TanStack panel.
  - **Expected:** The TanStack panel updates immediately (or after a short refetch).
  - **Expected:** The RSC Server panel **still shows the old list** — divergence is visible.
- [ ] Note that the TanStack `dataUpdatedAt` timestamp is newer than the RSC `cachedAt` timestamp.

---

## Section 2 — Reconciliation

- [ ] With both panels diverged (TanStack has new item, RSC still shows old list):
  - Click **"Reconcile (invalidate + refresh)"** button.
  - **Expected:** Within ~500ms, both panels show the same (new) list.
  - **Expected:** The RSC panel updates (confirming `router.refresh()` re-rendered the server cache).
  - **Expected:** No full page reload — the App Router performs a soft navigation.
- [ ] Check the Network tab: you should see a `fetch` request to the API route (TanStack refetch)
  AND an RSC payload request (Next.js `router.refresh()`).

---

## Section 3 — Cross-Tab Sync

- [ ] Tab 1 and Tab 2 are both open at `/c19-two-sources-of-truth`.
- [ ] In **Tab 1**: Save a new item via the "Save Item" button.
  - **Expected Tab 1:** TanStack panel updates (item added).
  - **Expected Tab 2:** Within ~100–500ms, Tab 2's TanStack panel also updates — **without any
    user interaction in Tab 2**.
- [ ] Open DevTools Console in Tab 2. You should see a log line like:
  `[c19-cross-tab] Received invalidate for ["saved-items"]`
- [ ] Remove an item in Tab 1. Verify Tab 2 also removes it without a reload.

---

## Section 4 — BroadcastChannel Cleanup

- [ ] Open the page, interact, then **close Tab 1**.
- [ ] In Tab 2, save another item.
  - **Expected:** No console errors about posting to a closed BroadcastChannel.
  - This verifies the `useEffect` cleanup function properly calls `channel.close()`.

---

## Section 5 — Edge Cases

- [ ] Open the page in **incognito mode** alongside a normal tab.
  - Cross-tab sync may not work (BroadcastChannel is origin-isolated; incognito is a separate
    origin context in some browsers). Verify the behavior and note whether the `storage` event
    fallback fires.
- [ ] Open DevTools → Application → Local Storage.
  - Confirm a key `c19-saved-items-sync` is briefly written and cleared during mutations
    (storage event fallback path).

---

## Section 6 — TypeScript

- [ ] Run `npx tsc --noEmit` in the repo root. Zero errors expected.

---

## Section 7 — Code Understanding

- [ ] Read `_lib/sync.ts`. Can you explain the `useEffect` dependency array and why the channel
  is created inside the effect (not outside)?
- [ ] Read `_lib/actions.ts`. Why does the Server Action call both `revalidateTag` AND return a
  response? What would happen if it only called `revalidateTag`?
- [ ] Read `_components/ReconciledList.tsx`. Identify where the two operations (`invalidateQueries`
  + `router.refresh()`) are called. What would break if you called them sequentially instead of
  simultaneously?
