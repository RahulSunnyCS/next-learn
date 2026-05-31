// ─── solutions/c04-rsc-boundary/account/page.tsx ────────────────────────────
//
// REFERENCE SOLUTION — Account Summary (SSR demo)
//
// This page is the CONTRAST to the CSR live-metrics widget.
//
// KEY DECISIONS DOCUMENTED:
//
// 1. WHY SSR (not CSR):
//    - getSession() reads the per-request cookie — that is inherently dynamic
//      and per-request.  SSR is the correct model for "read server state on
//      every visit".
//    - The session data must be in the initial HTML so the user does not see
//      a flash of "not signed in" before JavaScript fires.
//    - The URL is stable and shareable — SSR ensures a crawler or direct visit
//      gets meaningful content.
//
// 2. CACHE COMPONENTS COMPLIANCE:
//    - No `export const dynamic` directive (disallowed under cacheComponents).
//    - getSession() reads cookies — a dynamic, per-request read.  MUST be
//      inside a <Suspense> boundary.
//    - The page is a static shell (header, links, explanation) + one dynamic
//      hole (AccountPanel inside Suspense).
//
// 3. AUTH IMPORT CONVENTION:
//    - Import ONLY from @/lib/auth (the frozen public interface).
//    - Never import from @/lib/auth/session or @/lib/auth/types (internal).
//
// 4. DATA IMPORT CONVENTION:
//    - Import listOrdersForUser from @/lib/data (the frozen data interface).
//    - Never reach into @/lib/data/repository or @/lib/data/store directly.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import { listOrdersForUser } from "@/lib/data";

export const metadata: Metadata = {
  title: "C04 Reference — Account Summary (SSR)",
};

export default function AccountReferencePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">
          solutions/c04-rsc-boundary / account
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Account Summary — SSR Reference
        </h1>
        <p className="text-gray-600 text-sm">
          <Link
            href="/challenges/c04-rsc-boundary"
            className="text-indigo-600 underline"
          >
            ← Back to challenge
          </Link>
        </p>
      </div>

      {/* Dynamic hole: session + orders, inside Suspense */}
      <Suspense fallback={<AccountSkeleton />}>
        <AccountPanel />
      </Suspense>
    </div>
  );
}

// ─── DYNAMIC HOLE ─────────────────────────────────────────────────────────────

async function AccountPanel() {
  // Dynamic read — inside Suspense as required by cacheComponents rules.
  const session: Session | null = await getSession();

  if (!session) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <p className="text-sm font-medium text-gray-700">Not signed in.</p>
        <p className="text-sm text-gray-500">
          Sign in via{" "}
          <Link href="/challenges/c01-auth" className="text-indigo-600 underline">
            C01 Auth
          </Link>
          .
        </p>
        <p className="text-xs font-mono text-gray-400">
          getSession() → null
        </p>
      </section>
    );
  }

  // Fetch orders server-side — uncached (dynamic per-request).
  const orders = await listOrdersForUser(session.user.id);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
          SSR
        </span>
        <h2 className="font-semibold text-gray-900">
          {session.user.name}
        </h2>
      </div>

      <dl className="text-sm space-y-2">
        <div className="flex gap-4">
          <dt className="text-gray-500 w-16 shrink-0">Email</dt>
          <dd className="font-medium text-gray-900">{session.user.email}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="text-gray-500 w-16 shrink-0">Role</dt>
          <dd className="font-medium text-gray-900 capitalize">{session.user.role}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="text-gray-500 w-16 shrink-0">Orders</dt>
          <dd className="font-medium text-gray-900">{orders.length}</dd>
        </div>
        <div className="flex gap-4">
          <dt className="text-gray-500 w-16 shrink-0">Expires</dt>
          <dd className="font-mono text-xs text-gray-700">
            {new Date(session.exp * 1000).toLocaleString()}
          </dd>
        </div>
      </dl>

      {orders.length > 0 && (
        <ul className="space-y-1.5">
          {orders.slice(0, 3).map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between text-xs rounded border border-gray-100 bg-gray-50 px-3 py-1.5"
            >
              <span className="font-mono text-gray-500">{o.id}</span>
              <span className="capitalize text-gray-400">{o.status}</span>
              <span className="font-medium">${(o.totalCents / 100).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AccountSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
      <div className="h-4 w-48 bg-gray-50 rounded animate-pulse" />
      <div className="h-4 w-40 bg-gray-50 rounded animate-pulse" />
    </section>
  );
}
