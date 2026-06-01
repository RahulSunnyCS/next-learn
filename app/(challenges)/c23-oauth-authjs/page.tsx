// ─── app/(challenges)/c23-oauth-authjs/page.tsx ──────────────────────────────
//
// C23 — Real OAuth via Auth.js (next-auth v5)
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   The page is a STATIC SHELL.  The dynamic hole (SessionPanel) reads the
//   Auth.js session cookie via auth() — which calls cookies() internally —
//   inside a <Suspense> boundary.  This prevents the "Uncached data accessed
//   outside <Suspense>" build error.
//
//   NO `export const dynamic` or `export const runtime` here — those directives
//   are incompatible with cacheComponents and will fail the build.  Under Cache
//   Components, dynamic is the default; you opt INTO caching with 'use cache'.

import { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "./_lib/auth-config";
import { C23SessionProvider } from "./_components/SessionProviderWrapper";
import {
  CredentialsSignInForm,
  GitHubSignInButton,
  SignOutButton,
} from "./_components/AuthButtons";

export const metadata: Metadata = {
  title: "C23 — OAuth with Auth.js",
};

export default function C23OAuthPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-violet-500 mb-1">c23-oauth-authjs</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Real OAuth with Auth.js (next-auth v5)
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches the OAuth 2.0 Authorization Code flow,
          the CSRF <code className="font-mono text-xs bg-gray-100 rounded px-1">state</code> parameter,
          and how Auth.js manages JWT sessions — contrasting with the
          hand-rolled <code className="font-mono text-xs bg-gray-100 rounded px-1">jose</code> session in C01.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: session panel reads auth() inside Suspense ── */}
      <Suspense fallback={<SessionPanelSkeleton />}>
        <SessionPanel />
      </Suspense>

      {/* ── STATIC SHELL: OAuth flow explainer ── */}
      <OAuthFlowExplainer />

      {/* ── STATIC SHELL: JWT vs DB sessions ── */}
      <JwtVsDbExplainer />

      {/* ── STATIC SHELL: Auth.js vs hand-rolled C01 comparison ── */}
      <AuthJsVsC01Explainer />

      {/* ── STATIC SHELL: defend-it reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c23-oauth-authjs/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c23-oauth-authjs/</code>.
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DYNAMIC HOLE — reads Auth.js session inside Suspense
// ---------------------------------------------------------------------------

// The `auth()` function from our _lib/auth-config calls cookies() internally,
// making it dynamic (per-request).  We await it inside this async Server
// Component which is rendered inside <Suspense> above.
//
// The `await connection()` call is NOT needed here because `auth()` itself
// invokes an async cookie read — that establishes the dynamic signal.
async function SessionPanel() {
  const session = await auth();

  return (
    // C23SessionProvider wraps the client buttons so next-auth/react's
    // signIn/signOut know which base path to POST to.
    <C23SessionProvider session={session}>
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
            Auth.js
          </span>
          <h2 className="font-semibold text-gray-900">Live Session Demo</h2>
        </div>

        {session ? (
          /* ── Signed-in state ── */
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              <p className="font-medium">Signed in</p>
              <p>
                Name: <strong>{session.user?.name}</strong>
              </p>
              <p>
                Email: <strong>{session.user?.email}</strong>
              </p>
              {(session.user as { role?: string })?.role && (
                <p>
                  Role:{" "}
                  <strong>
                    {(session.user as { role?: string }).role}
                  </strong>
                </p>
              )}
            </div>

            <div className="rounded-md bg-gray-50 border border-gray-100 p-3 text-xs text-gray-600 font-mono break-all">
              <p className="font-medium text-gray-700 font-sans mb-1">
                Raw session object (from auth()):
              </p>
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <SignOutButton />
          </div>
        ) : (
          /* ── Signed-out state ── */
          <div className="space-y-5">
            <p className="text-sm text-gray-600">
              No active Auth.js session.{" "}
              <a
                href="/c23-oauth-authjs/protected"
                className="text-violet-600 hover:underline"
              >
                Try visiting the protected page
              </a>{" "}
              — you will be redirected back here.
            </p>

            {/* Credentials sign-in */}
            <CredentialsSignInForm />

            <div className="border-t border-gray-100 pt-4">
              {/* GitHub OAuth sign-in */}
              <GitHubSignInButton />
            </div>
          </div>
        )}
      </section>
    </C23SessionProvider>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SessionPanelSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-24 bg-gray-50 rounded animate-pulse" />
    </section>
  );
}

// ---------------------------------------------------------------------------
// STATIC SHELL: educational content
// ---------------------------------------------------------------------------

function OAuthFlowExplainer() {
  return (
    <section className="rounded-xl border border-violet-100 bg-violet-50 p-6 space-y-3">
      <h2 className="font-semibold text-violet-900">
        The OAuth 2.0 Authorization Code Flow
      </h2>
      <ol className="text-sm text-violet-800 space-y-2 list-decimal list-inside">
        <li>
          <strong>Authorize</strong> — The user clicks &quot;Sign in with GitHub&quot;.
          Auth.js generates a random <code className="font-mono text-xs bg-violet-100 rounded px-1">state</code> nonce,
          stores it in a cookie, and redirects the browser to GitHub&apos;s
          authorization endpoint with <code className="font-mono text-xs bg-violet-100 rounded px-1">?client_id=&amp;scope=&amp;state=&lt;nonce&gt;</code>.
        </li>
        <li>
          <strong>User consent</strong> — GitHub shows a permission screen.
          The user approves.
        </li>
        <li>
          <strong>Callback</strong> — GitHub redirects back to
          <code className="font-mono text-xs bg-violet-100 rounded px-1 ml-1">
            /c23-oauth-authjs/api/auth/callback/github
          </code>{" "}
          with <code className="font-mono text-xs bg-violet-100 rounded px-1">?code=&lt;auth-code&gt;&amp;state=&lt;nonce&gt;</code>.
        </li>
        <li>
          <strong>CSRF check</strong> — Auth.js verifies the{" "}
          <code className="font-mono text-xs bg-violet-100 rounded px-1">state</code> in the URL
          matches the cookie value set in step 1. A mismatch aborts the flow —
          this is the CSRF defence (an attacker cannot forge a callback because
          they don&apos;t know the nonce).
        </li>
        <li>
          <strong>Token exchange</strong> — Auth.js POSTs the auth code to
          GitHub&apos;s token endpoint and receives an{" "}
          <code className="font-mono text-xs bg-violet-100 rounded px-1">access_token</code>.
          The code is single-use and short-lived (minutes).
        </li>
        <li>
          <strong>Profile fetch</strong> — Auth.js uses the access token to
          call GitHub&apos;s <code className="font-mono text-xs bg-violet-100 rounded px-1">/user</code> API
          and retrieve the user&apos;s profile (name, email, avatar).
        </li>
        <li>
          <strong>Session</strong> — Auth.js calls the{" "}
          <code className="font-mono text-xs bg-violet-100 rounded px-1">jwt</code> callback,
          builds a signed+encrypted JWE, and writes it to a session cookie.
          The browser is redirected to the original page.
        </li>
      </ol>
    </section>
  );
}

function JwtVsDbExplainer() {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-6 space-y-3">
      <h2 className="font-semibold text-blue-900">JWT Sessions vs. Database Sessions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800">
        <div>
          <p className="font-medium mb-1">JWT Session (this challenge)</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Session state lives in an encrypted cookie (JWE)</li>
            <li>No database lookup on every request</li>
            <li>Cannot be individually revoked before expiry</li>
            <li>Scales horizontally without shared session store</li>
            <li>Good for: stateless APIs, edge deployments</li>
          </ul>
        </div>
        <div>
          <p className="font-medium mb-1">Database Session (with an Adapter)</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Cookie holds only a session ID token</li>
            <li>Every request hits the DB to verify the session</li>
            <li>Immediate revocation: delete the DB row</li>
            <li>Requires a persistent session store (DB/Redis)</li>
            <li>Good for: apps needing instant logout, audit logs</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function AuthJsVsC01Explainer() {
  return (
    <section className="rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3">
      <h2 className="font-semibold text-gray-900">
        Auth.js vs. Hand-Rolled Jose Session (C01)
      </h2>
      <div className="text-sm text-gray-700 space-y-2">
        <p>
          <strong>C01</strong> teaches you to build a session from scratch:
          sign a JWT with <code className="font-mono text-xs bg-gray-100 rounded px-1">SignJWT</code>,
          verify it with <code className="font-mono text-xs bg-gray-100 rounded px-1">jwtVerify</code>,
          set cookie flags manually. You control every detail.
        </p>
        <p>
          <strong>C23 (Auth.js)</strong> wraps the same primitives in a
          framework that also handles: OAuth provider integration, the{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">state</code> CSRF nonce,
          the authorization code exchange, the JWT/session callback pipeline,
          and built-in sign-in pages. Less code, more moving parts.
        </p>
        <p>
          Auth.js uses <strong>JWE</strong> (encrypted JWT) for its session
          cookie — the payload is not readable by the browser, unlike the C01
          JWS (signed, readable but tamper-evident). Both strategies use
          <code className="font-mono text-xs bg-gray-100 rounded px-1 ml-1">httpOnly</code> and
          <code className="font-mono text-xs bg-gray-100 rounded px-1 ml-1">sameSite</code> cookies.
        </p>
        <p className="text-xs text-gray-500">
          The C01 jose session (<code className="font-mono">lib/auth</code>) and the
          Auth.js session are INDEPENDENT — they use different cookie names and
          different secrets. You can be signed into both simultaneously without
          collision.
        </p>
      </div>
    </section>
  );
}
