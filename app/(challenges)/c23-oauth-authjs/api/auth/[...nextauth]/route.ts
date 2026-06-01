// ─── app/(challenges)/c23-oauth-authjs/api/auth/[...nextauth]/route.ts ──────
//
// Auth.js Route Handler for Challenge C23.
//
// This file is intentionally minimal: it simply re-exports the GET and POST
// handlers from the _lib/auth-config module.  Auth.js handles all the heavy
// lifting — the authorize endpoint, the callback endpoint, the session
// endpoint, and the CSRF/state verification — through these two handlers.
//
// ROUTE ISOLATION
// ───────────────
// The challenge's auth config sets `basePath: "/c23-oauth-authjs/api/auth"`,
// which means Auth.js will serve:
//   GET /c23-oauth-authjs/api/auth/signin        — sign-in page (redirects to ours)
//   GET /c23-oauth-authjs/api/auth/callback/:provider — OAuth callback
//   GET /c23-oauth-authjs/api/auth/session       — session JSON endpoint
//   POST /c23-oauth-authjs/api/auth/signin/:provider — credential sign-in
//   POST /c23-oauth-authjs/api/auth/signout      — sign-out
//
// The catch-all [...]nextauth] segment captures every sub-path under /auth.
//
// WHY NO `export const runtime` HERE
// ────────────────────────────────────
// Under Next.js 16 with cacheComponents: true, `export const runtime = 'edge'`
// is incompatible with the Cache Components feature and will fail the build
// with "Route segment config 'runtime' is not compatible".  We intentionally
// omit it.  Auth.js route handlers work correctly on the default Node.js
// runtime without any runtime directive.
//
// Build target: ƒ (Dynamic) — route handlers are always dynamic.

// The `handlers` object from NextAuth() contains GET and POST handler
// functions that Auth.js expects to be exported directly from a Route Handler.
// We destructure here rather than re-exporting a namespace so the Next.js
// App Router can pick up the named exports correctly.
import { handlers } from "../../../_lib/auth-config";

export const { GET, POST } = handlers;
