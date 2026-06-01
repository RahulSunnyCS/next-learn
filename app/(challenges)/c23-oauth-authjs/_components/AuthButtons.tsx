"use client";

// ─── _components/AuthButtons.tsx ─────────────────────────────────────────────
//
// Client Component — Auth.js sign-in and sign-out buttons.
//
// WHY THIS IS A CLIENT COMPONENT
// ────────────────────────────────
// `signIn` and `signOut` from "next-auth/react" use the browser's fetch API to
// POST to the Auth.js API endpoints.  They require a client-side execution
// context.  Server Components cannot use React event handlers (onClick), so
// the buttons must be "use client".
//
// The parent pages (page.tsx, protected/page.tsx) are static shells that render
// this component as a leaf.  Session data flows DOWN as props — the server reads
// the session and passes it as a prop; the client component never reads it
// independently.  This is the correct RSC composition pattern.
//
// CSRF / STATE NOTE
// ─────────────────
// When the user clicks "Sign in with GitHub", Auth.js:
//   1. Generates a random `state` nonce and stores it in a cookie.
//   2. Redirects the browser to GitHub's authorization endpoint with
//      `state=<nonce>` in the URL.
//   3. GitHub redirects back to the callback URL with the same `state` value.
//   4. Auth.js verifies the returned `state` matches the cookie value.
// This prevents CSRF attacks on the callback (an attacker cannot forge a
// callback request because they don't know the `state` nonce).
// The Credentials provider does NOT use the `state` mechanism — CSRF for
// credential sign-in is handled by the `__Host-authjs.csrf-token` cookie.

import { signIn, signOut } from "next-auth/react";

// ---------------------------------------------------------------------------
// Demo user list (mirrors lib/data seeded users)
// ---------------------------------------------------------------------------

const DEMO_USERS = [
  { email: "seller@nextmart.dev", label: "Alex Chen (seller)" },
  { email: "buyer1@nextmart.dev", label: "Jamie Rivera (buyer)" },
  { email: "buyer2@nextmart.dev", label: "Sam Patel (buyer)" },
] as const;

// ---------------------------------------------------------------------------
// Credentials sign-in form
// ---------------------------------------------------------------------------

export function CredentialsSignInForm() {
  async function handleSignIn(email: string) {
    // signIn("credentials", ...) POSTs to /c23-oauth-authjs/api/auth/signin/credentials.
    // `redirect: false` prevents Auth.js from doing a full-page redirect so we
    // can control the UX ourselves (here we just reload to show the new session).
    const result = await signIn("credentials", {
      email,
      password: "any-value-accepted", // lab only — no real password check
      redirect: false,
    });

    // Reload the page to pick up the new session state via the server
    // component / auth() call.  In a real app you might use router.refresh()
    // from next/navigation instead.
    if (result && !result.error) {
      window.location.reload();
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Sign in as a demo user (Credentials provider — no GitHub needed):
      </p>
      <div className="flex flex-wrap gap-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            onClick={() => handleSignIn(u.email)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            {u.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Any value in the password field is accepted — the lab has no password
        hashing. The goal here is to demonstrate the session, not credentials
        security.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitHub OAuth sign-in button
// ---------------------------------------------------------------------------

export function GitHubSignInButton() {
  return (
    <div className="space-y-2">
      <button
        onClick={() =>
          // signIn("github") redirects the browser through the full OAuth flow:
          //  1. POST /c23-oauth-authjs/api/auth/signin/github → generates state nonce
          //  2. Redirect to GitHub authorize URL (with state + client_id + scope)
          //  3. User approves → GitHub redirects to our callback URL
          //  4. Auth.js verifies state, exchanges code for token, creates JWT session
          signIn("github")
        }
        className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
      >
        {/* GitHub SVG icon */}
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.745 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
        Sign in with GitHub
      </button>
      <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
        Requires <code className="font-mono text-xs">AUTH_GITHUB_ID</code> +{" "}
        <code className="font-mono text-xs">AUTH_GITHUB_SECRET</code> in
        .env.local. See the spec for setup instructions.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sign-out button
// ---------------------------------------------------------------------------

export function SignOutButton() {
  return (
    <button
      onClick={() =>
        // signOut() POSTs to /c23-oauth-authjs/api/auth/signout with a CSRF token,
        // then clears the Auth.js session cookie.
        signOut({ redirect: false }).then(() => window.location.reload())
      }
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      Sign out
    </button>
  );
}
