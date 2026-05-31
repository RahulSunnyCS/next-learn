// ─── solutions/c01-auth/insecure/session.ts ───────────────────────────────
//
// ██████████████████████████████████████████████████████████████████████████
// ██                                                                        ██
// ██   TEACHING TOY — DELIBERATELY INSECURE — NEVER SHIP TO PRODUCTION    ██
// ██                                                                        ██
// ██   This file demonstrates a naive, BROKEN session implementation.       ██
// ██   It exists ONLY as an attack target for the C01 security challenge.   ██
// ██   It is NOT imported by any live application route.                    ██
// ██                                                                        ██
// ██████████████████████████████████████████████████████████████████████████
//
// ── What this does (and why it is wrong) ────────────────────────────────────
//
//  This implementation serialises the user object to JSON, then base64-encodes
//  it, and stores the result in a plain browser cookie.
//
//  It is wrong in the following ways:
//
//  1. NO SIGNATURE — The payload is just base64-encoded JSON.  Anyone can
//     decode it with atob(), modify any field (e.g. change role to "seller",
//     change id to another user's id), re-encode it with btoa(), and paste
//     the result back as the cookie value.  The server cannot detect this.
//
//  2. NO EXPIRY — The cookie has no Max-Age or Expires attribute, and the
//     payload contains no "exp" field.  A stolen token is valid forever —
//     until the server is restarted or the user manually clears cookies.
//
//  3. NO httpOnly FLAG — The cookie is readable by any JavaScript on the page
//     (document.cookie).  An XSS payload or a malicious third-party script
//     can exfiltrate the token and use it to impersonate the user from any
//     machine, at any time.
//
//  4. NO secure FLAG — The cookie is sent over HTTP as well as HTTPS.  On any
//     non-encrypted connection (e.g. a coffee-shop network, an HTTP staging
//     server) the session token travels in plaintext and can be read by a
//     passive observer.
//
//  5. NO sameSite RESTRICTION — Without sameSite, the cookie is sent on any
//     cross-origin request, including form POSTs from attacker-controlled pages.
//     This makes the application vulnerable to CSRF attacks.
//
// ── How to attack it ────────────────────────────────────────────────────────
//
//  Exercise: run the toy in your browser and follow these steps.
//
//  Step 1 — Read the token:
//    Open DevTools Console and run:
//      document.cookie
//    Find the "nextmart_insecure_session" entry and copy its value.
//
//  Step 2 — Decode it:
//      JSON.parse(atob("<paste value here>"))
//    You will see the raw user object — id, email, name, role.
//
//  Step 3 — Forge a new identity:
//      const obj = JSON.parse(atob("<paste value>"))
//      obj.role = "seller"
//      obj.email = "attacker@evil.com"
//      obj.id = "u999"
//      const forged = btoa(JSON.stringify(obj))
//    Now paste `forged` back into the cookie in DevTools
//    (Application → Cookies → double-click the Value cell).
//
//  Step 4 — Reload the page.  The server reads the modified cookie, trusts it
//  without any verification, and treats you as the user you just invented.
//
// ── Compare to the secure version ───────────────────────────────────────────
//
//  See solutions/c01-auth/secure/session.ts for the corrected implementation
//  using jose SignJWT + jwtVerify with HS256.  There, a forged token returns
//  a JWTSignatureInvalid error and getSession() returns null.

import type { SessionUser, Session } from "@/lib/auth/types";

// The cookie name — distinct from the secure version so both can run in the
// same browser without overwriting each other during the lab exercise.
const INSECURE_COOKIE = "nextmart_insecure_session";

// ── Deliberately insecure createSession ──────────────────────────────────────

/**
 * INSECURE: Encodes the user object as base64 and writes it to a plain cookie.
 *
 * Vulnerabilities (in order of severity):
 *  - No signature → forgeable
 *  - No expiry → stolen token is valid forever
 *  - No httpOnly → readable by JavaScript (XSS theft)
 *  - No secure → sent over HTTP
 *  - No sameSite → CSRF possible
 */
export function createInsecureSession(
  user: SessionUser,
  // cookieSetter is injected so this code can run in both a Route Handler
  // (via response.cookies.set) and in a browser context (via document.cookie).
  // This is a test-convenience seam — not a pattern to copy.
  cookieSetter: (name: string, value: string, options?: Record<string, unknown>) => void
): void {
  // Encoding, NOT encryption or signing.
  // btoa produces base64 — reversible by anyone with atob().
  const token = btoa(JSON.stringify(user));

  // Write the cookie with no security flags whatsoever.
  // Notice what is missing: httpOnly, secure, sameSite, maxAge.
  cookieSetter(INSECURE_COOKIE, token);
}

// ── Deliberately insecure getSession ─────────────────────────────────────────

/**
 * INSECURE: Reads and decodes the base64 cookie without verifying anything.
 *
 * Any base64-encoded JSON that looks like a SessionUser is blindly trusted.
 * An attacker can trivially forge any identity by crafting the right JSON.
 */
export function getInsecureSession(
  cookieGetter: (name: string) => string | undefined
): Session | null {
  const raw = cookieGetter(INSECURE_COOKIE);
  if (!raw) return null;

  try {
    // No signature verification. No expiry check. No schema validation.
    // We just decode and parse — whatever was in the cookie, we trust it.
    const user = JSON.parse(atob(raw)) as SessionUser;
    // Note: no iat or exp — sessions never expire.
    return {
      user,
      // Fake timestamps — the toy has no concept of token lifetime.
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 99999999, // "never expires"
    };
  } catch {
    // Malformed base64 or JSON — return null.
    return null;
  }
}

// ── Deliberately insecure destroySession ────────────────────────────────────

/** INSECURE: Deletes the cookie (this part is correct — deletion is fine). */
export function destroyInsecureSession(
  cookieDeleter: (name: string) => void
): void {
  cookieDeleter(INSECURE_COOKIE);
}
