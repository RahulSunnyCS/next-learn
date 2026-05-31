// ─── proxy.ts ─────────────────────────────────────────────────────────────
//
// Next.js 16 Middleware — Auth-gate, locale redirect, A/B rewrite.
//
// ── proxy.ts vs. middleware.ts ────────────────────────────────────────────
//
//   Next.js 16 renamed the middleware entry-point file from `middleware.ts`
//   to `proxy.ts`. Both names are still accepted by the framework (the old
//   name is an alias for backward-compatibility), but `proxy.ts` is the
//   canonical name going forward.
//
//   See NOTES.md in solutions/c13-route-handlers/ for the full rationale.
//
// ── Runtime: Node (default) ───────────────────────────────────────────────
//
//   This file intentionally does NOT export `export const runtime = 'edge'`.
//   The Edge runtime has a restricted API surface (Web APIs only — no
//   Node.js built-ins, no `fs`, no full `crypto`, no `Buffer`). Doing heavy
//   cryptographic JWT verification in Edge middleware would work but adds
//   code-size constraints and cold-start sensitivity on every single request.
//
//   Instead we use the cheap "cookie presence" pattern (see AUTH GATE section
//   below). Full authoritative JWT verification stays server-side in the page
//   via @/lib/auth getSession().
//
// ── AUTH GATE DESIGN RATIONALE ────────────────────────────────────────────
//
//   The middleware does NOT import getSession() from @/lib/auth. Here is why:
//
//   1. COST: getSession() calls jwtVerify() (HMAC-SHA256) on EVERY request
//      that matches the middleware config.matcher. Running cryptographic
//      operations on thousands of static-asset requests would be wasteful.
//
//   2. API SURFACE: jwtVerify uses Node.js crypto internally. If this file
//      ever runs at Edge, Node APIs are unavailable.
//
//   3. DEFENCE-IN-DEPTH: The cookie-presence check here is a first-pass
//      gate — cheap, fast, and correct for unauthenticated requests (no
//      cookie at all). For requests that arrive WITH a cookie (potentially
//      tampered or expired), the server-side page calls getSession() which
//      does the authoritative cryptographic check. The result is two layers:
//        - Middleware (cheap): redirect if no cookie present.
//        - Page (authoritative): verify JWT signature + expiry; redirect on
//          null session.
//
//   SECURITY NOTE: This two-layer design means the middleware alone does NOT
//   fully protect against a request carrying a tampered/expired cookie —
//   the cookie has bytes so the middleware lets it through. The page MUST
//   call getSession() and handle null. Both layers together produce the full
//   protection described in the acceptance criteria.
//
// ── WHAT BELONGS IN MIDDLEWARE vs. PAGE ──────────────────────────────────
//
//   Middleware (proxy.ts) — pre-routing, runs on every matched request:
//     ✓ Cookie presence check → redirect unauthenticated users fast
//     ✓ Locale detection → redirect to /[locale]/... early
//     ✓ A/B rewrite → randomly assign users to variants
//     ✗ Heavy crypto (JWT verify) — keep server-side
//     ✗ Database reads — keep server-side
//
//   Page / Route Handler — authoritative, runs only for matched route:
//     ✓ getSession() — full JWT signature + expiry verification
//     ✓ Role-based access control
//     ✓ Database reads
//

import { NextRequest, NextResponse } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────

/** The httpOnly cookie name set by lib/auth/session.ts createSession(). */
const SESSION_COOKIE = "nextmart_session";

/**
 * Protected path prefix. Any request whose pathname starts with this string
 * will be auth-gated. Using a prefix so that /account, /account/orders, etc.
 * are all protected with a single rule.
 *
 * Decision: we auth-gate /c13-route-handlers/account (the demo account path
 * defined for this challenge) rather than a real account page, so the demo
 * is self-contained inside the c13 challenge directory. The same pattern
 * applies to any real path such as /account or /dashboard.
 */
const PROTECTED_PATH_PREFIX = "/c13-route-handlers/account";

/** Login redirect target when an unauthenticated request is caught. */
const LOGIN_REDIRECT = "/c01-auth";

/**
 * Supported locale codes for locale-based redirect demo.
 * In a real app this would cover your full locale list.
 */
const SUPPORTED_LOCALES = ["en", "fr", "de"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale — used when the Accept-Language header is absent. */
const DEFAULT_LOCALE: SupportedLocale = "en";

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Extracts the preferred locale from the Accept-Language header.
 *
 * Parses the standard Accept-Language string (e.g. "fr-CH, fr;q=0.9, en;q=0.8")
 * and returns the first supported locale whose language tag prefix matches, or
 * DEFAULT_LOCALE if none match.
 *
 * We only look at the primary language tag (e.g. "fr" from "fr-CH") to avoid
 * requiring an exact region match. This is a simple heuristic suitable for a
 * teaching demo; a production app would use the `accept-language` npm package
 * or a full BCP-47 negotiation library.
 *
 * Security: the Accept-Language header is user-controlled. We validate against
 * the SUPPORTED_LOCALES allowlist, so no unvalidated user input is reflected
 * into the redirect URL.
 */
function negotiateLocale(
  acceptLanguage: string | null
): SupportedLocale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // Split the header into weighted language tags, sort by quality (desc),
  // and return the first match from SUPPORTED_LOCALES.
  const tags = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.trim().split("-")[0].toLowerCase(), q: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of tags) {
    if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
      return lang as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

// ─── Main middleware function ─────────────────────────────────────────────

/**
 * Next.js middleware entry point. Runs before route matching on every
 * request that matches config.matcher (defined below).
 *
 * This function is exported as `middleware` — the name Next.js 16 expects.
 * The file itself is `proxy.ts` (the v16 canonical name).
 */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ── 1. AUTH GATE ────────────────────────────────────────────────────────
  //
  // Intercept requests to protected paths and redirect to login if the
  // session cookie is absent. This is a CHEAP first-pass gate: we only
  // check cookie PRESENCE here, not validity. Full cryptographic verification
  // (jwtVerify) happens server-side in the page via getSession().
  //
  // Rationale for presence-only check:
  //   - Eliminates 100% of unauthenticated requests before they reach the
  //     route handler, without any crypto cost.
  //   - A tampered/expired cookie will have bytes and pass this check, but
  //     getSession() in the page will return null and the page redirects.
  //   - This is the CORRECT cheap middleware pattern — not a security hole.
  //     Both layers together provide full protection.
  //
  // IMPORTANT: the page at PROTECTED_PATH_PREFIX MUST call getSession() and
  // handle null — the middleware alone is not sufficient for tampered cookies.
  //
  if (pathname.startsWith(PROTECTED_PATH_PREFIX)) {
    // req.cookies is the Next.js RequestCookies API — reads the Cookie header.
    // We do NOT call await cookies() from next/headers here (that is for
    // Server Components/Route Handlers, not middleware).
    const sessionCookie = req.cookies.get(SESSION_COOKIE);

    if (!sessionCookie?.value) {
      // No session cookie at all → definitely unauthenticated → redirect.
      // Preserve the original URL in a `next` query param so the login page
      // can redirect back after authentication.
      const loginUrl = new URL(LOGIN_REDIRECT, req.url);
      loginUrl.searchParams.set("next", pathname);
      // 307 Temporary Redirect preserves the HTTP method (important for POST
      // requests to a protected API, though auth gates typically fire on GET).
      return NextResponse.redirect(loginUrl, { status: 307 });
    }
    // Cookie is present — proceed. The page is responsible for calling
    // getSession() and handling a null result (tampered/expired token).
  }

  // ── 2. LOCALE-BASED REDIRECT ────────────────────────────────────────────
  //
  // Demo: requests to /locale-demo that do not already carry a locale prefix
  // are redirected to /[locale]/locale-demo based on Accept-Language.
  //
  // Real apps would apply this to every route, not just /locale-demo.
  // We scope it narrowly here to avoid interfering with other challenges.
  //
  if (pathname === "/c13-route-handlers/locale-demo") {
    const acceptLanguage = req.headers.get("accept-language");
    const locale = negotiateLocale(acceptLanguage);

    if (locale !== DEFAULT_LOCALE) {
      // Redirect non-default locales to their prefixed path.
      // Security: `locale` is validated against SUPPORTED_LOCALES allowlist
      // above — it is never raw user input.
      const localizedUrl = new URL(
        `/c13-route-handlers/locale-demo/${locale}`,
        req.url
      );
      return NextResponse.redirect(localizedUrl, { status: 307 });
    }
    // Default locale — fall through to normal routing.
  }

  // ── 3. A/B TEST REWRITE ─────────────────────────────────────────────────
  //
  // Demo: requests to /c13-route-handlers/ab-test are randomly rewritten to
  // either the control or variant path — transparently, without a redirect
  // (the URL in the browser does not change).
  //
  // This is a common pattern for gradual rollouts: the middleware decides
  // the variant and rewrites internally; the page renders accordingly.
  //
  // In production you would typically:
  //   a) Persist the variant in a cookie so the same user always sees the
  //      same variant (sticky assignment).
  //   b) Read the variant from a feature-flag service (LaunchDarkly, etc.)
  //      rather than using Math.random().
  //
  if (pathname === "/c13-route-handlers/ab-test") {
    // Deterministic sticky assignment: check for an existing ab-variant cookie.
    // If absent, assign randomly and set the cookie in the response.
    const existingVariant = req.cookies.get("ab-variant")?.value;
    const variant = existingVariant === "b" ? "b" : existingVariant === "a" ? "a" : Math.random() < 0.5 ? "a" : "b";

    // Rewrite to the appropriate variant path.
    // NextResponse.rewrite() changes the page rendered server-side without
    // changing the URL visible in the browser.
    const rewriteUrl = new URL(
      `/c13-route-handlers/ab-test/${variant}`,
      req.url
    );
    const response = NextResponse.rewrite(rewriteUrl);

    // Set the sticky cookie so the same user always sees the same variant.
    // httpOnly is NOT set — A/B assignment is not sensitive, and the client
    // may want to read it for analytics instrumentation.
    // SameSite=lax prevents CSRF while allowing same-site navigations.
    if (!existingVariant) {
      response.cookies.set("ab-variant", variant, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: "lax",
        path: "/",
      });
    }

    return response;
  }

  // Fall through: no middleware action needed — pass the request through.
  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────

/**
 * config.matcher restricts which paths this middleware runs on.
 *
 * Performance note: without a matcher the middleware runs on EVERY request,
 * including `/_next/static/...`, `/_next/image/...`, and `/favicon.ico`.
 * Those requests are hot and do not benefit from auth/locale/A-B logic.
 * The negative lookahead (?!_next|...) excludes them, which is the
 * recommended Next.js pattern.
 *
 * We include:
 *   - The auth-gated /c13-route-handlers/account subtree
 *   - The locale demo path
 *   - The A/B test path
 *
 * Adjust this list to match the real protected paths in your application.
 */
export const config = {
  matcher: [
    // Auth-gated path — matches /c13-route-handlers/account and sub-paths.
    "/c13-route-handlers/account/:path*",
    // Locale redirect demo.
    "/c13-route-handlers/locale-demo",
    // A/B rewrite demo.
    "/c13-route-handlers/ab-test",
    // General exclusion pattern for a real app (not strictly needed given the
    // specific paths above, but shown here as documentation of the pattern):
    // "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
