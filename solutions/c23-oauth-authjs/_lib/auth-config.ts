// ─── solutions/c23-oauth-authjs/_lib/auth-config.ts ──────────────────────────
//
// REFERENCE SOLUTION — Auth.js (next-auth v5) config for Challenge C23.
//
// This file is the annotated reference implementation.  It mirrors the
// challenge's own _lib/auth-config.ts with additional explanatory comments
// to help learners understand every decision.
//
// KEY DESIGN DECISIONS:
//
// 1. ADDITIVE / SELF-CONTAINED
//    This config lives entirely within the c23 challenge directory.  It does
//    NOT edit lib/auth, proxy.ts, or any shared code.  It is a parallel
//    auth system demonstrating OAuth alongside the C01 jose session.
//
// 2. basePath ISOLATION
//    Auth.js defaults to mounting at /api/auth.  We set basePath to
//    /c23-oauth-authjs/api/auth so that:
//      - The route handler path matches (see api/auth/[...nextauth]/route.ts)
//      - Auth.js-generated URLs (sign-in, sign-out, callback) are scoped here
//      - Cookie names use a unique prefix, preventing collision
//    The SessionProvider in SessionProviderWrapper.tsx must use the same basePath.
//
// 3. JWT SESSION STRATEGY (no database)
//    All session state lives in a signed+encrypted JWE cookie managed by Auth.js.
//    No database adapter is configured — no DB required to run the lab.
//    Trade-off: sessions cannot be revoked individually before expiry.
//    See NOTES.md for a discussion of when to add a database adapter.
//
// 4. CREDENTIALS PROVIDER (zero-setup fallback)
//    Accepts any seeded lib/data email with any password.  This is intentional
//    for a teaching lab — the goal is to demonstrate the session/OAuth flow,
//    not credential hashing.  A production system MUST hash passwords.
//    WARNING: Credentials provider bypasses OAuth-specific CSRF (state param).
//    Auth.js uses the double-submit CSRF cookie for credentials sign-in instead.
//
// 5. GITHUB OAUTH (scaffolded, commented)
//    Uncomment to enable a full OAuth flow.  Requires AUTH_GITHUB_ID and
//    AUTH_GITHUB_SECRET env vars.  The callback URL is:
//      /c23-oauth-authjs/api/auth/callback/github
//    Auth.js handles the state nonce, code exchange, and profile fetch automatically.
//
// 6. AUTH_SECRET DEV FALLBACK
//    AUTH_SECRET is required to sign CSRF tokens and encrypt session JWTs.
//    The hardcoded fallback lets the lab run without .env.local setup — but
//    it is public knowledge (it is in this repo) and MUST NOT be used in production.
//    The startup warning is intentional: it makes the missing-secret obvious.
//
// 7. CUSTOM JWT/SESSION CALLBACKS
//    The `role` field from lib/data is not part of Auth.js's default User type.
//    We persist it through the jwt callback (token.role) so it survives sessions,
//    and expose it through the session callback so server and client components
//    can read it from session.user.role.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// To enable GitHub OAuth:
//   1. Create a GitHub OAuth App (see spec.md for instructions)
//   2. Add AUTH_GITHUB_ID and AUTH_GITHUB_SECRET to .env.local
//   3. Uncomment the two lines below
// import GitHub from "next-auth/providers/github";

import { getUserByEmail } from "@/lib/data";

// ---------------------------------------------------------------------------
// Secret resolution
// ---------------------------------------------------------------------------

const authSecret =
  process.env.AUTH_SECRET ??
  // DEV FALLBACK — only safe on localhost.  This value is in the public repo.
  // Replace with a random 32+ byte hex string in any non-localhost deployment.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  "c23-dev-fallback-secret-do-not-use-in-production-00000000000000";

if (!process.env.AUTH_SECRET) {
  console.warn(
    "[c23-oauth-authjs] AUTH_SECRET env var is not set. " +
      "Using an insecure hardcoded fallback — DO NOT use in production. " +
      "Set AUTH_SECRET in .env.local (see root .env.example)."
  );
}

// ---------------------------------------------------------------------------
// Auth.js initialisation
// ---------------------------------------------------------------------------

export const { handlers, auth, signIn, signOut } = NextAuth({
  // ── Path isolation ───────────────────────────────────────────────────────
  // Mount Auth.js under the challenge's own path.
  // The route file at api/auth/[...nextauth]/route.ts re-exports `handlers`.
  basePath: "/c23-oauth-authjs/api/auth",

  // ── Secret ───────────────────────────────────────────────────────────────
  // Used to sign CSRF tokens (double-submit cookie pattern for Credentials)
  // and to encrypt the session JWE.  Must be 32+ bytes of entropy in production.
  secret: authSecret,

  // ── Session strategy ─────────────────────────────────────────────────────
  // "jwt": session state lives in a signed+encrypted JWE cookie.
  // No database lookup on every request.
  // "database" (alternative): session ID stored in cookie; full session in DB.
  session: { strategy: "jwt" },

  // ── Providers ────────────────────────────────────────────────────────────
  providers: [
    // ── Credentials provider ─────────────────────────────────────────────
    // Accepts any seeded lib/data email.  Password is not validated — the
    // lab has no password storage.  CSRF protection via double-submit cookie.
    Credentials({
      name: "Demo Account",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "seller@nextmart.dev",
        },
        password: {
          label: "Password (any value)",
          type: "password",
          placeholder: "anything",
        },
      },

      async authorize(credentials) {
        // Validate input — email must be a non-empty string.
        // Returning null causes Auth.js to reject the sign-in attempt.
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        if (!email) return null;

        // getUserByEmail is from lib/data — the seeded in-memory user store.
        // We never call this with unvalidated input (email is trimmed above).
        const user = await getUserByEmail(email);

        if (!user) return null; // Unknown email → deny

        // Return the Auth.js User shape.
        // We include `role` as a custom field — it is not in the default
        // Auth.js User type, so we cast to tell Auth.js to carry it through.
        // The jwt callback below persists it into the token.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        } as { id: string; name: string; email: string; role: string };
      },
    }),

    // ── GitHub OAuth provider (uncomment to enable) ───────────────────────
    //
    // OAuth Authorization Code flow (what Auth.js does automatically):
    //   1. signIn("github") → POST /c23-oauth-authjs/api/auth/signin/github
    //   2. Auth.js generates `state` nonce + stores in cookie + redirects to
    //      GitHub: https://github.com/login/oauth/authorize?client_id=...&state=<nonce>
    //   3. GitHub redirects back: /c23-oauth-authjs/api/auth/callback/github?code=<code>&state=<nonce>
    //   4. Auth.js verifies state matches cookie (CSRF check)
    //   5. Auth.js exchanges code for access_token (server→server POST to GitHub)
    //   6. Auth.js calls /user API with access_token to fetch profile
    //   7. Auth.js calls jwt callback, builds JWE, writes session cookie
    //
    // GitHub({
    //   // Auth.js reads AUTH_GITHUB_ID + AUTH_GITHUB_SECRET automatically.
    //   // Optionally request additional scopes:
    //   // authorization: { params: { scope: "read:user user:email" } },
    // }),
  ],

  // ── Custom sign-in page ───────────────────────────────────────────────────
  // Use the challenge's own page instead of Auth.js's built-in sign-in UI.
  pages: {
    signIn: "/c23-oauth-authjs",
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    // jwt callback: runs at sign-in (user is populated) and at every session
    // read thereafter (user is undefined).  Persist custom fields into the
    // token so they survive across requests.
    async jwt({ token, user }) {
      if (user) {
        // user is the object returned by authorize() or the OAuth profile.
        // Persist role into the token — token is the source of truth for the JWT.
        token.role = (user as { role?: string }).role ?? "buyer";
        // Also persist the provider user id for reference.
        token.uid = user.id;
      }
      return token;
    },

    // session callback: runs when session is read (auth(), useSession(),
    // /api/auth/session endpoint).  Expose only what the client legitimately
    // needs — never expose raw token, private keys, or server secrets here.
    async session({ session, token }) {
      if (session.user) {
        // Carry role and uid from the JWT into the session.user object.
        (session.user as { role?: string; uid?: string }).role =
          (token.role as string) ?? "buyer";
        (session.user as { uid?: string }).uid = token.uid as string;
      }
      return session;
    },
  },

  // Trust the host header (needed for the callback URL to be constructed
  // correctly in development behind Next.js's dev server).
  // In production, ensure your reverse proxy sets the host header correctly.
  trustHost: true,
});
