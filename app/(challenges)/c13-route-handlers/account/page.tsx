// ─── app/(challenges)/c13-route-handlers/account/page.tsx ────────────────────
//
// DEMO: Protected account page for the Route Handlers / Middleware challenge.
//
// WHY THIS PAGE EXISTS — TWO-LAYER AUTH DEMO:
//   proxy.ts (middleware) guards the path /c13-route-handlers/account/:path*
//   with a cheap cookie-presence check (Layer 1).  Without a real page at this
//   URL, a learner cannot observe the two layers working together on a single
//   request flow.  This page closes that gap.
//
//   Layer 1 (proxy.ts / middleware):
//     - Cheap: checks only whether the session cookie is PRESENT.
//     - Fast: no crypto, no DB read, runs on every matched request.
//     - Limitation: a tampered or expired cookie still has bytes — it passes
//       the presence check.  The middleware alone is NOT sufficient.
//
//   Layer 2 (this page — authoritative):
//     - Calls getSession() which cryptographically verifies the JWT signature
//       and expiry claim (HS256 via jose).
//     - Returns null for absent, tampered, or expired tokens.
//     - Redirects to /c01-auth on null — this is the authoritative guard.
//
//   Together: a request with NO cookie is blocked by Layer 1 (fast redirect
//   from middleware).  A request with a tampered/expired cookie passes Layer 1
//   but is caught by Layer 2 (getSession → null → redirect).
//   Both layers are needed for complete protection.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   getSession() reads cookies() — a dynamic, per-request API.
//   Dynamic reads MUST happen inside a <Suspense> boundary (rule 2).
//   This page follows the static shell + Suspense hole pattern.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "C13 — Protected Account (Middleware Demo)",
};

// ─── Page (static shell) ──────────────────────────────────────────────────────

export default function C13AccountPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c13-route-handlers / account
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Protected Account — Two-layer Auth Demo
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This page exists to make the middleware auth-gate observable. The
          proxy.ts matcher guards{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            /c13-route-handlers/account/:path*
          </code>{" "}
          with a cookie-presence check (Layer 1). This page performs the
          authoritative JWT verification (Layer 2) via{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            getSession()
          </code>
          .
        </p>
        <p className="mt-2">
          <Link
            href="/challenges/c13-route-handlers"
            className="text-sm text-indigo-600 underline hover:text-indigo-800"
          >
            ← Back to Route Handlers challenge
          </Link>
        </p>
      </div>

      {/* ── STATIC SHELL: two-layer explainer ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm text-indigo-900">
        <h2 className="font-semibold text-base">Two-layer auth model</h2>
        <div className="space-y-2">
          <div className="rounded-lg bg-white border border-indigo-100 p-3 space-y-1">
            <p className="font-semibold text-indigo-800 text-xs uppercase tracking-wide">
              Layer 1 — Middleware (proxy.ts)
            </p>
            <p className="text-xs text-indigo-700">
              Cookie presence check only. Fast — no crypto, no DB. Rejects
              requests with NO cookie. Lets through requests with ANY cookie
              (even tampered/expired — it only checks bytes exist).
            </p>
          </div>
          <div className="rounded-lg bg-white border border-indigo-100 p-3 space-y-1">
            <p className="font-semibold text-indigo-800 text-xs uppercase tracking-wide">
              Layer 2 — This page (authoritative)
            </p>
            <p className="text-xs text-indigo-700">
              Calls <code className="font-mono bg-indigo-50 rounded px-0.5">getSession()</code>{" "}
              which verifies JWT signature + expiry. Returns null for absent,
              tampered, or expired tokens. Redirects to /c01-auth on null.
              This is the only layer that provides full cryptographic protection.
            </p>
          </div>
        </div>
        <p className="text-xs text-indigo-700 border-t border-indigo-100 pt-2">
          Both layers together: the middleware provides a fast first gate (UX
          win — unauthenticated users see a redirect without hitting this page),
          while the page provides the authoritative security guarantee.
        </p>
      </section>

      {/* ── DYNAMIC HOLE: session verification ── */}
      <Suspense fallback={<SessionSkeleton />}>
        <AccountPanel />
      </Suspense>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────────
// AccountPanel is the authoritative Layer 2 check.  It reads and verifies the
// session JWT.  Inside <Suspense> so cacheComponents is satisfied (cookies()
// is a dynamic API that must live inside a Suspense boundary).

async function AccountPanel() {
  // getSession() reads + cryptographically verifies the signed JWT cookie.
  // Returns null if: cookie absent, JWT expired, JWT tampered, JWT malformed.
  // This is Layer 2 — the authoritative check.
  const session: Session | null = await getSession();

  // Null session → the middleware let a bad cookie through (or the cookie was
  // cleared between the middleware check and this render).  Redirect to auth.
  // This is the correct behaviour: Layer 2 must never trust Layer 1's verdict.
  if (!session) {
    redirect("/challenges/c01-auth");
  }

  return (
    <section className="rounded-xl border border-green-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
          Layer 2 passed — JWT verified
        </span>
        <h2 className="font-semibold text-gray-900">Session Details</h2>
      </div>

      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 space-y-2 text-sm">
        <p>
          <span className="text-gray-500 w-20 inline-block">Name</span>
          <span className="font-medium text-gray-900">{session.user.name}</span>
        </p>
        <p>
          <span className="text-gray-500 w-20 inline-block">Email</span>
          <span className="font-medium text-gray-900">{session.user.email}</span>
        </p>
        <p>
          <span className="text-gray-500 w-20 inline-block">Role</span>
          <span className="font-medium text-gray-900 capitalize">
            {session.user.role}
          </span>
        </p>
        <p>
          <span className="text-gray-500 w-20 inline-block">Expires</span>
          <span className="font-medium text-gray-900 font-mono text-xs">
            {new Date(session.exp * 1000).toLocaleString()}
          </span>
        </p>
      </div>

      <p className="text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-100">
        <code className="font-mono">getSession()</code> verified the JWT
        signature (HS256) and the{" "}
        <code className="font-mono">exp</code> claim. This page is correctly
        protected by both middleware (Layer 1) and server-side session
        verification (Layer 2).
      </p>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SessionSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 animate-pulse">
      <div className="h-5 w-48 bg-gray-100 rounded" />
      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 space-y-2">
        <div className="h-4 w-40 bg-gray-100 rounded" />
        <div className="h-4 w-48 bg-gray-100 rounded" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
      </div>
    </section>
  );
}
