// ─── _lib/server-secret.ts ──────────────────────────────────────────────────
//
// DEMO: Keeping a secret server-side without the `server-only` npm package.
//
// PATTERN EXPLANATION:
//   The `server-only` npm package (if installed) would add a module-level side
//   effect that throws at bundle time if this file is ever imported by a Client
//   Component — making it a hard build-time guard.
//
//   Since `server-only` is NOT installed in this repo (and we must NOT add
//   deps), we achieve the same discipline through:
//
//   1. NAMING CONVENTION — this module lives under `_lib/` inside a challenge
//      directory.  The leading underscore is a project convention meaning
//      "server-only utility".  Code-review and linting catch accidental client
//      imports.
//
//   2. RUNTIME GUARD (below) — if this module is somehow imported on the client
//      (e.g. someone adds "use client" to a file that imports it), the guard
//      throws at runtime with a clear error message.  This is not as early as
//      the build-time `server-only` check, but it is better than silently
//      leaking the secret.
//
//   3. DOCUMENTATION — spec.md calls out this convention so developers know the
//      rule.
//
// WHY THIS MATTERS FOR BUNDLE SIZE / SECURITY:
//   If this file were imported by a Client Component, Next.js would include
//   `process.env.DEMO_API_SECRET` in the client bundle.  Anyone who downloads
//   the page's JavaScript chunks could read the plaintext secret.  The `'use
//   server'` / `server-only` discipline ensures server env vars stay on the
//   server — they are never serialised into RSC payloads or JS chunks sent to
//   the browser.
//
// NOTE: In a real production app, install and import the `server-only` package
//   as the primary guard:
//     import 'server-only';
//   That gives a build-time error, which is strictly safer than a runtime one.
//   The pattern demonstrated here is the fallback when the package is absent.

// Runtime guard: if window is defined we are in a browser bundle.
// This should never happen if the module boundary rules are followed.
if (typeof window !== "undefined") {
  throw new Error(
    "[server-secret] This module must only be imported by Server Components. " +
    "Never import it from a file that has 'use client' at the top."
  );
}

/**
 * Returns the demo API secret from the server environment.
 *
 * This is a stand-in for any real secret (API key, signing secret, DB
 * password, etc.).  It is read from process.env so it is NEVER included in
 * the client-side JavaScript bundle.
 *
 * If the env var is not set, returns a placeholder so the demo works in
 * development without requiring a .env file.
 */
export function getDemoApiSecret(): string {
  // process.env is only available in Node.js / Edge runtime, never in the
  // browser bundle.  Next.js statically replaces known public env vars
  // (NEXT_PUBLIC_*) at build time, but unprefixed vars like this one are
  // left as-is and resolved at runtime on the server only.
  return process.env.DEMO_API_SECRET ?? "(secret-not-set-in-env)";
}

/**
 * Returns a redacted display string safe to show in the UI.
 * The first 4 chars are shown; the rest is masked.  This lets the demo page
 * prove the secret was read without exposing its full value.
 */
export function getRedactedSecret(): string {
  const secret = getDemoApiSecret();
  if (secret.length <= 4) return "****";
  return secret.slice(0, 4) + "*".repeat(secret.length - 4);
}
