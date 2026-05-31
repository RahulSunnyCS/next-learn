// ─── solutions/c04-rsc-boundary/page.tsx ────────────────────────────────────
//
// REFERENCE SOLUTION — C04 RSC vs. Client Boundary Refactor
//
// This file shows BOTH the BEFORE state (over-"use client"ed) and the AFTER
// state side-by-side as annotated examples.  It is NOT a runnable route —
// it lives under solutions/ and is read-only reference material.
//
// ─────────────────────────────────────────────────────────────────────────────
// BEFORE: `"use client"` at the page root — what NOT to do
// ─────────────────────────────────────────────────────────────────────────────

/*
"use client";

// ❌ BEFORE — ALL of these are now Client Components:
import Header from '../_components/Header';
import ProductInfoPanel from '../_components/ProductInfoPanel';
import StaticCallout from '../_components/StaticCallout';
import InteractiveCounter from '../_components/InteractiveCounter'; // the ONLY one that needs it

export default function C04Page() {
  return (
    <div>
      <Header />           // ← bundled as client JS (unnecessary)
      <ProductInfoPanel /> // ← bundled as client JS (unnecessary)
      <StaticCallout />    // ← bundled as client JS (unnecessary)
      <InteractiveCounter /> // ← OK to be client, but now it forced everything else too
    </div>
  );
}

// CONSEQUENCES:
// - Client chunk size: ~15–50 KB uncompressed (all four components + their imports)
// - Hydration cost: React must reconcile every node in the tree, not just the counter
// - Static content (Header, Callout) is downloaded AND parsed as JS even though
//   it never changes and has no interactivity
*/

// ─────────────────────────────────────────────────────────────────────────────
// AFTER: `"use client"` pushed down to the interactive leaf only
// ─────────────────────────────────────────────────────────────────────────────

// ✅ NO "use client" at the top — this file is an RSC
// Only InteractiveIsland.tsx (a separate file) carries "use client"

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

// These imports are fine from an RSC — they reference other RSCs or
// client components by name, but the "use client" directive in those files
// acts as the boundary.
//
// IMPORT RULES:
//   ✅ An RSC can import a Client Component (the bundler inserts a reference)
//   ✅ A Client Component can import another Client Component
//   ❌ A Client Component CANNOT import a Server Component (build error)
//      → use the children composition pattern instead

export const metadata: Metadata = {
  title: "C04 Reference Solution — RSC Boundary",
};

// ─────────────────────────────────────────────────────────────────────────────
// SERIALIZABLE PROPS — violation and fix
// ─────────────────────────────────────────────────────────────────────────────

// ❌ VIOLATION — passing a Date object across the server→client boundary:
//
//   const now = new Date();
//   return <InteractiveIsland label="Counter" initialCount={0} createdAt={now} />;
//   // Runtime error:
//   // "Only plain objects can be passed to Client Components from Server
//   // Components.  Date objects are not supported."

// ✅ FIX — convert to ISO string (a plain JSON-serializable value):
//
//   const nowIso = new Date().toISOString();  // string ← serializable
//   return <InteractiveIsland label="Counter" initialCount={0} createdAt={nowIso} />;

// ─────────────────────────────────────────────────────────────────────────────
// RSC-AS-CHILDREN COMPOSITION PATTERN
// ─────────────────────────────────────────────────────────────────────────────

// Pattern: Client Component receives an RSC as `children` from an RSC parent.
//
// ✅ CORRECT:
//
//   // page.tsx (RSC)
//   export default function Page() {
//     return (
//       <CompositionWrapper>   // "use client" — can accept children
//         <ServerInfoPanel />  // RSC — passed as prop, NOT imported inside client code
//       </CompositionWrapper>
//     );
//   }
//
//   // CompositionWrapper.tsx
//   "use client"
//   export function CompositionWrapper({ children }: { children: React.ReactNode }) {
//     const [open, setOpen] = useState(false);
//     return (
//       <div>
//         <button onClick={() => setOpen(!open)}>Toggle</button>
//         {open && children}
//       </div>
//     );
//   }
//
// ❌ INCORRECT (would cause a build error):
//
//   // CompositionWrapper.tsx
//   "use client"
//   import { ServerInfoPanel } from './ServerInfoPanel'; // ← ERROR: cannot import RSC
//   export function CompositionWrapper() {
//     return <ServerInfoPanel />;
//   }
//
// WHY: When React resolves the page tree on the server, it renders
// `ServerInfoPanel` first and serialises the output (HTML + RSC payload JSON).
// By the time `CompositionWrapper` runs on the client, `children` is already
// a resolved React element — not server-only code.  No server modules are
// included in the client bundle.

export default function C04ReferenceSolution() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">solutions/c04-rsc-boundary</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reference Solution — RSC Boundary Refactor
        </h1>
        <p className="text-gray-600 text-sm">
          Read the source code comments in this file for the annotated BEFORE /
          AFTER comparison.  The live demo is at{" "}
          <Link
            href="/challenges/c04-rsc-boundary"
            className="text-indigo-600 underline"
          >
            /challenges/c04-rsc-boundary
          </Link>
          .
        </p>
      </div>

      {/* Composition pattern demo — rendering an RSC as children of a
          simulated client wrapper */}
      <section className="rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-3">
        <h2 className="font-semibold text-teal-900">
          Composition Pattern (RSC as children)
        </h2>
        {/*
          In the real challenge page, CompositionWrapper is a "use client"
          component.  Here we just show the shape.  ServerInfoPanel is the RSC.
        */}
        <Suspense fallback={<div className="h-8 bg-teal-100 rounded animate-pulse" />}>
          <ServerInfoPanel />
        </Suspense>
      </section>
    </div>
  );
}

// ─── SERVER COMPONENTS (RSCs defined in this reference file) ─────────────────

function ServerInfoPanel() {
  return (
    <div className="rounded-lg bg-white border border-teal-100 p-4 text-sm space-y-2">
      <p className="font-medium text-gray-800">
        ServerInfoPanel — rendered on the server
      </p>
      <p className="text-xs text-gray-500">
        This component is an RSC.  It never appears in any client JS bundle.
        Its output is serialised into the RSC payload and streamed to the
        browser as a resolved React element.
      </p>
    </div>
  );
}
