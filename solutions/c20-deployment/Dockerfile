# ─── solutions/c20-deployment/Dockerfile ─────────────────────────────────────
#
# REFERENCE ARTIFACT — for educational purposes only.
#
# This Dockerfile shows the recommended multi-stage build pattern for a
# Next.js app using `output: 'standalone'`.  It is intentionally placed in
# solutions/ and is NOT wired into any actual CI build for this repository.
#
# Usage (if you wanted to run it against this repo):
#   1. Edit next.config.ts to add `output: 'standalone'` (or swap in
#      solutions/c20-deployment/next.config.standalone.ts as next.config.ts).
#   2. docker build -t nextmart:latest -f solutions/c20-deployment/Dockerfile .
#   3. docker run -p 3000:3000 nextmart:latest
#
# ─────────────────────────────────────────────────────────────────────────────
# WHY MULTI-STAGE?
# ─────────────────────────────────────────────────────────────────────────────
# A single-stage build would:
#   a) Install ALL devDependencies (TypeScript compiler, ESLint, test runners, …)
#   b) Run `next build`
#   c) Copy EVERYTHING into the final image — including the build toolchain and
#      all of node_modules/
#
# The resulting image would be 2–3 GB.
#
# Multi-stage solves this by using separate stages:
#   stage 1 (deps)   — install only production dependencies + the tools needed
#                      to run `next build`
#   stage 2 (builder)— run `next build` with the standalone output; the output
#                      lives in .next/standalone/
#   stage 3 (runner) — copy ONLY the traced files from the builder stage;
#                      no build tools, no devDependencies, no source code
#
# Final image is typically 200–400 MB.
#
# ─────────────────────────────────────────────────────────────────────────────
# NODE VERSION
# ─────────────────────────────────────────────────────────────────────────────
# Pin to a specific Node LTS minor (e.g. 22.4-alpine) in production so that a
# Node patch release cannot silently change behaviour. Use the same Node version
# you use in local development (check: node --version).
#
# Alpine is used here for image size. If you use packages with native addons
# (e.g. sharp, sqlite3), consider node:22-bookworm-slim (Debian-based) to
# avoid musl libc compatibility issues.
# ─────────────────────────────────────────────────────────────────────────────

# ══════════════════════════════════════════════════════════════════════════════
# Stage 1: deps — install all dependencies needed to BUILD
# ══════════════════════════════════════════════════════════════════════════════
FROM node:22-alpine AS deps

# Install libc6-compat for native modules on Alpine.
# Without this, packages that link against glibc (e.g. sharp) will segfault.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package manifests first — Docker layer caching means that if
# package.json and package-lock.json have not changed, Docker reuses the
# cached node_modules/ layer and skips the npm install entirely.
# ALWAYS copy the lockfile and install from it (--ci / --frozen-lockfile) to
# ensure the same versions are installed in CI and in the container.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies) because `next build`
# needs TypeScript, ESLint, and other build-time tools.
RUN npm ci

# ══════════════════════════════════════════════════════════════════════════════
# Stage 2: builder — compile the app with `next build`
# ══════════════════════════════════════════════════════════════════════════════
FROM node:22-alpine AS builder

WORKDIR /app

# Bring the installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy the application source.
# .dockerignore should exclude: node_modules/, .next/, .git/, *.md, tests/
COPY . .

# Build-time environment variables.
# NEXT_PUBLIC_* vars are baked into the client bundle here — you must rebuild
# the image if they change.  Server-side vars (DATABASE_URL, AUTH_SECRET) are
# NOT baked in — pass them at container start with -e or via secrets injection.
#
# Example (uncomment and set real values):
# ENV NEXT_PUBLIC_API_URL=https://api.example.com

# Run the production build.
# next build reads next.config.ts / next.config.standalone.ts for the
# `output: 'standalone'` setting.
#
# IMPORTANT: the canonical next.config.ts in this repo does NOT have
# output: 'standalone'. In a real deployment you would either:
#   a) Add `output: 'standalone'` to the canonical next.config.ts, OR
#   b) Use an environment variable to conditionally set it:
#        output: process.env.NEXT_OUTPUT as 'standalone' | undefined,
#      and then: docker build --build-arg NEXT_OUTPUT=standalone ...
RUN npm run build

# ══════════════════════════════════════════════════════════════════════════════
# Stage 3: runner — the final, minimal production image
# ══════════════════════════════════════════════════════════════════════════════
FROM node:22-alpine AS runner

WORKDIR /app

# Security best practice: never run as root inside the container.
# Create a non-root user and group, then switch to it.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public/ directory (robots.txt, favicons, OG images, etc.).
# These are served by next/image and the static asset middleware.
COPY --from=builder /app/public ./public

# Copy the STANDALONE server directory.
# .next/standalone/ contains:
#   - server.js     — the self-contained Node.js HTTP server entry point
#   - node_modules/ — ONLY the modules that the trace identified as needed
#                     (a tree-shaken subset of the full node_modules/)
#   - All server-side route code
#
# This is the key difference from a default build: you copy .next/standalone/
# instead of the full project + full node_modules/.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy the client-side static assets (JS chunks, CSS, fonts, images).
# These MUST be placed at .next/static relative to server.js so the server
# can resolve /_next/static/ requests correctly.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user before running the server.
USER nextjs

# Document which port the server listens on.
# The actual port is set by the PORT environment variable at runtime
# (default: 3000 in server.js). EXPOSE is documentation only — it does not
# publish the port; use `docker run -p 3000:3000` or your orchestrator config.
EXPOSE 3000

# Set PORT and HOSTNAME explicitly.
# HOSTNAME=0.0.0.0 makes the server listen on all interfaces (required inside
# a container — the default 127.0.0.1 / localhost would not be reachable from
# outside the container).
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the standalone server.
# Note: we use `node server.js` — NOT `next start`.  The `next` binary is not
# present in the final image (it was in devDependencies in stage 1 only).
# server.js is a self-contained HTTP server generated by `next build` with
# output: 'standalone'. It handles routing, streaming, ISR revalidation,
# Server Actions, and all other Next.js runtime features.
CMD ["node", "server.js"]

# ─────────────────────────────────────────────────────────────────────────────
# WHAT ABOUT ISR IN DOCKER?
# ─────────────────────────────────────────────────────────────────────────────
# The 'use cache' + cacheLife() cache store is on the LOCAL FILESYSTEM of this
# container (under .next/cache/). This is fine for a single-replica deployment.
#
# For MULTI-REPLICA deployments (Kubernetes, ECS, Fly.io autoscaling):
#   - Each replica has its own isolated .next/cache/
#   - A revalidateTag() call only invalidates the calling replica's cache
#   - Other replicas serve stale data until cacheLife expires
#
# Fix options:
#   1. Mount a shared volume (NFS / AWS EFS) at /app/.next/cache across replicas
#   2. Use a Redis-backed external cache handler
#   3. Accept eventual consistency within your cacheLife window
#
# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDED .dockerignore
# ─────────────────────────────────────────────────────────────────────────────
# Create a .dockerignore file at the repo root with:
#
#   .git
#   .next
#   node_modules
#   *.md
#   .env
#   .env.local
#   .env.*.local
#   pipeline
#   solutions
#   docs
#   __tests__
#   e2e
#
# This prevents sensitive files (.env) and large directories (node_modules,
# .next from a previous local build) from being sent to the Docker build context,
# which both speeds up `docker build` and avoids accidentally baking local env
# vars into the image.
