// ─── app/(challenges)/c01-auth/login/route.ts ────────────────────────────
//
// Demo login Route Handler for Challenge C01.
//
// TEACHING CONTEXT
// ────────────────
// A real authentication flow would validate a password (bcrypt compare),
// check a database, and return appropriate errors.  This demo intentionally
// skips all of that: the point of C01 is to demonstrate the SESSION MECHANISM
// (signed JWT, httpOnly cookie), not a full credential system.
//
// The login form lets the learner pick from a small set of seeded demo users.
// On POST, we call `createSession` from lib/auth — which does the correct,
// secure JWT work — so the learner can compare it against the toy insecure
// session.
//
// SECURITY NOTE
// ─────────────
// The `userId` field comes from an untrusted form POST body.  We validate it
// against the DEMO_USERS allow-list before calling createSession.  Never trust
// arbitrary user-supplied IDs and write them directly into a session — always
// validate against a canonical data source first.

import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";

// Demo user set — hard-coded for the teaching lab.
// In a real app these would be fetched from the data layer after password
// verification.  We import a small hard-coded set here to avoid a dependency
// on lib/data/** (which is owned by T-01 and may be incomplete at build time).
const DEMO_USERS: Record<string, SessionUser> = {
  u1: { id: "u1", email: "alice@nextmart.dev", name: "Alice", role: "buyer" },
  u2: { id: "u2", email: "bob@nextmart.dev", name: "Bob", role: "buyer" },
  u3: { id: "u3", email: "carol@nextmart.dev", name: "Carol", role: "seller" },
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: FormData;
  try {
    body = await request.formData();
  } catch {
    // Malformed request body — not a form POST.
    return NextResponse.redirect(new URL("/c01-auth?error=bad-request", request.url));
  }

  // Validate the submitted userId against the known demo set.
  // This is a strict allow-list check — if an unknown id is submitted
  // (e.g. an attacker trying to craft a session for a non-existent user)
  // we redirect back with an error rather than blindly creating a session.
  const userId = body.get("userId");
  if (typeof userId !== "string" || !Object.hasOwn(DEMO_USERS, userId)) {
    return NextResponse.redirect(new URL("/c01-auth?error=unknown-user", request.url));
  }

  const user = DEMO_USERS[userId];

  // Create the signed session cookie via lib/auth.
  // createSession handles: SignJWT, httpOnly cookie, exp claim.
  await createSession(user);

  // Redirect back to the challenge page to show the updated session state.
  // Using a 303 See Other so that a browser back-button press does not
  // re-submit the form.
  return NextResponse.redirect(new URL("/c01-auth", request.url), { status: 303 });
}
