"use client";
// ─── InteractiveIsland.tsx ───────────────────────────────────────────────────
//
// DEMO: The "use client" boundary pushed DOWN to the smallest interactive leaf.
//
// BEFORE (bad):  The entire page tree is "use client" — even the static header,
//   product list, and nav bar are all Client Components, all included in the
//   JS bundle, all hydrated.
//
// AFTER (this file):  ONLY the interactive island (a counter button + a toggle)
//   is "use client".  Everything else on the page stays a Server Component and
//   never touches the client bundle.
//
// BUNDLE SIZE IMPLICATION (see solutions/c04-rsc-boundary/bundle-delta.md):
//   Moving "use client" from the page root to this leaf means the page's
//   chunk only contains this component's code (~1 KB), not the entire subtree.
//   In the BEFORE shape, every child imported by the page is also bundled as
//   client code.  In the AFTER shape, React serialises the server subtree into
//   the RSC payload (a lightweight JSON-like wire format) and sends it over the
//   network — the browser never executes that code as JavaScript.
//
// SERIALIZABLE PROPS CONTRACT:
//   Props that cross the server→client boundary MUST be serializable to JSON.
//   - string, number, boolean, null, array, plain object: OK
//   - Date, Map, Set, function, class instance, Symbol, undefined: NOT OK
//   The "violation" example is documented in the parent page.tsx via a comment;
//   the fix is shown by how this component only receives primitive props.

import { useState } from "react";

interface InteractiveIslandProps {
  /** Initial label text — serializable (string). */
  label: string;
  /** Initial count to display — serializable (number). */
  initialCount: number;
}

export default function InteractiveIsland({
  label,
  initialCount,
}: InteractiveIslandProps) {
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-violet-800">{label}</p>
        <span className="text-xs font-mono text-violet-500 bg-violet-100 rounded px-2 py-0.5">
          use client island
        </span>
      </div>

      {/* Counter — demonstrates stateful client interaction */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="w-8 h-8 rounded-full bg-violet-200 text-violet-800 font-bold hover:bg-violet-300 transition"
          aria-label="Decrement"
        >
          −
        </button>
        <span className="text-2xl font-bold text-violet-900 w-12 text-center tabular-nums">
          {count}
        </span>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="w-8 h-8 rounded-full bg-violet-200 text-violet-800 font-bold hover:bg-violet-300 transition"
          aria-label="Increment"
        >
          +
        </button>
      </div>

      {/* Toggle — demonstrates expand/collapse state */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-violet-600 hover:text-violet-800 underline"
      >
        {open ? "Hide" : "Show"} implementation note
      </button>

      {open && (
        <p className="text-xs text-violet-700 leading-relaxed border-t border-violet-200 pt-3">
          This entire component is ~1 KB in the JS bundle. The page header,
          product info panel, and account summary above are all Server
          Components — they are never executed as JavaScript in the browser.
          React serialises them into an RSC payload and streams them as
          HTML + JSON, not as executable code.
        </p>
      )}
    </div>
  );
}
