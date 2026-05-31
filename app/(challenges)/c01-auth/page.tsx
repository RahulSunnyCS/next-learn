// ─── app/(challenges)/c01-auth/page.tsx ──────────────────────────────────
//
// C01 — Session Security challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true) — CANONICAL EXAMPLE:
//   The page is a STATIC SHELL. Any uncached/dynamic data — here the session
//   cookie (getSession → cookies()) and searchParams — MUST be read INSIDE a
//   <Suspense> boundary, never at the route's top level, or the build fails with
//   "Uncached data was accessed outside of <Suspense>". The dynamic part below
//   (<SessionPanel>) is the streamed "hole"; everything else is the static shell
//   that prerenders immediately.
//
//   Note there is NO `export const dynamic` directive: under cacheComponents,
//   dynamic is the default and that directive is disallowed. You opt INTO caching
//   with the `'use cache'` directive, not out of it.

import { Suspense } from "react";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import {
  LoginForm,
  LogoutButton,
  SessionDisplay,
  InsecureToyExplainer,
} from "./_components/auth-ui";

export const metadata: Metadata = {
  title: "C01 — Session Security",
};

export default function C01AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header (prerenders immediately) ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c01-auth</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Session Security: Attack the Toy, Then Build It Right
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches session security by having you break a
          deliberately insecure implementation first. Understand the toy,
          attack it, then study the production-grade version.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: session + error feedback, read INSIDE Suspense ── */}
      <Suspense fallback={<SessionPanelSkeleton />}>
        <SessionPanel searchParams={searchParams} />
      </Suspense>

      {/* ── STATIC SHELL: the Insecure Toy Explainer ── */}
      <InsecureToyExplainer />

      {/* ── STATIC SHELL: Learning Notes ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 space-y-3">
        <h2 className="font-semibold text-indigo-900">How the Secure Version Works</h2>
        <ol className="text-sm text-indigo-800 space-y-2 list-decimal list-inside">
          <li>
            <strong>createSession(user)</strong> calls{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">SignJWT</code>{" "}
            from <code className="font-mono text-xs bg-indigo-100 rounded px-1">jose</code>{" "}
            to produce a compact JWS (header.payload.signature) signed with
            HMAC-SHA256 using a server-side secret.
          </li>
          <li>
            The signed token is written to a cookie with{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">httpOnly</code>,{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">secure</code> (prod),
            and{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">sameSite=lax</code>.
          </li>
          <li>
            <strong>getSession()</strong> reads the cookie, calls{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">jwtVerify</code>{" "}
            which checks the HMAC signature and the <code className="font-mono text-xs bg-indigo-100 rounded px-1">exp</code> claim.
            A tampered or expired token returns{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">null</code>.
          </li>
          <li>
            <strong>destroySession()</strong> deletes the cookie. The JWT
            remains valid until <code className="font-mono text-xs bg-indigo-100 rounded px-1">exp</code>,
            but without the cookie the browser never sends it.
          </li>
        </ol>

        <p className="text-xs text-indigo-700 mt-2">
          Read the full implementation in{" "}
          <code className="font-mono bg-indigo-100 rounded px-1">lib/auth/session.ts</code>.
          Every security decision is commented inline.
        </p>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c01-auth/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">solutions/c01-auth/</code>.
        </p>
      </section>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────
// SessionPanel reads the per-request session cookie and searchParams. Because
// it renders inside <Suspense>, the static shell above streams immediately
// while this resolves. This is the same static-shell + streamed-hole pattern
// the PPR challenge (C03) explores in depth.
async function SessionPanel({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // getSession() reads and verifies the signed JWT from the httpOnly cookie.
  // Returns null if the cookie is absent, expired, or tampered.
  const session = await getSession();
  // Read query params for error feedback (POST-Redirect-GET pattern).
  const { error } = await searchParams;

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error === "unknown-user" && "Unknown user ID — use one of the demo accounts below."}
          {error === "bad-request" && "Bad request — could not parse form data."}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Secure
          </span>
          <h2 className="font-semibold text-gray-900">Live Session Demo</h2>
        </div>
        <p className="text-xs text-gray-500">
          Uses <code className="font-mono bg-gray-100 rounded px-1">lib/auth</code> —
          a signed JWT (HS256) in an httpOnly, sameSite=lax cookie.
        </p>

        {/* Show current session state */}
        <SessionDisplay session={session} />

        {/* Login / logout controls */}
        {session ? <LogoutButton /> : <LoginForm />}

        {/* Cookie attributes explanation */}
        <div className="mt-4 rounded-md bg-gray-50 border border-gray-100 p-4 text-xs text-gray-600 space-y-2">
          <p className="font-medium text-gray-700">What the secure cookie looks like in DevTools:</p>
          <ul className="space-y-1 list-none">
            <li>
              <span className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5">HttpOnly ✓</span>
              {" "}— JavaScript cannot read it (<code className="font-mono">document.cookie</code> won&apos;t show it).
              Blocks XSS cookie theft.
            </li>
            <li>
              <span className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5">SameSite=Lax</span>
              {" "}— Not sent on cross-origin fetch/form-POST. Blocks CSRF while
              allowing OAuth redirect flows.
            </li>
            <li>
              <span className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5">Expires in 24h</span>
              {" "}— The JWT <code className="font-mono">exp</code> claim limits the blast radius
              of a stolen token to 24 hours.
            </li>
            <li>
              <span className="font-mono bg-white border border-gray-200 rounded px-1 py-0.5">Secure (prod only)</span>
              {" "}— In production, the cookie is only sent over HTTPS. Off on
              localhost for developer convenience.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

// Skeleton shown while the dynamic SessionPanel streams in.
function SessionPanelSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-16 bg-gray-50 rounded animate-pulse" />
    </section>
  );
}
