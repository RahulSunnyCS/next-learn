# Defend-It — C19 Two Sources of Truth + Cross-Tab Sync

**Instructions:** Answer these questions from memory before opening the solution. Commit your
answers, then compare them to `solutions/c19-two-sources-of-truth/`. Your goal is to articulate
the *why*, not just the *what*.

---

## Q1 — The Root Divergence

> You have a TanStack Query client cache and a Next.js `'use cache'` server cache both holding
> the same "saved items" list. A user saves a new item via a Server Action. Describe exactly what
> happens in each cache, and why they diverge.

**Your answer:**

_Write here..._

**Model answer:**

The Server Action runs on the server and modifies the data store, then calls `revalidateTag("saved-items:user1")`. This marks the corresponding `'use cache'` entry as stale — the **server cache** is correctly invalidated and will re-execute the cached function on the next server render request.

The **TanStack Query client cache**, however, knows nothing about this. TanStack Query is a
JavaScript library running in the browser. It has no connection to Next.js's server-side cache
mechanism. Its in-memory store still holds the old list `[A]` because no code called
`queryClient.invalidateQueries({ queryKey: ["saved-items"] })`.

Result: the RSC Server Component will show the new list `[A, B]` on next navigation/refresh,
but the TanStack panel continues to show `[A]` until it is explicitly told to refetch.

---

## Q2 — The Reconciliation Formula

> You need both caches to converge after a mutation. What is the minimum number of API calls
> needed, and what does each one do?

**Your answer:**

_Write here..._

**Model answer:**

Two operations are needed:

1. **`queryClient.invalidateQueries({ queryKey: ["saved-items"] })`** — marks the TanStack cache
   entry as stale and triggers a background refetch. This brings the **client cache** up to date.

2. **`router.refresh()`** — tells the Next.js App Router to re-request the current route from the
   server. This forces the RSC components (including the Suspense holes) to re-render with fresh
   data, bringing the **server-rendered HTML** up to date.

If you omit (1): the TanStack panel stays stale until the next mount or focus refetch.
If you omit (2): the RSC panel stays stale until the user navigates away and back.

---

## Q3 — BroadcastChannel Lifetime

> You open the saved-items page in Tab A and Tab B. Tab A saves a new item. Walk through what
> happens in the `useCrossTabSync` hook from the moment the mutation resolves.

**Your answer:**

_Write here..._

**Model answer:**

1. In **Tab A**: after the Server Action resolves, the mutation callback creates (or reuses) a
   `BroadcastChannel` on channel `"c19-saved-items"` and posts `{ type: "invalidate", key: ["saved-items"] }`.

2. The `BroadcastChannel` API delivers this message to **all other tabs** that have opened the
   same channel name on the same origin. Tab A does NOT receive its own message (BroadcastChannel
   is not self-receiving by default in browsers).

3. In **Tab B**: the `message` event fires on the channel listener registered in the
   `useEffect` of `useCrossTabSync`. The handler calls
   `queryClient.invalidateQueries({ queryKey: ["saved-items"] })`, which triggers a
   background refetch in Tab B's TanStack Query instance.

4. Tab B refetches from the API route and updates its UI — no manual reload required.

The `BroadcastChannel` instance is created once on mount and cleaned up in the `useEffect`
return function to avoid memory leaks and duplicate listeners.

---

## Q4 — Strategy Selection

> Your colleague proposes: "Let's just ditch TanStack Query for the saved-items feature and
> render everything from Server Components with `'use cache'`. Simpler is better." Evaluate
> this proposal. Under what conditions is it correct? When does it break?

**Your answer:**

_Write here..._

**Model answer:**

**Correct when:** saved-items is read-only from the client's perspective, mutations are rare,
there is no need for optimistic updates, and no interactive filtering/sorting in the browser.
Server Components with `'use cache'` + `revalidateTag` after mutations is a perfectly valid
architecture (Strategy 2 in the spec).

**Breaks when:**
- You need **optimistic UI** (show the new item immediately before the server confirms).
- You need **client-side interactivity** — filtering, search-as-you-type, drag-to-reorder — that
  would require shipping the full list to the client and filtering it in JS.
- **Cross-tab sync** is needed — `'use cache'` provides no mechanism to push updates to already-
  open tabs. The other tab still shows stale RSC HTML until the user navigates.
- The save action happens **in a deeply nested client component** that is not close to a Suspense
  boundary — forcing a `router.refresh()` re-renders the whole route, which may be expensive.

The right answer depends on the UX requirements. If you need the saved-items count badge to update
live across tabs, the pure-RSC approach cannot satisfy that without a polling loop or WebSocket.

---

## Q5 — Cache Flow Diagram (draw from memory)

> Sketch the flow of a "save item" mutation through both caches and the BroadcastChannel sync.
> Show: the two caches, where they start diverged, and where reconciliation occurs.

**Your answer (text ASCII art or description):**

_Write here..._

**Model answer (see also `solutions/c19-two-sources-of-truth/cache-flow.md`):**

```
User clicks "Save Item" in Tab A
         │
         ▼
┌──────────────────┐
│  Server Action    │  saveSavedItem(itemId)
│  (runs on server) │
└────────┬─────────┘
         │  1. writes to data store
         │  2. revalidateTag("saved-items:user1")
         ▼
┌──────────────────────────┐         ┌───────────────────────────────┐
│  Server 'use cache'       │         │  TanStack Query client cache   │
│  INVALIDATED — will       │         │  STALE — still holds old list │
│  re-execute on next       │         │  because nobody called        │
│  RSC render request       │         │  invalidateQueries()           │
└──────────────────────────┘         └──────────────────┬────────────┘
         ▲                                               │
         │ router.refresh()                              │ invalidateQueries()
         │ (re-requests RSC from server)                 │ (marks stale, triggers refetch)
         │                                               │
         └───────────────────┬───────────────────────────┘
                             │
                    RECONCILIATION EVENT
                    (both called together)
                             │
                    Both caches now show [A, B]  ✓

                             │
                   BroadcastChannel posts
                   { type: "invalidate" }
                             │
                             ▼
                    ┌─────────────────┐
                    │   Tab B         │
                    │   receives msg  │
                    │   calls         │
                    │   invalidateQ() │
                    │   refetches     │
                    └─────────────────┘
                    Tab B TQ cache: [A, B]  ✓
```
