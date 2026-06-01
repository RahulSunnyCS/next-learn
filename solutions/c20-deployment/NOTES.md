# NOTES — Deployment & Runtime Model

> **File:** `solutions/c20-deployment/NOTES.md`
>
> Deep-dive reference notes for the C20 challenge.  Read this AFTER completing
> the defend-it worksheet and reviewing the config variants.

---

## 1. Cold Starts: Edge vs Serverless vs Node Standalone

A **cold start** occurs when your function has not been invoked recently and
the platform must spin up a new execution environment before it can serve
the request.  The time-to-first-byte for that request includes the cold start
latency on top of your actual function execution time.

### Cold Start Latency Comparison

| Runtime | Cold start latency | Warm invocation latency |
|---------|-------------------|------------------------|
| **Edge (V8 isolate)** | < 5 ms | 1–20 ms |
| **Node.js serverless (Lambda / Cloud Run)** | 100–600 ms | 10–200 ms |
| **Node.js standalone (Docker, persistent)** | **None** (process never exits) | 10–200 ms |

### Why the difference?

**Edge (V8 isolate):** An isolate is a lightweight JavaScript sandbox inside
an already-running V8 process.  The platform keeps a pool of V8 processes at
every PoP (point of presence / edge node).  Starting a new isolate inside that
pool takes microseconds — not the hundreds of milliseconds needed to boot a new
Node.js process, load its module graph, and execute module-level code.

Trade-off: the API surface is restricted to the Web Platform APIs (`fetch`,
`SubtleCrypto`, `TextEncoder`, `ReadableStream`, `Request`, `Response`).  Node
built-ins (`fs`, `crypto`, `http`, native addons) are NOT available.  Bundle
size limits are tight (4 MB on Vercel free tier; 250 MB on pro).  Execution
time is capped at ~30 seconds.

**Node.js serverless:** The platform creates a new Node.js process from scratch:
download the code bundle → unzip → start the Node process → execute module-level
code (which can include database connection pool setup, config parsing, etc.)
→ invoke the handler.  This takes hundreds of milliseconds.  Warmed-up instances
reuse the process (the module-level code runs only once).

**Node.js standalone (Docker):** A single long-running container process.  The
process starts once when the container starts and handles all requests thereafter.
There are no cold starts because the process never exits between requests.
Trade-off: you manage scaling, restarts, and health checks yourself (or via your
orchestrator).  A crash or memory leak affects all in-flight requests.

### Which to choose?

```
Is the function simple?   (auth check, redirect, feature flag, geo routing)
  AND latency near the user matters?
  AND no Node-only packages are needed?
  AND bundle fits in 4 MB?
    → Edge

Is the function complex?  (DB queries, Stripe SDK, file I/O, long running)
  OR it uses Node-only packages?
  OR it needs > 30 seconds execution time?
    → Node.js serverless (Lambda, Cloud Run, Vercel Functions)
      OR Node.js standalone if you want persistent process

Do you need full control, CPU-intensive work, or very long-running jobs?
    → Node.js standalone (Docker / Fly.io machines / bare VMs)
```

---

## 2. `output: 'export'` — What Breaks and Why

`output: 'export'` tells Next.js to produce a flat directory of static files
(HTML, CSS, JS, assets).  There is no server process.  A CDN or static file
host (nginx, S3, Cloudflare Pages, GitHub Pages) serves the files directly.

### What breaks — summary table

| Feature | Breaks? | Root cause |
|---------|---------|------------|
| Route Handlers (`/app/**/route.ts`) | **YES** | Server functions require a live process to receive requests |
| Server Actions (`'use server'`) | **YES** | POST endpoint requires a live server to receive the POST |
| ISR / `cacheLife` revalidation | **YES** | Background revalidation requires a server that can detect stale cache and re-render |
| `revalidateTag` / `revalidatePath` | **YES** | These call into the runtime cache infrastructure; no runtime = no-op or throw |
| Partial Prerender (`◐` routes) | **YES** | Dynamic holes require a server to stream the per-request content |
| `cookies()` / `headers()` | **YES** | Per-request APIs need a live request object; static build has no real requests |
| Dynamic routes without `generateStaticParams` | **YES** | The static host cannot generate new HTML for unknown paths |
| `proxy.ts` / middleware | **Silently dead** | Build succeeds; but the static host never invokes the middleware code |
| `next/image` optimisation | **YES** | The Image Optimisation API is a server function; set `images.unoptimized: true` to work around |
| `cacheComponents` / PPR | **YES** | Both require a running server; set incompatible with `output: 'export'` |

### When is `output: 'export'` the RIGHT choice?

- Marketing / landing pages (all content authored at deploy time)
- Documentation sites (finite, enumerable set of pages)
- Blogs with a known set of posts
- Apps bundled inside a desktop shell (Electron, Tauri) served from disk
- Hosting environments that support ONLY static files (GitHub Pages)

### Nextmart compatibility under `output: 'export'`

The Nextmart repo CANNOT be deployed with `output: 'export'` because it uses:
- C11: Server Actions (mutations)
- C13: Route Handlers (API endpoints)
- C01: Session cookies (PPR dynamic holes)
- C03: Partial Prerender dynamic holes
- proxy.ts: Auth middleware

Stripping all of those would produce a different application.

---

## 3. `output: 'standalone'` — Self-Contained Server for Docker

The default `next build` requires the full `node_modules/` directory to be
present at runtime.  For a typical Next.js app, that is 500+ packages and
1–2 GB of files — too large for a Docker image layer.

`output: 'standalone'` runs a **static import trace** at build time:

1. Starts from every page, Route Handler, and middleware entry point.
2. Follows every `import` / `require` recursively through the module graph.
3. Records the exact set of files from `node_modules/` that are reachable.
4. Copies only those files into `.next/standalone/node_modules/`.
5. Emits a minimal `server.js` entry point — a self-contained Node.js HTTP server.

The Docker image copies:
- `.next/standalone/` — traced files + minimal `node_modules/`
- `.next/static/` — client-side JS bundles, CSS, fonts
- `public/` — static assets

Total image size: typically **200–400 MB** instead of 1–2 GB.

### Starting the server

```bash
# NOT this — next binary is not in the final image:
# next start

# This:
node server.js
```

### Key environment variables for the container

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Port the server listens on | `3000` |
| `HOSTNAME` | Network interface | `0.0.0.0` (must be set in Docker; default `127.0.0.1` is unreachable from outside) |
| `DATABASE_URL` | Server-side — NOT baked in at build | Must be injected at runtime |
| `AUTH_SECRET` | Server-side — NOT baked in at build | Must be injected at runtime |
| `NEXT_PUBLIC_*` | Client-side — baked in at BUILD time | Must rebuild image to change |

---

## 4. ISR at the Infrastructure Level

`'use cache'` + `cacheLife('hours')` in source code tells the Next.js runtime
WHEN a cache entry is stale.  It does NOT determine WHERE the cache is stored.
The physical storage location is an infrastructure concern.

### Cache storage per deployment target

| Target | Cache store | Multi-replica behaviour |
|--------|------------|------------------------|
| **Vercel** | Vercel's distributed KV (edge network) | `revalidateTag()` propagates globally within seconds |
| **Docker standalone — single instance** | Local filesystem (`.next/cache/`) | Correct — one process, one cache |
| **Docker standalone — multiple replicas** | Each replica's own local filesystem | `revalidateTag()` invalidates only the calling replica; others serve stale |
| **`output: 'export'`** | None — no runtime cache | Data frozen at build; no ISR at all |

### Solving the multi-replica cache problem

Option A — Shared network volume (NFS / AWS EFS):
```yaml
# docker-compose example
services:
  nextjs:
    volumes:
      - nextjs-cache:/app/.next/cache
volumes:
  nextjs-cache:
    driver: local  # replace with NFS driver in production
```

Option B — External Redis cache handler:
Install `@neshca/cache-handler` (or equivalent) and point Next.js to it:
```ts
// next.config.ts
experimental: {
  incrementalCacheHandlerPath: './cache-handler.js',
}
```
All replicas read and write to the same Redis instance.

Option C — Accept eventual consistency:
Set a short `cacheLife` window (e.g. `'seconds'`).  All replicas eventually
expire their stale entries and re-fetch.  Suitable when data staleness for
tens of seconds is acceptable.

---

## 5. `export const runtime = 'edge'` — The v16 Gotcha

In Next.js 16 with `cacheComponents: true`:

```ts
// This FAILS the build with cacheComponents: true
export const runtime = 'edge'
```

Error: `Route segment config 'runtime' is not compatible with cacheComponents`

**Why:** Cache Components (PPR + `'use cache'`) requires the Node.js runtime
to drive the streaming infrastructure, the cache store, and `revalidateTag`.
V8 isolates (Edge) do not have the filesystem or module-level global state
that the Cache Components runtime relies on.

**The v16 mental model:** per-route runtime selection is a **deployment-level
concern** when `cacheComponents` is enabled.  You configure Edge vs Node.js in
your deployment platform's configuration — not in route segment code.

**How to teach Edge concepts without the `runtime` export:**

- Teach what Edge provides: Web-API-only surface, global CDN distribution,
  ultra-low cold starts, short execution timeouts.
- Note the incompatibility clearly: "In v16 with cacheComponents, you configure
  Edge in your deploy platform (vercel.json, fly.toml), not with the `runtime`
  export."
- Document which route TYPES suit Edge (auth checks, redirects, A/B routing)
  vs Node.js serverless (DB queries, Stripe, file I/O).

---

## 6. Turbopack as the Default Bundler in Next.js 16

Next.js 16 ships **Turbopack** as the default bundler for `next dev`.
Turbopack is written in Rust and compiles the module graph incrementally.

### Key differences from Webpack

| Dimension | Turbopack | Webpack |
|-----------|-----------|---------|
| **HMR speed** | Sub-second — only the changed subgraph is recompiled | 5–20 s for large apps — full relevant subgraph recompiled |
| **Startup in dev** | Lazy — only routes visited in the browser are compiled | Eager — full dependency graph compiled upfront |
| **Production builds** | Opt-in stable in v16 (not yet the default for `next build`) | Still the default for `next build` in v16 |
| **Plugin system** | Own transform API (`turbo.rules`) | Webpack plugin system (`NormalModuleReplacementPlugin`, etc.) |
| **Native addon support** | Same as Webpack — configure `serverExternalPackages` | Same — configure `externals` |

### What this means for you

- **Faster inner loop:** `next dev` starts faster and HMR is nearly instant.
  Large apps that used to take 10 s to start dev now start in 1–2 s.

- **Custom webpack() callbacks need porting:** If your `next.config.ts` has a
  `webpack:` callback that uses Webpack-specific APIs (plugins, loaders, resolve
  aliases), those must be rewritten as `turbo.rules` or `turbo.resolveAlias`
  to use Turbopack for production builds.  Until ported, production builds use
  Webpack (the fallback behaviour).

- **Opt into Turbopack for production:**
  ```ts
  // next.config.ts
  const nextConfig: NextConfig = {
    turbo: {
      rules: {
        // custom loaders go here
      },
    },
  };
  ```
  Then run: `next build --turbo` (opt-in in v16; may become default in v17+).

---

## 7. Summary: Picking the Right Deployment Target for Nextmart

| Requirement | Recommended target |
|-------------|-------------------|
| Marketing / docs (no server needed) | `output: 'export'` → Cloudflare Pages / S3 |
| Full app, managed platform, ISR out of the box | Vercel default (no output setting) |
| Full app, Docker, single container | `output: 'standalone'` → Docker |
| Full app, Docker, multiple replicas | `output: 'standalone'` + shared cache (NFS or Redis) |
| Auth gate / redirect middleware only | Edge (configure in platform, not `runtime` export) |
| CPU-intensive / long-running background jobs | Standalone Node.js server or separate worker process |
