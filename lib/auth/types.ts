// ─── lib/auth/types.ts ────────────────────────────────────────────────────
//
// Shared type definitions for the auth/session layer.
//
// FROZEN: This interface is imported by multiple challenges (C01, account page,
// server-action security, cart-reconcile, OAuth).  Do not change the shape of
// these types without updating every consumer.
//
// Design notes:
//  - SessionUser contains only the fields needed for downstream auth decisions
//    (id, email, name, role).  We deliberately exclude password hashes and other
//    sensitive credentials — those never enter a session token.
//  - Session adds the token-level metadata (iat, exp) so callers can inspect
//    expiry without re-parsing the JWT.
//  - Keeping types in a separate file lets lib/auth/index.ts re-export them
//    without importing the full jose runtime, which is useful for type-only
//    imports in client-boundary files.

/** The user fields that are serialised into the session JWT payload. */
export interface SessionUser {
  /** Opaque user identifier (e.g. UUID or numeric string). */
  id: string;
  email: string;
  name: string;
  /** Coarse role used for server-side access control. */
  role: "buyer" | "seller";
}

/**
 * The decoded, verified session object returned by getSession().
 *
 * Consumers should treat this as READ-ONLY — it is a snapshot of the JWT
 * payload at the time getSession() was called.
 */
export interface Session {
  user: SessionUser;
  /** JWT issued-at timestamp (Unix seconds). */
  iat: number;
  /** JWT expiry timestamp (Unix seconds). */
  exp: number;
}
