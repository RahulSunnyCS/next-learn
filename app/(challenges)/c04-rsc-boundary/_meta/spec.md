# Challenge Spec — RSC vs. Client Boundary Refactor

> **File:** `app/(challenges)/c04-rsc-boundary/_meta/spec.md`

---

## Learning Goal

This challenge teaches you where to draw the `"use client"` boundary in a Next.js
App Router application and what the concrete consequences are.  You will see a
BEFORE state (an over-"use client"ed page where the entire component tree is a
Client Component), refactor it to an AFTER state (only the interactive leaf
carries `"use client"`), measure or reason about the bundle-size difference, and
explore three related patterns: serializable-props contract, RSC-as-children
composition, and the CSR-vs-SSR choice.

---

## Scenario

Nextmart's seller dashboard was initially scaffolded with `"use client"` at the
top of the page file.  This made the whole page — static header, product info
panel, account summary — part of the client JavaScript bundle.  Your task is to:

1. Understand why that is wasteful.
2. Refactor so that only the interactive counter widget is a Client Component.
3. Demonstrate the props serialization rules at the boundary.
4. Demonstrate the RSC-as-children composition pattern.
5. Add a deliberately CSR seller live-metrics widget and justify the choice.
6. Add a deliberately SSR account summary and justify the contrast.
7. Demonstrate the server-side secret pattern (keeping env vars off the client
   bundle) without the `server-only` npm package.

---

## BEFORE vs. AFTER — Bundle Size Implication

### BEFORE (over-"use client"ed)

```tsx
// page.tsx — top of file
"use client"

// ALL of these components are now Client Components:
import Header from './Header'           // ← bundled as client JS
import ProductInfoPanel from './Panel'  // ← bundled as client JS
import InteractiveCounter from './Counter' // ← should be the ONLY client one
```

- Every import of the page, and every import of those imports, is included in
  the client JavaScript chunk.
- React must hydrate every node in the tree, not just the interactive parts.
- SSR still runs (so the server still renders HTML), but the browser downloads
  and parses all of that code a second time as executable JS.

### AFTER (boundary pushed down)

```tsx
// page.tsx — NO "use client" at the top
import InteractiveCounter from './_components/Counter' // "use client" lives HERE
// Header, Panel etc. remain Server Components — never enter the JS bundle
```

- Only `InteractiveCounter` (and its direct dependencies) enters the client
  bundle.
- `Header` and `Panel` are serialised into the RSC payload — an efficient
  JSON-like wire format.  The browser reconstructs them from the payload, not
  from re-executing JavaScript.
- Measured impact (see `solutions/c04-rsc-boundary/bundle-delta.md`):
  - A typical page-level "use client" that covers three medium-sized components
    adds roughly **8–20 KB gzipped** to the First-Load JS.
  - Pushing the boundary to a single counter component leaves only **~1–3 KB**.
  - Build output: before refactor the page chunk includes framework + all
    component code; after, the page chunk is only framework wiring + the
    counter's tiny island.

---

## Serializable Props Contract

Props that cross the server→client boundary are serialised to JSON in the RSC
payload.  The constraint is the same as `JSON.stringify`:

| Value | Allowed? | Why / Fix |
|---|---|---|
| string, number, boolean, null | ✅ | JSON primitives |
| Plain object `{}` | ✅ | JSON object |
| Array `[]` | ✅ | JSON array |
| `Date` object | ❌ | Not JSON-serializable. Fix: pass `.toISOString()` |
| `function` | ❌ | Cannot serialize code. Fix: use a Server Action or pass data |
| Class instance | ❌ | Prototype chain lost. Fix: spread to plain object |
| `Map` / `Set` | ❌ | Not JSON-serializable. Fix: `Array.from()` |
| `undefined` | ❌ | JSON omits undefined keys. Fix: use `null` |
| `Symbol` | ❌ | Not JSON-representable. Fix: use a string key |

---

## RSC-as-children Composition Pattern

A **Client Component may NOT import a Server Component directly** — the bundler
would include the Server Component's code (and all its server-only imports like
`fs`, `headers()`, etc.) in the client chunk, causing a build or runtime error.

The workaround is **composition via children**:

```tsx
// CompositionWrapper.tsx
"use client"
export function CompositionWrapper({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}>Toggle</button>
      {open && children}
    </div>
  );
}
```

```tsx
// page.tsx (RSC — no "use client")
import { CompositionWrapper } from './CompositionWrapper';
import { ServerInfoPanel } from './ServerInfoPanel'; // RSC

export default function Page() {
  return (
    <CompositionWrapper>
      <ServerInfoPanel /> {/* ← RSC passed as children, NOT imported inside client code */}
    </CompositionWrapper>
  );
}
```

React resolves the RSC (`ServerInfoPanel`) on the server first, serialises its
output into the RSC payload, and the client component receives it as an already-
resolved React element.  No server-only code reaches the browser.

---

## CSR vs. SSR — The Live Metrics Widget Justification

### SellerLiveMetrics widget — deliberately CSR

**Why CSR is correct here:**

1. **No SEO value.** Active visitor count and recent order count are not
   indexable by search engines.  There is no benefit to having these numbers
   in the server-rendered HTML.

2. **Highly real-time.** The widget polls every 3 seconds.  A server-rendered
   snapshot would be stale by the time HTML reaches the browser.  CSR is the
   only way to have truly live data.

3. **Behind authentication.** The widget is shown only to authenticated sellers
   on a dashboard that requires login.  Crawlers never see this page, so
   SSR-for-SEO arguments do not apply.

4. **setInterval requires a browser runtime.** This is a fundamentally client-
   side pattern.  A Server Component cannot run an interval; this is genuinely
   a client-only concern.

**Observable consequence of CSR:** disable JavaScript in the browser and reload.
The widget is completely absent — it is not in the initial server HTML.  An
SSR component's content would still appear with JS disabled.

### Account summary — deliberately SSR

**Why SSR is correct here:**

1. **Session data is needed on first render.** Without SSR, the user would see
   a loading spinner for 200–500 ms every page load before JavaScript fires and
   calls `getSession`.  With SSR, the correct state (logged-in or sign-in
   prompt) is in the initial HTML.

2. **Direct URL — crawlers and sharing matter.** `/challenges/c04-rsc-boundary/
   account` is a stable URL.  An unauthenticated visit should show a "sign in"
   prompt, not an empty shell.  That content needs to be in the HTML.

3. **Data changes per request, not per millisecond.** SSR is not wasteful; each
   page load is fresh.  The data (user name, orders) is stable enough that SSR
   is the right refresh granularity.

---

## Server-Side Secret Pattern (without `server-only` package)

The `server-only` npm package provides a build-time guard: importing it in any
file that ends up in a client chunk causes a hard build error.  Since it is not
installed in this repo, we approximate the protection with:

1. **Naming convention:** the module lives under `_lib/` with a filename
   (`server-secret.ts`) that makes its server-only nature obvious.

2. **Runtime guard:** the module checks `typeof window !== "undefined"` at
   module load time and throws if it finds itself running in a browser context.
   This is weaker than a build-time error (it fails at runtime, not at build
   time) but better than silent secret leakage.

3. **Only imported from RSC files:** `process.env` values (without the
   `NEXT_PUBLIC_` prefix) are not inlined by Next.js's bundler — they remain as
   `process.env.X` references in server code.  But if the module is imported by
   a client bundle, the bundler may still include the module, and the runtime
   value of `process.env.DEMO_API_SECRET` in a browser is `undefined` (Node's
   `process.env` is not available), which is a logic bug even if not a direct
   leakage.

4. **In production:** install and import `server-only` as the first line:
   ```ts
   import 'server-only';
   ```
   This gives a **build-time error** — strictly safer than any runtime guard.

---

## Starting Point

`page.tsx` in this challenge is the AFTER state — the refactored version.
The BEFORE state is documented in code comments at the top of `page.tsx` and in
`solutions/c04-rsc-boundary/page.tsx` (which contains both BEFORE and AFTER
annotated with comments).

---

## Tasks

- [ ] Read the BEFORE comment block in `page.tsx` and understand why placing
  `"use client"` at the page root is wasteful.
- [ ] Identify which components are Server Components and which are Client
  Components in the AFTER (current) state.
- [ ] Open DevTools → Network → filter by JS.  Identify the client chunk for
  this page.  It should be small because most of the page is RSC.
- [ ] Disable JavaScript in DevTools (Settings → Debugger → Disable JavaScript).
  Reload `/challenges/c04-rsc-boundary`.  Observe: the static content and
  account summary (SSR) remain; the live-metrics widget disappears (CSR).
- [ ] Read `_lib/server-secret.ts` and understand the server-only convention.
  Try importing it in `_components/InteractiveIsland.tsx` and observe the
  runtime error (then revert).
- [ ] Read the serializable props table on the page and verify each row by
  checking the Next.js error message when you add a non-serializable prop.
- [ ] Answer the questions in `_meta/defend-it.md` from memory before reading
  `solutions/c04-rsc-boundary/`.

---

## Acceptance Criteria

1. `npx tsc --noEmit` exits 0 — no TypeScript errors.
2. Loading `/challenges/c04-rsc-boundary` shows all six sections without
   console errors.
3. The interactive counter in section 1 increments and decrements client-side.
4. The live-metrics widget in section 4 updates its numbers every 3 seconds.
5. With JavaScript disabled, sections 1–3, 5, and 6 render from HTML; section 4
   (SellerLiveMetrics) is absent — confirming the CSR/SSR split.
6. `/challenges/c04-rsc-boundary/account` shows either a sign-in prompt (no
   session) or the user's name/orders — both states rendered server-side
   (visible with JS disabled).
7. No `export const dynamic` directive exists in any file (disallowed under
   `cacheComponents: true`).
8. `getSession` is imported only from `@/lib/auth`, never from internal modules.

---

## Hints

<details>
<summary>Hint 1 — Why can a Client Component accept an RSC as children?</summary>

When the RSC parent renders, it resolves the Server Component's JSX tree on the
server and serialises it into the RSC payload — a lightweight JSON-like binary
format.  By the time the Client Component runs (on the client), it receives an
already-resolved React element as `children`, not the original server-side
function.  There is no server-only code for the bundler to include.

</details>

<details>
<summary>Hint 2 — How to find the client bundle in DevTools</summary>

Open DevTools → Network → filter by "JS".  Reload the page.  Look for a chunk
whose name contains the challenge slug or the component name.  A well-split RSC
page will have a very small page chunk (often < 5 KB) because only the
`"use client"` islands are included.  If the chunk is large (> 50 KB for a
simple page), the `"use client"` boundary is too high.

</details>

<details>
<summary>Hint 3 — The "use client" boundary is a module boundary, not a component boundary</summary>

`"use client"` marks a **file** as belonging to the client graph.  Everything
in that file, and everything it `import`s (transitively), ends up in the client
bundle.  If you put `"use client"` at the top of a file that imports 10 other
files, all 10 files (and their imports) are included.  Move `"use client"` to
the leaf that actually uses `useState` / `useEffect` / browser APIs, and the
rest of the tree stays server-side.

</details>
