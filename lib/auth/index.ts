// ─── lib/auth/index.ts ────────────────────────────────────────────────────
//
// PUBLIC AUTH INTERFACE — FROZEN
//
// This is the ONLY auth module that other challenges and application code
// may import.  The interface below is intentionally stable: downstream tasks
// (account page, server-action security, cart-reconcile, OAuth) import these
// names and must not be broken by changes here.
//
// What "FROZEN" means in practice:
//  - The exported FUNCTION SIGNATURES (name, parameter types, return types)
//    must not change.
//  - The exported TYPE shapes (Session, SessionUser) must remain a superset
//    of the current definition — you may add optional fields but never
//    remove or rename existing ones.
//  - The IMPLEMENTATION (session.ts) may change — e.g. swapping the signing
//    algorithm or adding JWE encryption — as long as the interface is stable.
//
// If you need to change this interface, open a PR that also updates every
// downstream consumer in the same commit.  Do not make silent breaking changes.
//
// ── Dependency rule ─────────────────────────────────────────────────────────
//
//  Only lib/auth/session.ts and lib/auth/types.ts are allowed to be imported
//  from this directory.  Other challenges MUST import from this index file
//  (i.e. '@/lib/auth'), never from internal modules like '@/lib/auth/session'.
//  The internal modules may be refactored at any time.
//
// ── Server-only note ────────────────────────────────────────────────────────
//
//  getSession, createSession, and destroySession all call next/headers
//  cookies() internally, which is a server-only API.  Importing this module
//  in a Client Component ("use client") will cause a build error — that is
//  intentional.  Session state should only be read/written on the server.
//  Client Components receive session data as props from a parent Server
//  Component or via a server action, never by importing this module directly.

export type { Session, SessionUser } from "./types";
export { getSession, createSession, destroySession } from "./session";
