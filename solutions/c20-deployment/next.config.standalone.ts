// ─── solutions/c20-deployment/next.config.standalone.ts ───────────────────────
//
// REFERENCE ARTIFACT — NOT the canonical config.
//
// This file demonstrates `output: 'standalone'` for educational purposes.
// It is placed in solutions/ and must NEVER replace or be confused with the
// repo's canonical next.config.ts at the root.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS output: 'standalone'?
// ─────────────────────────────────────────────────────────────────────────────
//
// The DEFAULT Next.js build (`next build` with no `output` setting) produces a
// `.next/` directory that requires the full `node_modules/` tree to be present
// alongside it at runtime.  Copying all of `node_modules/` into a Docker image
// is expensive — a typical Next.js app with 500+ packages can produce a 1–2 GB
// image layer, making pulls slow and storage costs high.
//
// `output: 'standalone'` changes the build to:
//
//   1. TRACE imports — starting from every page, API route, and middleware,
//      the compiler traces the full require/import graph and records exactly
//      which files under `node_modules/` are actually reachable.
//
//   2. COPY only those files into `.next/standalone/node_modules/` — this is
//      a tree-shaken subset.  For a typical app, this shrinks the required
//      runtime files from 2 GB to roughly 100–250 MB.
//
//   3. EMIT a minimal `server.js` entry point — a self-contained Node.js
//      HTTP server.  You start the app with `node server.js`, NOT with
//      `next start` (which requires the full Next.js bin to be present).
//
// The Docker image only needs to copy two things:
//   - `.next/standalone/`  — traced server files + minimal node_modules
//   - `.next/static/`      — client-side JS bundles, CSS, fonts, images
//
// The full `node_modules/` directory at the project root is NOT copied into
// the image.  The image is typically 200–400 MB instead of 1–2 GB.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHAT STANDALONE SUPPORTS (vs output: 'export')
// ─────────────────────────────────────────────────────────────────────────────
//
// Unlike `output: 'export'`, a standalone deployment runs a REAL Node.js
// server. Every Next.js feature works:
//
//   ✓  Route Handlers  (`app/**/route.ts`) — server functions run on request
//   ✓  Server Actions  (`'use server'` mutations) — POST endpoint handled
//   ✓  ISR / cacheLife revalidation — background revalidation runs on the server
//   ✓  on-demand revalidation (revalidateTag / revalidatePath) — fully supported
//   ✓  Partial Prerender (◐) — static shell cached; dynamic holes streamed
//   ✓  Middleware / proxy.ts — runs on every request before routing
//   ✓  cookies() / headers() / connection() — per-request APIs available
//   ✓  cacheComponents: true (PPR + 'use cache') — fully supported
//
// The only real tradeoff vs. the default build is that you must understand
// what `server.js` needs at runtime and structure your Dockerfile accordingly.
//
// ─────────────────────────────────────────────────────────────────────────────
// DOCKER: WHAT THE CONTAINER LOOKS LIKE
// ─────────────────────────────────────────────────────────────────────────────
//
// A minimal production container using standalone output:
//
//   FROM node:22-alpine
//   WORKDIR /app
//
//   # Copy the traced server files (includes minimal node_modules)
//   COPY .next/standalone ./
//
//   # Copy the client-side static assets (JS bundles, CSS, fonts)
//   # These must live at .next/static relative to server.js
//   COPY .next/static ./.next/static
//
//   # Copy the public/ directory (robots.txt, favicons, OG images, etc.)
//   COPY public ./public
//
//   EXPOSE 3000
//
//   # Start the self-contained Node.js server — no `next start` binary needed
//   CMD ["node", "server.js"]
//
// See solutions/c20-deployment/Dockerfile for the full multi-stage version
// with a separate build stage that keeps the final image clean.
//
// ─────────────────────────────────────────────────────────────────────────────
// ISR / CACHE STORAGE IN A STANDALONE CONTAINER
// ─────────────────────────────────────────────────────────────────────────────
//
// Important: in a standalone container the 'use cache' store (ISR cache) is
// stored on the LOCAL FILESYSTEM of the container (under `.next/cache/`).
//
// Single container: works correctly — all requests hit the same process and
//   the same on-disk cache.
//
// Multiple replicas (Kubernetes, ECS, Fly.io autoscaling): PROBLEM.
//   Each replica has its own isolated filesystem.  A `revalidateTag()` call
//   invalidates the cache on ONLY the replica that received the request.
//   The other replicas continue serving stale data until their `cacheLife`
//   window naturally expires.
//
//   Solutions for multi-replica standalone:
//     a) Mount a shared network volume (NFS, AWS EFS) for `.next/cache/` so
//        all replicas share one cache store.
//     b) Use an external cache handler (Redis-backed `@neshca/cache-handler`
//        or equivalent) so all replicas read/write the same cache.
//     c) Accept eventual consistency — set a short `cacheLife` window and
//        tolerate brief stale serving across replicas.
//
// Compare: on Vercel, the cache store is backed by their distributed KV layer.
//   Revalidation propagates globally within seconds.  This is the main infra
//   advantage of Vercel vs self-hosted standalone for Cache Components apps.
//
// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT VARIABLES AT RUNTIME
// ─────────────────────────────────────────────────────────────────────────────
//
// Server-side env vars (DATABASE_URL, NEXTAUTH_SECRET, etc.) are NOT baked
// into the standalone bundle.  They must be provided at container start time:
//
//   docker run -e DATABASE_URL=... -e NEXTAUTH_SECRET=... my-app:latest
//
// Client-side vars (NEXT_PUBLIC_*) ARE baked in at build time — you must
// rebuild the image to change them.  This is the standard Next.js behaviour.

import type { NextConfig } from "next";

// NOTE: cacheComponents is INTENTIONALLY OMITTED from this reference config.
// This config is a reference artifact that demonstrates the standalone output
// setting — not a replacement for the canonical next.config.ts which controls
// cacheComponents for the whole app. In a real project, you would include
// cacheComponents: true here if you are using the Cache Components feature.
//
// The canonical next.config.ts in the repo root already has cacheComponents: true.
// This file shows what a standalone config looks like in isolation.
const standaloneConfig: NextConfig = {
  // ── The key setting ──────────────────────────────────────────────────────
  // Produces .next/standalone/ — a self-contained server directory.
  // Start with: node .next/standalone/server.js
  // Docker: COPY .next/standalone ./ && COPY .next/static ./.next/static
  output: "standalone",

  // ── images ───────────────────────────────────────────────────────────────
  // Unlike output: 'export', we CAN use next/image optimisation in a
  // standalone server — the image optimisation API runs on the server.
  // Re-declare the remote patterns from the canonical config for completeness.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },

  // ── serverExternalPackages ────────────────────────────────────────────────
  // Packages with native bindings (sharp, bcrypt, sqlite3, etc.) cannot be
  // bundled by the Webpack/Turbopack module bundler. List them here so
  // Next.js marks them as external and loads them from node_modules/ at
  // runtime instead of trying to bundle them.
  //
  // The standalone trace automatically includes them in the standalone
  // node_modules/ output when they are listed here.
  //
  // Example:
  //   serverExternalPackages: ['sharp', 'bcryptjs'],
  //
  // For this educational repo there are no native modules, but the pattern
  // is documented here because it surprises engineers when they first
  // containerise a Next.js app with packages like `better-sqlite3` or `sharp`.
};

export default standaloneConfig;
