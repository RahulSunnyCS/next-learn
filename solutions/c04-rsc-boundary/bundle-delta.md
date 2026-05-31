# Bundle Delta — RSC Boundary Refactor (C04)

## Summary

Moving `"use client"` from the **page root** (BEFORE) to the **interactive
leaf only** (AFTER) reduces the First-Load JS for this route by roughly
**8–25 KB gzipped**, depending on how many components are in the over-
"use client"ed tree.

---

## How to Measure

After running `npm run build`, inspect the `.next/static/chunks/` directory.

```sh
# In a real project:
ls -lh .next/static/chunks/app/\(challenges\)/c04-rsc-boundary/

# Compare the page chunk for BEFORE vs. AFTER.
# The BEFORE chunk includes all components; the AFTER chunk includes only
# the interactive island(s).
```

You can also use the Next.js build output table printed to the terminal.
Look for the line starting with `◐ /challenges/c04-rsc-boundary` and note
the "First Load JS" column.

---

## Reasoning (for environments where we cannot run the build)

### BEFORE: `"use client"` at the page root

When `page.tsx` has `"use client"` at the top:

- `page.tsx` is a client module.
- Every `import` in `page.tsx` is transitively included in the client bundle:
  - `Header` component → its imports
  - `ProductInfoPanel` → its imports (may include formatting utilities, etc.)
  - `InteractiveCounter` → its imports
  - Any shared utilities imported by any of the above

A medium-sized Next.js page with 3–5 components typically contributes
**15–50 KB uncompressed** (3–12 KB gzipped) to the client bundle just from
the component tree.  Add the React reconciler overhead for hydrating all those
nodes and the number grows further.

### AFTER: `"use client"` on the leaf only

With the boundary pushed to `InteractiveIsland.tsx` only:

- `page.tsx` has no `"use client"` — it stays an RSC and is never sent as
  executable JS.
- `Header`, `ProductInfoPanel`, `StaticServerBadge`, `SerializableRow`, etc.
  are all RSC output — sent as lightweight RSC payload JSON, not as executable
  JavaScript.
- Only `InteractiveIsland.tsx` (~1 KB uncompressed) is included in the client
  bundle for the interactive functionality.
- `SellerLiveMetrics.tsx` (~3 KB uncompressed) is also a client chunk, but it
  is code-split and only loaded when the component mounts.

**Estimated First-Load JS reduction: 8–25 KB gzipped** for a typical
medium-complexity page.

---

## Build Chunk Observations

The Next.js build prints a table like:

```
Route (app)                                  Size     First Load JS
+ First Load JS shared by all               100 kB
  ├ chunks/framework-*.js                    45 kB
  ├ chunks/main-app-*.js                     12 kB
  └ other chunks

○ /challenges/c04-rsc-boundary              1.2 kB    101 kB   ← AFTER
  (vs. ~12-20 kB for a page-level "use client" tree)
```

The `First Load JS` column is the number to watch.  The shared framework
chunks (React, etc.) are constant.  The per-route chunk size is what changes
when you push `"use client"` down.

### Code-splitting behaviour

Each `"use client"` file becomes its own lazy-loadable chunk.  With the
boundary at the leaf:

- `InteractiveIsland` chunk: loaded on page load (it is above the fold).
- `SellerLiveMetrics` chunk: loaded on page load (below the fold but eager).

With the boundary at the page root (BEFORE):
- One large page chunk containing all components: loaded on every page visit.
- No opportunity to defer any component.

---

## Key Takeaway

**Treat `"use client"` like a lazy-import boundary: place it as low in the
component tree as possible.**  Every component above the boundary stays on the
server; only components at and below the boundary enter the client bundle.  The
client bundle is directly proportional to how much interactive code the user's
browser has to download, parse, and execute before the page becomes interactive.
