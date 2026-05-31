# Defend-It Worksheet — RSC vs. Client Boundary Refactor

> **Instructions:** Fill in your answers BEFORE you look at the reference
> solution under `solutions/c04-rsc-boundary/`.  Write in your own words — the
> goal is to force explicit reasoning, not to produce a perfect answer.
>
> Self-score using the rubric at the bottom (0–2 per question).
> Commit your filled worksheet before revealing the solution.

---

## Questions

### Q1 — Bundle boundary placement

*You have a Next.js page with a static header, a product list that reads from
the database, and a single "add to cart" button that needs `useState`.  Where
do you put `"use client"`, and why does it matter for the user's browser?*

**Your answer:**

<!-- Write here -->

---

### Q2 — Serializable props violation

*A colleague writes:*

```tsx
// page.tsx (RSC)
const lastFetched = new Date();
return <CartButton lastFetched={lastFetched} />;

// CartButton.tsx
"use client"
export function CartButton({ lastFetched }: { lastFetched: Date }) { ... }
```

*What is wrong with this code, and how do you fix it?*

**Your answer:**

<!-- Write here -->

---

### Q3 — RSC-as-children composition

*Why can a Client Component accept a Server Component as `children` but not
directly import one?  What would go wrong if you added `import { ServerPanel }
from './ServerPanel'` inside a `"use client"` file?*

**Your answer:**

<!-- Write here -->

---

### Q4 — CSR vs. SSR choice

*Explain in one paragraph: when is CSR (a deliberate `"use client"` component
that fetches its own data) the correct choice over SSR (an async Server
Component)?  Use the live-metrics widget as a concrete example.*

**Your answer:**

<!-- Write here -->

---

### Q5 — Server-only secret guard

*The `server-only` npm package is not installed in this repo.  How does
`_lib/server-secret.ts` prevent the secret from appearing in the client
bundle?  What are the limitations of this approach compared to installing
`server-only`?*

**Your answer:**

<!-- Write here -->

---

## Model Answers

<details>
<summary>Reveal model answers (open AFTER filling in your own)</summary>

### A1 — Bundle boundary placement

Put `"use client"` only on the `AddToCartButton` component file (or its own
leaf file), not on the page.  The page, header, and product list are all Server
Components — they are never included in the client JS bundle.  The browser
downloads only the button's tiny island (~1–3 KB) instead of the entire page
tree (potentially 50–200 KB+ gzipped depending on imports).  Fewer bytes =
faster parse + hydration = better Time-to-Interactive.  The static content
arrives as HTML in the initial response; only the interactive island hydrates.

### A2 — Serializable props violation

`Date` is not JSON-serializable (it is a class instance).  React will throw:
*"Only plain objects can be passed to Client Components from Server Components.
Date objects are not supported."*

Fix: convert to an ISO string before passing the prop:
```tsx
const lastFetched = new Date().toISOString(); // string — serializable
return <CartButton lastFetched={lastFetched} />;
```
Then type the prop as `lastFetched: string` and reconstruct the Date inside the
client component if needed: `new Date(props.lastFetched)`.

### A3 — RSC-as-children composition

If you `import { ServerPanel } from './ServerPanel'` inside a `"use client"`
file, the bundler treats `ServerPanel` as a client module and includes it in
the client chunk.  If `ServerPanel` imports `fs`, `headers()`, or any other
server-only API, the build fails or throws at runtime.

The composition pattern (passing as `children`) works because the RSC parent
resolves `ServerPanel` on the server first, serialises the output (not the
function) into the RSC payload, and delivers it to the client as an already-
resolved React element.  The client component receives a plain React node — no
server code, no server imports.

### A4 — CSR vs. SSR choice

CSR is correct when:
(a) The data has no SEO value (it will not be crawled),
(b) The data is so fresh that a server-rendered snapshot would be stale by the
    time it reaches the browser (e.g. polling every 3 seconds),
(c) The component needs browser-only APIs (`setInterval`, `fetch` in polling
    mode), and
(d) The component is behind a login wall so there is no public URL to crawl.

The live-metrics widget satisfies all four conditions: "active visitors" is
meaningless to Google, the numbers update every 3 seconds, `setInterval` is
a browser API, and it is on a seller dashboard behind auth.  SSR would add
server load with no benefit — the rendered value would be stale within 3 seconds.

### A5 — Server-only secret guard

Two mechanisms:
1. **Runtime guard**: `if (typeof window !== "undefined") throw new Error(...)`.
   If the module is somehow bundled into a client chunk and evaluated in the
   browser, this check throws immediately, preventing silent misuse.
2. **Convention**: the module lives in `_lib/` with a descriptive name; it is
   only imported by RSC files.  Code review and TypeScript's module boundary
   analysis can catch accidental client imports.

Limitation: neither mechanism is a **build-time** error.  With the real
`server-only` package, importing the module in any client file causes `next
build` to fail with a clear error before any code ships.  Our runtime guard
only fires when the code actually executes in the browser — if no test exercises
that path, the misconfiguration ships silently.

</details>

---

## Self-Score

| # | Question | Score (0–2) | Notes |
|---|----------|-------------|-------|
| 1 | Bundle boundary placement | | |
| 2 | Serializable props violation | | |
| 3 | RSC-as-children composition | | |
| 4 | CSR vs. SSR choice | | |
| 5 | Server-only secret guard | | |
| **Total** | | **/10** | |

### Rubric

| Score | Meaning |
|-------|---------|
| **2** | Correct and complete — you could explain this to a colleague. |
| **1** | Partially correct — right direction but missing a key detail. |
| **0** | Incorrect or "I don't know" — study the solution notes carefully. |

---

*Fill this file and commit before opening `solutions/c04-rsc-boundary/`.*
