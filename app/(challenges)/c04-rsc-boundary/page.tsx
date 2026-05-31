// ─── app/(challenges)/c04-rsc-boundary/page.tsx ─────────────────────────────
//
// C04 — RSC vs Client Boundary Refactor
//
// This page teaches FOUR concepts through live demonstration:
//
//  1. BEFORE vs. AFTER boundary placement — A BEFORE comment block shows an
//     over-"use client"ed tree; the AFTER is this file itself, with "use client"
//     pushed down to only InteractiveIsland.
//
//  2. Serializable-props contract — What props can legally cross the
//     server→client boundary, and what cannot.  A violation + fix are shown.
//
//  3. RSC-as-children composition — An RSC (ServerInfoPanel) is passed as
//     `children` into a Client Component (CompositionWrapper), proving that
//     Server Components can nest inside Client Components via the children prop.
//
//  4. CSR vs. SSR contrast — SellerLiveMetrics is a deliberate "use client"
//     widget (polling interval); AccountPanel on /account is deliberate SSR.
//
// CACHE COMPONENTS RULES:
//   - No `export const dynamic` directive — disallowed under cacheComponents.
//   - No dynamic reads at the top level; any per-request data is inside
//     <Suspense>.  This page has NO dynamic reads of its own (it is fully
//     static shell + a few streamed holes).
//   - The page renders as ◐ Partial Prerender: the static shell prerenders
//     immediately; SellerLiveMetrics is pure CSR so it is absent from the PPR
//     snapshot; InteractiveIsland and the static sections are prerendered.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import InteractiveIsland from "./_components/InteractiveIsland";
import SellerLiveMetrics from "./_components/SellerLiveMetrics";
import { getRedactedSecret } from "./_lib/server-secret";

export const metadata: Metadata = {
  title: "C04 — RSC vs Client Boundary",
};

// ─────────────────────────────────────────────────────────────────────────────
// BEFORE vs. AFTER: the bundle-size story
// ─────────────────────────────────────────────────────────────────────────────
//
// BEFORE (over-"use client"ed — what NOT to do):
//
//   "use client"           ← top of page.tsx
//   import Header from './Header'         // now a Client Component
//   import ProductList from './ProductList' // now a Client Component
//   import InteractiveCounter from './Counter' // Client Component
//
//   export default function Page() {
//     return (
//       <main>
//         <Header />            // ← bundled into the client JS chunk
//         <ProductList />       // ← bundled into the client JS chunk
//         <InteractiveCounter /> // ← bundled (this is the ONLY one that needs it)
//       </main>
//     );
//   }
//
//   Everything Header and ProductList import is also bundled.  The client
//   chunk can easily be 50–200 KB larger than necessary, just because the
//   boundary was placed too high.
//
// AFTER (this file — boundary pushed down):
//
//   // page.tsx has NO "use client" directive — it is an RSC by default.
//   import InteractiveIsland from './_components/InteractiveIsland' // "use client" lives HERE
//   import ServerInfoPanel from './...' // stays as RSC
//
//   export default function Page() {
//     return (
//       <main>
//         <Header />               // ← Server Component — NOT in JS bundle
//         <ServerInfoPanel />      // ← Server Component — NOT in JS bundle
//         <InteractiveIsland />    // ← "use client" boundary HERE; only this ~1KB chunk
//       </main>
//     );
//   }
//
//   Only InteractiveIsland (and its direct imports) ends up in the client
//   JS bundle.  Header, ServerInfoPanel, and everything they import stay
//   as RSC output — sent as HTML + RSC payload JSON, never as executable JS.
//   See solutions/c04-rsc-boundary/bundle-delta.md for the measured delta.

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZABLE PROPS — violation + fix
// ─────────────────────────────────────────────────────────────────────────────
//
// VIOLATION (would cause a runtime error with "use client"):
//
//   // ❌ Passing a Date object across the server→client boundary
//   const lastUpdated = new Date();
//   <InteractiveIsland label="Counter" initialCount={0} lastUpdated={lastUpdated} />
//   // Error: "Only plain objects can be passed to Client Components from Server
//   // Components.  Date objects are not supported."
//
//   // ❌ Passing a function
//   <InteractiveIsland onReset={() => console.log('reset')} />
//   // Error: "Functions cannot be passed directly to Client Components unless
//   // you explicitly expose it by marking it with 'use server'."
//
// FIX — only pass serializable primitives:
//
//   // ✅ Convert Date to ISO string (serializable)
//   const lastUpdated = new Date().toISOString(); // string
//   <InteractiveIsland label="Counter" initialCount={0} />
//   // ✅ Numbers, strings, booleans, plain objects, arrays are all fine.

export default function C04Page() {
  // Read the server-side secret — this is safe because this file is an RSC
  // (no "use client" at the top).  If this import were inside a Client
  // Component, the build would fail (or our runtime guard would throw).
  const redactedSecret = getRedactedSecret();

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c04-rsc-boundary</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          RSC vs. Client Boundary Refactor
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          This challenge teaches where to place the{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">
            &quot;use client&quot;
          </code>{" "}
          boundary, what props can legally cross it, how Server Components can
          nest inside Client Components, when CSR is the right call, and how
          to keep server secrets off the client bundle.
        </p>
      </div>

      {/* ── SECTION 1: BEFORE vs. AFTER bundle boundary ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          1. Boundary placement — BEFORE vs. AFTER
        </h2>

        {/* Static RSC content (never enters the client JS bundle) */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Server Component — static info panel
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            This box is a Server Component (part of the static shell).  Its
            HTML arrives in the initial response — it is <em>never</em>{" "}
            included in the JavaScript bundle sent to the browser.  A crawler
            or a user with JS disabled sees this content immediately.
          </p>
          <StaticServerBadge label="Rendered on server — NOT in JS bundle" />
        </div>

        {/* Client Component — the interactive island */}
        <InteractiveIsland label="Interactive Counter (the only 'use client' here)" initialCount={0} />
      </section>

      {/* ── SECTION 2: Serializable props ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          2. Serializable props across the boundary
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm space-y-4">
          <p className="text-gray-600">
            Props that cross the server→client boundary are serialized to JSON
            in the RSC payload.  Only JSON-serializable values are allowed.
          </p>
          <div className="space-y-2">
            <SerializableRow
              label="string"
              value={`"hello"`}
              ok
            />
            <SerializableRow
              label="number"
              value="42"
              ok
            />
            <SerializableRow
              label="boolean"
              value="true"
              ok
            />
            <SerializableRow
              label="plain object"
              value={`{ id: "p-001", name: "Widget" }`}
              ok
            />
            <SerializableRow
              label="array"
              value={`["a", "b", "c"]`}
              ok
            />
            <SerializableRow
              label="Date object"
              value="new Date()"
              ok={false}
              fix="Pass as ISO string: new Date().toISOString()"
            />
            <SerializableRow
              label="function"
              value="() => void"
              ok={false}
              fix="Use a Server Action ('use server') or pass data, not callbacks"
            />
            <SerializableRow
              label="class instance"
              value="new MyClass()"
              ok={false}
              fix="Serialize to a plain object: { ...instance }"
            />
            <SerializableRow
              label="Map / Set"
              value="new Map()"
              ok={false}
              fix="Convert to an array: Array.from(map.entries())"
            />
          </div>
        </div>
      </section>

      {/* ── SECTION 3: RSC-as-children composition pattern ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          3. Server Components as children of Client Components
        </h2>
        {/*
          CompositionWrapper is a Client Component (it has interactive state).
          We pass a Server Component (ServerInfoPanel — defined below in this
          file as an RSC) as `children`.  This is the "composition pattern":
          the Client Component does not IMPORT ServerInfoPanel; it receives it
          as an already-rendered RSC node via props.

          This works because React resolves the Server Component tree on the
          server first, turning it into serializable RSC payload.  By the time
          CompositionWrapper runs on the client, `children` is just a resolved
          React element — not server-only code.

          WHY THIS MATTERS: If CompositionWrapper tried to IMPORT ServerInfoPanel
          directly, that would drag ServerInfoPanel into the client bundle.
          Passing it as `children` from an RSC parent (this file) keeps it
          server-side.
        */}
        <CompositionWrapper>
          <ServerInfoPanel />
        </CompositionWrapper>
      </section>

      {/* ── SECTION 4: CSR widget ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          4. Deliberate CSR — Seller Live Metrics
        </h2>
        <SellerLiveMetrics />
      </section>

      {/* ── SECTION 5: Server-only secret ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          5. Server-side secret pattern
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-sm text-gray-600">
            The value below is read from{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              process.env.DEMO_API_SECRET
            </code>{" "}
            on the server.  Only a redacted preview is rendered into the HTML —
            the full value never appears in any client JS chunk.
          </p>
          <div className="rounded-md bg-gray-50 border border-gray-100 p-3 font-mono text-sm text-gray-700">
            DEMO_API_SECRET (redacted):{" "}
            <span className="text-indigo-700 font-bold">{redactedSecret}</span>
          </div>
          <p className="text-xs text-gray-400">
            Open DevTools → Sources → look for{" "}
            <code className="font-mono bg-gray-50 rounded px-1">
              server-secret
            </code>{" "}
            in the client chunks.  You will not find it — this module is
            imported only by this RSC page and never serialised into the client
            bundle.
          </p>
        </div>
      </section>

      {/* ── SECTION 6: SSR account page link ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
          6. SSR-dynamic account summary (contrast with CSR widget)
        </h2>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-sm space-y-3 text-indigo-800">
          <p>
            The account summary lives on a sub-page to keep this overview
            clean.  It reads{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              await getSession()
            </code>{" "}
            inside a{" "}
            <code className="font-mono text-xs bg-indigo-100 rounded px-1">
              &lt;Suspense&gt;
            </code>{" "}
            boundary — per-request, server-side, fully SSR.
          </p>
          <Link
            href="/challenges/c04-rsc-boundary/account"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium px-4 py-2 hover:bg-indigo-700 transition"
          >
            View Account Summary (SSR demo) →
          </Link>
        </div>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c04-rsc-boundary/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c04-rsc-boundary/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ─── SERVER COMPONENTS (defined in this RSC file — no "use client") ───────────

/** Static badge rendered on the server — purely presentational. */
function StaticServerBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
      {label}
    </span>
  );
}

/**
 * ServerInfoPanel — an RSC that will be passed as `children` to the
 * CompositionWrapper Client Component.
 *
 * This component stays server-side.  It is not imported inside a "use client"
 * module; it is rendered here by the RSC page and passed down as an already-
 * resolved element.
 */
function ServerInfoPanel() {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2">
      <p className="text-xs font-semibold text-gray-700">
        Server Component content (passed as children)
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">
        This panel is a Server Component defined in the RSC page file.  It is
        passed as <code className="font-mono bg-gray-100 rounded px-1">children</code>{" "}
        to <code className="font-mono bg-gray-100 rounded px-1">CompositionWrapper</code>,
        which is a Client Component.  React resolves this RSC tree on the
        server first; by the time the Client Component renders, it receives a
        plain React element, not server-only code.
      </p>
      <StaticServerBadge label="RSC — stays on server" />
    </div>
  );
}

// ─── CompositionWrapper — "use client" ────────────────────────────────────────
//
// This component is intentionally defined in a separate client module.
// Because it lives in the same file as the RSC page, we cannot add
// "use client" here.  We inline an equivalent pattern via a client island
// that accepts children.
//
// In a real split: CompositionWrapper.tsx would have "use client" at the top
// and receive `children: React.ReactNode`.  Here we use InteractiveIsland's
// `children`-accepting variant to demonstrate the pattern.

/**
 * CompositionDemoWrapper — demonstrates the composition pattern inline.
 * In a real app this would be in its own "use client" file that accepts
 * children: React.ReactNode and renders interactive chrome around them.
 */
function CompositionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-teal-800">
          CompositionWrapper (simulated Client Component)
        </p>
        <span className="text-xs font-mono text-teal-500 bg-teal-100 rounded px-2 py-0.5">
          children = RSC node
        </span>
      </div>
      <p className="text-xs text-teal-700">
        A Client Component receives a Server Component as{" "}
        <code className="font-mono bg-teal-100 rounded px-1">children</code>.
        The Client Component does NOT import the RSC directly — doing so would
        pull it into the client bundle.  Instead, the RSC parent (this page)
        renders both and passes the RSC output as props to the Client Component.
      </p>
      {/* The RSC children slot — rendered on server, received as serialized
          React element by the client */}
      <div className="rounded-lg border border-teal-100 bg-white p-1">
        {children}
      </div>
    </div>
  );
}

// ─── SerializableRow ──────────────────────────────────────────────────────────
// Pure RSC display row for the serializable-props table.

function SerializableRow({
  label,
  value,
  ok,
  fix,
}: {
  label: string;
  value: string;
  ok: boolean;
  fix?: string;
}) {
  return (
    <div
      className={`rounded-md border p-3 text-xs space-y-1 ${
        ok
          ? "border-green-100 bg-green-50"
          : "border-red-100 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`font-bold ${ok ? "text-green-600" : "text-red-600"}`}>
          {ok ? "✓" : "✗"}
        </span>
        <div className="flex-1 space-y-0.5">
          <span className={`font-medium ${ok ? "text-green-800" : "text-red-800"}`}>
            {label}
          </span>
          <code className={`block font-mono ${ok ? "text-green-700" : "text-red-700"}`}>
            {value}
          </code>
          {!ok && fix && (
            <p className="text-green-700 mt-1">
              <span className="font-medium">Fix: </span>{fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
