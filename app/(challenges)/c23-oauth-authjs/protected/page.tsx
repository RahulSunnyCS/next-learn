// ─── app/(challenges)/c23-oauth-authjs/protected/page.tsx ───────────────────
//
// C23 — Protected page: demonstrates Auth.js session gating.
//
// CACHE COMPONENTS PATTERN:
//   Static shell + <Suspense>-wrapped dynamic hole.
//   `auth()` reads the session cookie (dynamic) inside the hole.
//   NO `export const dynamic` or `export const runtime`.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "../_lib/auth-config";
import { C23SessionProvider } from "../_components/SessionProviderWrapper";
import { SignOutButton } from "../_components/AuthButtons";

export const metadata: Metadata = {
  title: "C23 — Protected Page",
};

export default function ProtectedPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-violet-500 mb-1">
          c23-oauth-authjs / protected
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Protected Page
        </h1>
        <p className="text-gray-600 text-sm">
          This page is gated by the Auth.js session. Unauthenticated visitors
          are redirected to the challenge sign-in page.
        </p>
      </div>

      {/* ── DYNAMIC HOLE: session check inside Suspense ── */}
      <Suspense fallback={<ProtectedPanelSkeleton />}>
        <ProtectedContent />
      </Suspense>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DYNAMIC HOLE — session gate
// ---------------------------------------------------------------------------

async function ProtectedContent() {
  const session = await auth();

  // Server-side redirect — unauthenticated users are sent to the sign-in page.
  // This is the server component equivalent of middleware-based protection.
  // The `callbackUrl` tells Auth.js where to send the user after sign-in.
  if (!session) {
    redirect("/c23-oauth-authjs");
  }

  const userRole = (session.user as { role?: string })?.role ?? "unknown";

  return (
    <C23SessionProvider session={session}>
      <section className="rounded-xl border border-green-200 bg-green-50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 ring-1 ring-green-300">
            Authenticated
          </span>
          <h2 className="font-semibold text-green-900">Access Granted</h2>
        </div>

        <p className="text-sm text-green-800">
          You are authenticated as{" "}
          <strong>{session.user?.name}</strong> ({session.user?.email}).
          Role: <strong>{userRole}</strong>.
        </p>

        <div className="rounded-md bg-white border border-green-100 p-4 text-xs font-mono text-gray-600">
          <p className="font-medium font-sans text-gray-700 mb-2">
            Full Auth.js session (server-side):
          </p>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <a
            href="/c23-oauth-authjs"
            className="text-sm text-violet-600 hover:underline"
          >
            ← Back to challenge
          </a>
          <SignOutButton />
        </div>
      </section>

      {/* Protection mechanism explanation */}
      <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700 space-y-2">
        <h3 className="font-semibold text-gray-900">
          How this page is protected
        </h3>
        <p>
          The <code className="font-mono text-xs bg-gray-100 rounded px-1">auth()</code> function
          (from the challenge&apos;s own <code className="font-mono text-xs bg-gray-100 rounded px-1">_lib/auth-config.ts</code>)
          reads the Auth.js session cookie, decrypts the JWE, and verifies the
          JWT.  If no valid session exists,{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">auth()</code> returns{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">null</code>.
        </p>
        <p>
          This page calls{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">redirect(&quot;/c23-oauth-authjs&quot;)</code>{" "}
          when the session is null — a server-side redirect that happens before
          any HTML is sent to the browser. No client-side JavaScript is needed
          for the access control check.
        </p>
        <p className="text-xs text-gray-500">
          Alternative approach: use Auth.js{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">middleware</code> to protect
          entire route segments declaratively. See{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">solutions/c23-oauth-authjs/NOTES.md</code>.
        </p>
      </section>
    </C23SessionProvider>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProtectedPanelSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mb-3" />
      <div className="h-32 bg-gray-50 rounded animate-pulse" />
    </section>
  );
}
