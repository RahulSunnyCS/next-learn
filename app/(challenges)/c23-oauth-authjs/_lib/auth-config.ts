// ─── app/(challenges)/c23-oauth-authjs/_lib/auth-config.ts ──────────────────
//
// Auth.js (next-auth v5) configuration for Challenge C23.
//
// DESIGN: SELF-CONTAINED, ADDITIVE
// ─────────────────────────────────
// This config lives entirely inside the c23 challenge directory and NEVER
// touches lib/auth or proxy.ts.  It is a parallel, standalone Auth.js setup
// that demonstrates a real OAuth flow alongside the hand-rolled jose session
// in C01.  Both auth systems coexist without collision.
//
// COLLISION AVOIDANCE
// ───────────────────
// Auth.js defaults to mounting at /api/auth.  Because this challenge mounts
// its route handler at /c23-oauth-authjs/api/auth/[...nextauth], we set
// `basePath` to that same prefix.  Auth.js will then issue sign-in/out URLs
// and cookie names scoped to that path, so nothing conflicts with any other
// route in the app.
//
// SESSION STRATEGY
// ────────────────
// JWT strategy (no database adapter) is used.  All session state lives in a
// signed+encrypted cookie (JWE) that Auth.js manages.  No extra DB required.
//
// PROVIDERS
// ─────────
// 1. Credentials — email/any-password against the seeded lib/data users.
//    Works with zero external secrets.  The password field accepts anything
//    because lib/data stores no passwords — this is intentional for a
//    teaching lab that focuses on the OAuth flow, not credential hashing.
//    A production system MUST hash passwords with bcrypt/argon2.
//
// 2. GitHub (scaffolded, commented) — a real OAuth provider.  Uncomment and
//    set AUTH_GITHUB_ID + AUTH_GITHUB_SECRET to enable it.
//
// AUTH_SECRET
// ───────────
// Auth.js requires a secret for signing/encrypting JWTs and CSRF tokens.
// We read from AUTH_SECRET env var.  If absent in dev, a hardcoded fallback
// is used so the lab runs without .env.local setup.  The fallback MUST NOT
// be used in production — the startup log warns when it applies.
//
// CSRF PROTECTION
// ───────────────
// Auth.js implements CSRF protection via the OAuth `state` parameter (a
// random nonce embedded in the authorization URL and verified on callback)
// and a `__Host-authjs.csrf-token` cookie (double-submit pattern).  See
// spec.md for the full explanation.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
// Uncomment this import and the GitHub provider below when GitHub OAuth vars
// are configured.  No code change needed beyond that — Auth.js reads
// AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from the environment automatically.
// import GitHub from "next-auth/providers/github";

import { getUserByEmail } from "@/lib/data";

// ---------------------------------------------------------------------------
// Secret resolution
// ---------------------------------------------------------------------------

// AUTH_SECRET is the single secret used by Auth.js to sign CSRF tokens and
// encrypt session JWTs.  We use a dev fallback so the lab boots without any
// .env setup; the fallback MUST be replaced in any non-localhost deployment.
const authSecret =
  process.env.AUTH_SECRET ??
  // DEV FALLBACK — only safe on localhost.  The 32-hex-byte value below is
  // public knowledge (it is in this repo).  Never deploy with this value.
  "c23-dev-fallback-secret-do-not-use-in-production-00000000000000";

if (!process.env.AUTH_SECRET) {
  // Warn once at module load time so the developer notices immediately.
  // Using console.warn rather than throw so the dev server still boots.
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
  // Mount Auth.js API endpoints under the challenge's own path so they don't
  // collide with any other route handler in the app.
  // The matching route file is at:
  //   app/(challenges)/c23-oauth-authjs/api/auth/[...nextauth]/route.ts
  basePath: "/c23-oauth-authjs/api/auth",

  // ── Secret ───────────────────────────────────────────────────────────────
  secret: authSecret,

  // ── Session strategy ─────────────────────────────────────────────────────
  // jwt: Auth.js stores a signed+encrypted JWE in a cookie.  No DB required.
  session: { strategy: "jwt" },

  // ── Providers ────────────────────────────────────────────────────────────
  providers: [
    // ── Provider 1: Credentials (works with zero external setup) ──────────
    //
    // This provider lets the learner sign in with any seeded lib/data email
    // and ANY password (the lab has no password hashing — the goal is to
    // demonstrate the OAuth flow, not credential security).
    //
    // WARNING: Credentials provider bypasses some OAuth security properties:
    //  - No `state` CSRF param (that is an OAuth-specific mechanism).
    //  - Auth.js does NOT store credentials sessions in a DB by default, so
    //    there is no server-side revocation without a session store.
    // Use the GitHub provider for a full OAuth demonstration.
    Credentials({
      name: "Demo Account",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "seller@nextmart.dev",
        },
        // Password accepted but not checked — the seeded users have no
        // passwords.  In production: validate with bcrypt/argon2.
        password: {
          label: "Password (any value)",
          type: "password",
          placeholder: "anything",
        },
      },

      async authorize(credentials) {
        // Input validation: email must be a non-empty string.
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        if (!email) return null; // return null → sign-in fails

        // Look up the user in lib/data (reads the seeded in-memory store).
        const user = await getUserByEmail(email);

        if (!user) return null; // unknown email → deny

        // Return the Auth.js User shape.  We deliberately omit the password
        // field (lib/data does not store passwords) and include only the
        // fields needed for the JWT/session (id, name, email, role).
        // The `role` field is a custom addition — we persist it via the jwt
        // callback below so it survives the session.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          // Custom field — surfaced to the session via the jwt/session callbacks.
          // TypeScript will complain about this extra property; we use a cast
          // to tell Auth.js to carry it through.
          role: user.role,
        } as { id: string; name: string; email: string; role: string };
      },
    }),

    // ── Provider 2: GitHub OAuth (requires env vars — scaffolded) ─────────
    //
    // Uncomment the block below once you have created a GitHub OAuth App:
    //   1. Go to https://github.com/settings/applications/new
    //   2. Set Homepage URL: http://localhost:3000
    //   3. Set Authorization callback URL:
    //      http://localhost:3000/c23-oauth-authjs/api/auth/callback/github
    //   4. Copy Client ID → AUTH_GITHUB_ID in .env.local
    //   5. Generate a Client Secret → AUTH_GITHUB_SECRET in .env.local
    //
    // Auth.js reads AUTH_GITHUB_ID and AUTH_GITHUB_SECRET automatically when
    // the import name matches "github" — no extra configuration needed.
    //
    // GitHub({
    //   // Optional: request additional scopes beyond the default (read:user + user:email)
    //   // authorization: { params: { scope: "read:user user:email" } },
    // }),
  ],

  // ── Custom sign-in page ───────────────────────────────────────────────────
  // Direct Auth.js to our challenge's own sign-in page instead of its built-in
  // UI.  This lets the page explain the OAuth flow while still performing it.
  pages: {
    signIn: "/c23-oauth-authjs",
  },

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    // jwt callback: runs whenever a JWT is created (sign-in) or read (session
    // check).  We persist the `role` custom field into the token so it
    // survives across requests.
    async jwt({ token, user }) {
      if (user) {
        // First call after sign-in: `user` is populated with the result of
        // authorize() (Credentials) or the OAuth profile.
        // Persist role into the token so the session callback can expose it.
        token.role = (user as { role?: string }).role ?? "buyer";
        // Also persist the provider user id for the session.
        token.uid = user.id;
      }
      return token;
    },

    // session callback: runs whenever the session is read (/api/auth/session,
    // useSession(), or auth() on the server).  We expose the role and uid we
    // stored in the jwt callback to the client-visible session object.
    // SECURITY: only expose what the client legitimately needs.  Do NOT expose
    // the full JWT or any server-secret material here.
    async session({ session, token }) {
      if (session.user) {
        // Carry role and uid from the JWT into the session for UI/server use.
        (session.user as { role?: string; uid?: string }).role =
          (token.role as string) ?? "buyer";
        (session.user as { uid?: string }).uid = token.uid as string;
      }
      return session;
    },
  },

  // Trust the host header — needed for the route handler to correctly
  // construct the callback URL.  In production, ensure your reverse proxy sets
  // the host header correctly (Vercel does this automatically).
  trustHost: true,
});
