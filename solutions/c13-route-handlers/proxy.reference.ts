// ─── solutions/c13-route-handlers/proxy.reference.ts ─────────────────────
//
// REFERENCE SOLUTION — proxy.ts (middleware)
//
// This file is a REFERENCE COPY only — it is NOT the active middleware.
// The active middleware is at the REPO ROOT: proxy.ts
//
// This copy exists here so learners can compare the reference implementation
// after completing the challenge without modifying the active proxy.ts.
//
// Teaching annotations are denser here than in proxy.ts to explain the
// rationale behind each decision for learners who are studying the solution.

import { NextRequest, NextResponse } from "next/server";

// ── The two-layer auth-gate architecture ─────────────────────────────────
//
//  The temptation is to run getSession() (jwtVerify) right here in the
//  middleware. DO NOT do this unless you have a compelling reason. Here is why:
//
//  Layer 1 — Middleware (proxy.ts):
//    - Runs before route matching on EVERY matched request.
//    - Cost: one cookie map lookup (O(1)).
//    - Catches: requests with NO session cookie at all.
//    - Effect: 100% of unauthenticated requests are redirected here, cheaply.
//
//  Layer 2 — Server-side page / Route Handler:
//    - Runs only when the matched route's code executes.
//    - Cost: jwtVerify — HMAC-SHA256 + payload decode + expiry check.
//    - Catches: tampered tokens, expired tokens, malformed tokens.
//    - Effect: authoritative verification. Returns null → page redirects.
//
//  Together: the middleware is a cheap pre-filter. The page is the authority.
//  An unauthenticated request never reaches the page (layer 1 catches it).
//  A tampered/expired request reaches the page but is caught by layer 2.
//
//  Why NOT run jwtVerify in middleware:
//   a) The middleware matcher can be broad (if poorly configured) and would
//      run on static asset requests — wasted crypto for a .png file.
//   b) jwtVerify internally uses Node crypto. If the file is moved to Edge
//      runtime, it breaks unless you switch to Web Crypto manually.
//   c) It adds latency on every request, not just the ones where auth matters.
//   d) It couples the middleware to the auth library's implementation details,
//      making refactors harder.

const SESSION_COOKIE = "nextmart_session";
const PROTECTED_PATH_PREFIX = "/c13-route-handlers/account";
const LOGIN_REDIRECT = "/c01-auth";

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── Auth gate ─────────────────────────────────────────────────────────────
  //
  // Correct cheap pattern:
  //   req.cookies.get("nextmart_session") — reads the Cookie request header.
  //   This is the ONLY auth check the middleware needs to do.
  //
  // The alternative (wrong) pattern:
  //   import { getSession } from "@/lib/auth";
  //   const session = await getSession();       // calls jwtVerify on every request
  //   if (!session) redirect to login;
  //
  // The wrong pattern also cannot work in middleware because getSession() calls
  // next/headers cookies() which is NOT available in middleware — middleware
  // uses req.cookies (the request object's cookies, not the response context).

  if (pathname.startsWith(PROTECTED_PATH_PREFIX)) {
    const cookie = req.cookies.get(SESSION_COOKIE);
    if (!cookie?.value) {
      // Construct the redirect URL preserving the intended destination.
      // The `next` param lets the login page redirect back after authentication,
      // which improves UX (the user lands where they wanted to go).
      const url = new URL(LOGIN_REDIRECT, req.url);
      url.searchParams.set("next", pathname);

      // 307 Temporary Redirect: preserves the HTTP method.
      // Use 302 if you prefer (also temporary, but may change POST to GET).
      // Never use 301 for auth redirects — 301 is permanent and browsers
      // cache it, which could permanently redirect authenticated users.
      return NextResponse.redirect(url, { status: 307 });
    }
  }

  // ── Locale redirect ───────────────────────────────────────────────────────
  //
  // Accept-Language negotiation. A simpler version of what i18n routing
  // frameworks (next-intl, lingui) do. The key pattern:
  //   1. Read Accept-Language from the request header.
  //   2. Negotiate to the best supported locale.
  //   3. Redirect to the prefixed path.
  //
  // Security: validate the locale against an allowlist before using it in
  // the URL — never reflect raw Accept-Language into the redirect URL.

  if (pathname === "/c13-route-handlers/locale-demo") {
    const al = req.headers.get("accept-language");
    const locale = negotiateLocale(al);
    if (locale !== "en") {
      return NextResponse.redirect(
        new URL(`/c13-route-handlers/locale-demo/${locale}`, req.url),
        { status: 307 }
      );
    }
  }

  // ── A/B rewrite ───────────────────────────────────────────────────────────
  //
  // NextResponse.rewrite() is a server-side URL substitution — the browser
  // sees the original URL but receives the content of the rewritten URL.
  //
  // This is different from a redirect:
  //   Redirect: browser receives a 3xx and makes a SECOND request to the new URL.
  //   Rewrite:  browser receives the content of the new URL in the SAME response.
  //
  // Use cases for rewrite:
  //   - A/B testing (transparent variant assignment)
  //   - Feature flags (show new page to 10% of users)
  //   - Incremental migration (old URL → new implementation)

  if (pathname === "/c13-route-handlers/ab-test") {
    const existing = req.cookies.get("ab-variant")?.value;
    const variant =
      existing === "a" || existing === "b"
        ? existing
        : Math.random() < 0.5 ? "a" : "b";

    const res = NextResponse.rewrite(
      new URL(`/c13-route-handlers/ab-test/${variant}`, req.url)
    );

    if (!existing) {
      res.cookies.set("ab-variant", variant, {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        path: "/",
        // httpOnly: false intentionally — not sensitive, client analytics may read it.
      });
    }
    return res;
  }

  return NextResponse.next();
}

function negotiateLocale(al: string | null): string {
  const supported = ["en", "fr", "de"];
  if (!al) return "en";
  for (const part of al.split(",")) {
    const lang = part.trim().split(";")[0].trim().split("-")[0].toLowerCase();
    if (supported.includes(lang)) return lang;
  }
  return "en";
}

export const config = {
  matcher: [
    "/c13-route-handlers/account/:path*",
    "/c13-route-handlers/locale-demo",
    "/c13-route-handlers/ab-test",
  ],
};
