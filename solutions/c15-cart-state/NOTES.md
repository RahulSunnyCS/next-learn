# Solution Notes — C15 Cart State

## The Hydration Mismatch Problem

### What Goes Wrong Without the Fix

Imagine you persist the cart in localStorage.  The Next.js server renders the
page — localStorage is not available on the server, so the server renders an
empty cart (0 items).

The client JavaScript loads.  React runs the same render logic.  If Zustand's
persist middleware auto-hydrates immediately (the default), the store now has
the 3 items from localStorage.  React compares the server-rendered HTML with
the client-rendered output:

- Server rendered: `<span>0</span>` (cart badge)
- Client rendered: `<span>3</span>` (after reading localStorage)

React detects a mismatch and throws:

```
Warning: Text content did not match. Server: "0" Client: "3"
```

Or, for structural mismatches:

```
Error: Hydration failed because the initial UI does not match
what was rendered on the server.
```

This is not just a warning — on structural mismatches React re-renders the
entire tree from scratch, discarding the server HTML.  This defeats the purpose
of SSR (fast first paint) and can produce visible flicker.

### The Fix: `skipHydration: true` + `rehydrate()` in `useEffect`

```typescript
// In the Zustand store:
persist(
  (set) => ({ items: [], _hasHydrated: false, ... }),
  {
    name: "nextmart-cart",
    skipHydration: true,        // ← Do not auto-read localStorage
    onRehydrateStorage: () => (state) => {
      if (state) state.setHasHydrated(true);  // ← Flag when done
    },
  }
)
```

```typescript
// In HydrateCart component:
function HydrateCart() {
  useEffect(() => {
    // useEffect only runs on the client, after React has hydrated the DOM.
    // At this point, server and initial client renders have already agreed.
    useCartStore.persist.rehydrate();
  }, []);
  return null;
}
```

Flow:
1. Server renders page → store is empty (initial state)
2. React hydrates DOM → store is still empty → server and client agree ✓
3. `useEffect` fires → `rehydrate()` reads localStorage → store updates to 3 items
4. `_hasHydrated` becomes `true` → UI switches from skeleton to real cart data

The brief flash from skeleton to real cart is expected and correct.  It is
visible for ~16ms (one frame).  It cannot be eliminated without reading
localStorage during SSR, which is impossible (localStorage is browser-only).

### The React Context Equivalent

In `CartContextProvider` (see `_components/CartProvider.tsx`), the same fix
uses a `mounted` flag:

```typescript
const [state, dispatch] = useReducer(cartReducer, {
  items: [],
  mounted: false,  // ← Server and initial client render start false
});

useEffect(() => {
  // Only runs on client.  Reads localStorage and flips mounted.
  const stored = localStorage.getItem(STORAGE_KEY);
  dispatch({
    type: "HYDRATE",
    payload: { items: stored ? JSON.parse(stored).items : [] },
  });
}, []);
```

UI components check `state.mounted` before rendering cart data, showing a
skeleton otherwise.  Mechanically identical to the Zustand approach, but
written by hand.

---

## React Context vs Zustand: Full Tradeoff Analysis

| Concern | React Context + useReducer | Zustand 5 + persist |
|---------|---------------------------|---------------------|
| **Persistence** | Manual `useEffect` + `localStorage.setItem/getItem` | Built-in `persist` middleware |
| **Hydration safety** | Manual `mounted` flag, checked in every consumer | `skipHydration: true` + `rehydrate()` in one place |
| **Re-render granularity** | ALL consumers re-render on ANY state change | Selector-based: only the subscribed slice |
| **Boilerplate** | Reducer function, action types, initial state, provider, two hooks | One `create()` call with actions inline |
| **TypeScript** | Action union types, reducer switch, dispatch type | Direct function signatures, inferred |
| **DevTools** | React DevTools (component tree, state snapshot) | Zustand DevTools (works with Redux DevTools extension) |
| **Bundle size** | 0 bytes (built-in) | ~3 kB minzipped |
| **Middleware** | None built-in (write your own) | persist, devtools, immer, subscribeWithSelector |
| **Cross-component sharing** | Requires wrapping with Provider | Direct import, no Provider needed for read-only consumers |
| **SSR data injection** | Thread via props from Server Components | Same — no magic |
| **Test isolation** | Each test creates a new Provider with initial state | `useCartStore.setState({})` in beforeEach |
| **Learning curve** | Lower (standard React patterns) | Slightly higher (new API) |

### The Re-render Problem in Detail

With a single Context, every consumer re-renders whenever the context value
changes.  Example: you have 20 product cards on the page, each using
`useContext(CartContext)` to check `isInCart(productId)`.  When the user
updates the quantity of one item (without changing which items are in the
cart), all 20 product cards re-render — even though their `isInCart` result
did not change.

**Context mitigation:** Split into separate contexts (data vs dispatch).
Components that only dispatch (e.g. an Add button) subscribe to the stable
dispatch context.  Components that read data still re-render together.

**Zustand solution:** Selectors.
```typescript
// This component only re-renders if `items.length` changes.
const count = useCartStore(state => state.items.length);

// This component only re-renders if this specific product's cart status changes.
const isInCart = useCartStore(state => state.items.some(i => i.productId === id));
```

For a cart with 20 products, adding one item triggers:
- React Context: up to 20 re-renders (all product cards)
- Zustand with selectors: 1-2 re-renders (the one product card + the badge)

This difference is unmeasurable for 20 items but visible for 200+.

### When to Choose Context

- Simple state that changes infrequently
- State that is naturally scoped to a subtree (e.g. a form wizard)
- Teams that prefer zero additional dependencies
- State that does not need persistence or DevTools
- Starter projects / prototypes where adding zustand feels like over-engineering

### When to Choose Zustand

- State shared across many components with different read patterns
- State that needs persistence (persist middleware)
- State where re-render performance matters
- When you want straightforward DevTools integration
- When the team is comfortable with Zustand's API

**Verdict for a production cart:** Zustand is the better fit because:
1. `persist` eliminates the localStorage boilerplate
2. `skipHydration` solves hydration safety with two lines
3. Selectors prevent re-renders in product card components

---

## Login Reconciliation: The Merge Strategy

### Why Not "Guest Wins"?

The user added 2 items on mobile (guest).  On desktop, they have 3 items saved
from yesterday.  "Guest wins" discards the 3 desktop items — data loss.

### Why Not "Server Wins"?

The user spent 10 minutes browsing and adding items before remembering to log
in.  "Server wins" discards all that work — bad UX.

### Why Not "Add Quantities"?

User adds 1 hat on mobile.  Has 1 hat saved on server.  Total: 2 hats — but
they only wanted 1.  Unintended bulk purchases.

### Take-the-Max: The Safe Default

For each product, keep whichever quantity is larger.  For products in only one
cart, keep them as-is.

Example:
```
Guest cart:  { shoe: 2, hat: 1 }
Server cart: { shoe: 3, bag: 1 }
Merged:      { shoe: 3, hat: 1, bag: 1 }
```

Result: shoe keeps the server's larger quantity (3 not 2), hat is preserved
from guest, bag is preserved from server.  No items dropped, no unintended
multiplication.

### The "Prompt the User" Alternative

For a real e-commerce store, the gold standard is to show the user a dialog:

> "You have items from your session. How would you like to handle them?"
> [Keep my session items] [Keep my saved items] [Merge (combine all)]

This is the most correct UX but requires significant additional code.
Take-the-max is the recommended silent default.

---

## Optimistic Updates: When They're Safe Here

In this challenge, the cart is entirely client-side.  There is no server
mutation to fail.  `addItem` updates the Zustand store synchronously — there
is no network request, no error to roll back from.

**When optimistic updates require care (real e-commerce):**

1. Inventory check: if stock runs out between the optimistic add and checkout,
   you need to handle the rejection at checkout time.

2. Price change: if the product's price changes between add and checkout, the
   cart total is stale.  Most real carts re-verify prices at checkout.

3. Product deletion: if the product is deleted, the cart item becomes orphaned.
   Real carts handle this at checkout with a "some items are no longer available"
   error.

For this demo app (in-memory store, no concurrency), none of these apply.

---

## cacheComponents Compliance

The page follows the static-shell + Suspense-hole pattern:

```
page.tsx (static shell — no dynamic reads at top level)
  └── CartProvider (client component, no dynamic data)
  └── <Suspense>
        └── ProductList (async server component — await connection() + listProducts())
  └── <Suspense>
        └── CartPanel (async server component — await connection() + getSession())
```

`await connection()` is called before `listProducts()` and `getSession()` in
each async server component.  This establishes them as dynamic (not prerendered),
satisfying the cacheComponents rule that uncached/non-deterministic data must
only be accessed inside a Suspense boundary after a dynamic signal.
