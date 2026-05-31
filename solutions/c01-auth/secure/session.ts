// ─── solutions/c01-auth/secure/session.ts ────────────────────────────────
//
// Secure session reference implementation — this mirrors lib/auth/session.ts
// exactly, with additional comments intended for learners reading the solution.
//
// The LIVE application imports from lib/auth, NOT from this file.
// This file exists as a readable, heavily-annotated reference.

import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import type { Session, SessionUser } from "@/lib/auth/types";

const SESSION_COOKIE = "nextmart_session";
const SESSION_DURATION_S = 60 * 60 * 24; // 24 hours

// ── Why TextEncoder? ────────────────────────────────────────────────────────
//
// jose's HS256 (HMAC-SHA256) expects the key as a Uint8Array.
// TextEncoder converts a string to its UTF-8 byte representation.
// The same bytes must be used for both signing (createSession) and
// verification (getSession) — they are derived from the same secret string,
// so this is always true.
function getSigningKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn("[auth/secure] SESSION_SECRET not set — using dev fallback");
    return new TextEncoder().encode("dev-only-secret-do-not-deploy-1234");
  }
  return new TextEncoder().encode(secret);
}

// ── createSession: Sign → Cookie ────────────────────────────────────────────
//
// The flow:
//   user object
//     → SignJWT sets payload + header + iat + exp
//     → .sign(key) computes HMAC-SHA256 over base64url(header).base64url(payload)
//     → produces compact JWS: "header.payload.signature" (three base64url parts)
//     → write to httpOnly sameSite=lax cookie
//
// The signature (third part) ties the header+payload to the secret.
// Any modification to header or payload changes the base64url encoding,
// which changes what the HMAC is computed over, which changes the signature.
// A verifier with the same key recomputes the HMAC and finds a mismatch.

export async function createSession(
  user: SessionUser,
  cookieStore: { set: (name: string, value: string, options: Record<string, unknown>) => void }
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    // iat: issued-at — useful for audit logs and "session age" checks
    .setIssuedAt(now)
    // exp: expiry — jwtVerify automatically rejects tokens past this timestamp
    .setExpirationTime(now + SESSION_DURATION_S)
    .sign(getSigningKey());

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,    // ← blocks XSS document.cookie theft
    secure: process.env.NODE_ENV === "production",  // ← HTTPS-only in prod
    sameSite: "lax",   // ← blocks CSRF sub-resource requests
    path: "/",         // ← available on all routes
    maxAge: SESSION_DURATION_S, // ← browser removes expired cookie
  });
}

// ── getSession: Cookie → Verify → Session ──────────────────────────────────
//
// The flow:
//   read cookie value (compact JWS string)
//     → jwtVerify:
//         1. decode header + payload from base64url
//         2. recompute HMAC-SHA256(base64url(header) + "." + base64url(payload), key)
//         3. compare recomputed signature to signature in token → fail on mismatch
//         4. check exp claim → fail if expired
//         5. check alg claim → reject if not "HS256" (algorithm confusion guard)
//     → on success: return decoded payload
//   validate payload shape
//   return Session object

export async function getSession(
  cookieStore: { get: (name: string) => { value: string } | undefined }
): Promise<Session | null> {
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const { payload } = await jwtVerify(raw, getSigningKey(), {
      // Explicit algorithm allowlist prevents algorithm confusion attacks.
      // Without this, an attacker could craft a token with alg:"none" (no
      // signature) and some implementations would accept it.
      // jose does not have this vulnerability by default, but being explicit
      // is defence-in-depth and documents intent.
      algorithms: ["HS256"],
    });

    // Shape guard: correctly-signed tokens from an old schema version would
    // pass jwtVerify but have an unexpected payload structure.  Check before
    // trusting.
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

    return {
      user,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      // JWTExpired, JWTSignatureInvalid, JWTMalformed, etc.
      // Return null — "no session" is the correct response to a bad token.
      // We do NOT log the raw token value (it contains user data).
      return null;
    }
    throw err; // Unexpected error — let it surface
  }
}

// ── destroySession: Delete Cookie ────────────────────────────────────────────

export async function destroySession(
  cookieStore: { delete: (name: string) => void }
): Promise<void> {
  cookieStore.delete(SESSION_COOKIE);
  // Note: the JWT itself remains valid until exp.  For immediate revocation,
  // add a token blocklist keyed by the "jti" claim.
}
