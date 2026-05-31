// ─── app/(challenges)/c01-auth/logout/route.ts ───────────────────────────
//
// Logout Route Handler for Challenge C01.
//
// Calls destroySession() which deletes the httpOnly session cookie.
// After this, getSession() will return null for any subsequent request.
//
// TEACHING NOTE: This only deletes the cookie from the browser.  The raw JWT
// token value remains cryptographically valid until its "exp" timestamp.
// See the Defend-It Q4 (token revocation) for a discussion of this limitation
// and how a production system would address it with a token blocklist.
//
// We accept POST only (not GET) to prevent CSRF via <img src="/c01-auth/logout">
// or similar tag-based cross-origin requests — browsers send GET for image
// sources even with sameSite=lax.  A POST requires either a form submit or a
// fetch() call, both of which are blocked by sameSite for cross-origin callers.

import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  await destroySession();

  // Redirect to the challenge page so the learner sees the "No session" state.
  return NextResponse.redirect(new URL("/c01-auth", request.url), { status: 303 });
}
