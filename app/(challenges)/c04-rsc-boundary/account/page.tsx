// ─── app/(challenges)/c04-rsc-boundary/account/page.tsx ─────────────────────
//
// DEMO: SSR-dynamic account summary — the CONTRAST to the CSR live-metrics
// widget.
//
// WHY SSR HERE (vs. CSR for SellerLiveMetrics):
//   - The session data is needed on FIRST RENDER so the user does not see a
//     flash of empty / "not logged in" state.  CSR would show a loading
//     spinner until JS executes; SSR delivers the real state in the HTML.
//   - This page IS accessible via a direct URL (/challenges/c04-rsc-boundary/
//     account).  If it were SSR with user-name in the HTML, a search engine
//     crawling the page would see the "sign in" prompt (for unauthenticated
//     visits) rather than an empty skeleton.  That is the correct default.
//   - The data (session info, order count) does not change every 3 seconds —
//     SSR is not wasteful here.  The data is fresh on every page load.
//
// CACHE COMPONENTS PATTERN:
//   getSession() reads the session cookie via next/headers cookies() — a
//   dynamic, per-request read.  Under cacheComponents:true, dynamic reads
//   MUST happen inside a <Suspense> boundary (never at the route top level).
//   The page is a static shell; AccountPanel is the dynamic hole.
//
// AUTH IMPORT RULE:
//   We import ONLY from @/lib/auth (the frozen public interface).  We never
//   import from @/lib/auth/session or @/lib/auth/types directly — those are
//   internal modules that may be refactored.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/data";

export const metadata: Metadata = {
  title: "C04 — Account Summary (SSR Demo)",
};

export default function AccountPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          c04-rsc-boundary / account
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account Summary — SSR Dynamic Demo
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This page uses <strong>SSR</strong> to read the session server-side.
          The session data arrives in the initial HTML — no loading flicker, no
          client-side fetch required.{" "}
          <Link
            href="/challenges/c04-rsc-boundary"
            className="text-indigo-600 underline hover:text-indigo-800"
          >
            ← Back to challenge overview
          </Link>
        </p>
      </div>

      {/* ── DYNAMIC HOLE: session read + orders, inside Suspense ── */}
      <Suspense fallback={<AccountSkeleton />}>
        <AccountPanel />
      </Suspense>

      {/* ── STATIC SHELL: explanation ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-sm space-y-2 text-indigo-800">
        <p className="font-semibold text-indigo-900">Why SSR for this page?</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>
            Session data is needed for the <em>first render</em> — CSR would
            show an empty skeleton until JavaScript executes.
          </li>
          <li>
            The page has a stable URL that a user or crawler can visit — SSR
            ensures the correct unauthenticated state (
            <q>sign in</q> prompt) is in the HTML, not a blank shell.
          </li>
          <li>
            Data changes per request, not every few seconds — SSR is not
            wasteful; each load is fresh.
          </li>
        </ul>
        <p className="text-xs mt-2 text-indigo-700">
          Compare with the{" "}
          <code className="font-mono bg-indigo-100 rounded px-1">
            SellerLiveMetrics
          </code>{" "}
          widget on the parent page, which is deliberately CSR because it polls
          every 3 seconds and has no SEO value.
        </p>
      </section>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────────
// AccountPanel is an async Server Component.  It reads the session cookie and
// fetches orders on the server, then returns serializable JSX.  Because it is
// inside <Suspense>, the static shell above renders immediately while this
// resolves.

async function AccountPanel() {
  // getSession() reads and verifies the signed JWT from the httpOnly cookie.
  // Returns null if absent, expired, or tampered.
  // MUST be awaited — in Next.js 16 all dynamic request APIs are async.
  const session: Session | null = await getSession();

  // No session → show sign-in prompt with a link to the auth challenge.
  if (!session) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <p className="text-sm font-medium text-gray-700">
          You are not signed in.
        </p>
        <p className="text-sm text-gray-500">
          Sign in via the{" "}
          <Link
            href="/challenges/c01-auth"
            className="text-indigo-600 underline hover:text-indigo-800"
          >
            C01 Auth challenge
          </Link>{" "}
          to see your account summary.
        </p>
        <div className="rounded-md bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500">
          <p className="font-mono">getSession() → null</p>
          <p>No session cookie present, expired, or signature invalid.</p>
        </div>
      </section>
    );
  }

  // Session exists — fetch orders for this user.
  // This is an uncached read (no 'use cache') — intentionally dynamic.
  const orders = await listOrdersForUser(session.user.id);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
          SSR — server rendered
        </span>
        <h2 className="font-semibold text-gray-900">Account Summary</h2>
      </div>

      {/* Session info */}
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

      {/* Orders */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Order history ({orders.length})
        </p>
        {orders.length === 0 ? (
          <p className="text-xs text-gray-400">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <li
                key={order.id}
                className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between text-xs"
              >
                <span className="font-mono text-gray-600">{order.id}</span>
                <span className="capitalize text-gray-500">{order.status}</span>
                <span className="font-medium text-gray-900">
                  ${(order.totalCents / 100).toFixed(2)}
                </span>
              </li>
            ))}
            {orders.length > 5 && (
              <li className="text-xs text-gray-400 text-center">
                +{orders.length - 5} more orders
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

// Skeleton shown while AccountPanel resolves.
function AccountSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="h-5 w-36 bg-gray-100 rounded animate-pulse" />
      <div className="rounded-md bg-gray-50 border border-gray-100 p-4 space-y-2">
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
    </section>
  );
}
