"use client";
// ─── ScriptDemo.tsx ───────────────────────────────────────────────────────
//
// Demonstrates next/script loading strategies.
//
// WHY "use client"?
//   next/script renders HTML <script> elements with controlled loading order.
//   The component itself does not need interactivity, but the Script component
//   from next/script is designed to be used in Client Components when you need
//   to control loading behaviour at runtime.  In a Server Component, next/script
//   works too but beforeInteractive is only valid in a layout or page, not in a
//   nested server component — keeping this client avoids the subtle constraint.
//
// THE THREE STRATEGIES:
//
//   beforeInteractive
//   ─────────────────
//   The script is injected into the initial HTML (server-rendered) and blocks
//   hydration until it finishes loading.  Use ONLY for scripts that must exist
//   before any JavaScript runs: consent management platforms (CMP), critical
//   polyfills, or identity libraries that other scripts depend on.  Because it
//   blocks hydration, overusing it directly hurts TTI (Time to Interactive).
//   next/script with beforeInteractive MUST be placed in a layout.tsx or
//   page.tsx file — not in a nested component — so Next.js can inject it
//   into the <head> during server rendering.  We simulate it here for teaching
//   purposes but note this constraint.
//
//   afterInteractive (default)
//   ──────────────────────────
//   The script loads AFTER the page becomes interactive (after hydration).
//   This is the safe default for analytics and tag managers (e.g. Google
//   Analytics, Segment) — they are not needed for the first render.  The page
//   is usable before the script runs.
//
//   lazyOnload
//   ──────────
//   The script loads during idle time — the browser waits until the page is
//   fully loaded and the main thread is quiet.  Use for low-priority scripts
//   that should never compete with rendering: chat widgets, A/B test recorders,
//   optional third-party embeds.  Lowest impact on performance.

import Script from "next/script";
import { useState } from "react";

export function ScriptDemo() {
  // Tracks whether each script has fired its onLoad callback.
  const [afterInteractiveFired, setAfterInteractiveFired] = useState(false);
  const [lazyOnloadFired, setLazyOnloadFired] = useState(false);

  return (
    <div className="space-y-6">
      {/* ── afterInteractive ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-300">
            strategy="afterInteractive"
          </span>
          {afterInteractiveFired && (
            <span className="text-xs text-green-700 font-medium">onLoad fired</span>
          )}
        </div>
        <p className="text-sm text-blue-900">
          Use for: analytics, tag managers, conversion pixels. Loads after the
          page hydrates — the user can interact with the page before this script
          runs.
        </p>
        {/* The actual inline script body is trivial — it just sets a global flag.
            A real use would be a Google Analytics snippet or a Segment loader. */}
        <Script
          id="demo-after-interactive"
          strategy="afterInteractive"
          onLoad={() => setAfterInteractiveFired(true)}
          dangerouslySetInnerHTML={{
            // dangerouslySetInnerHTML is safe here because the content is our own
            // inline literal — not user-controlled data.  next/script requires it
            // for inline scripts (the `src` prop is for external scripts).
            __html: `
              window.__labAfterInteractiveLoaded = true;
              console.log('[lab-optimizations] afterInteractive script ran');
            `,
          }}
        />
        <div className="rounded bg-white border border-blue-100 px-3 py-2 font-mono text-xs text-gray-700">
          {`<Script id="analytics" strategy="afterInteractive" src="/analytics.js" />`}
        </div>
      </div>

      {/* ── lazyOnload ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 ring-1 ring-purple-300">
            strategy="lazyOnload"
          </span>
          {lazyOnloadFired && (
            <span className="text-xs text-green-700 font-medium">onLoad fired</span>
          )}
        </div>
        <p className="text-sm text-purple-900">
          Use for: chat widgets, feedback buttons, low-priority embeds. Loads
          during idle time — never competes with rendering or user interaction.
        </p>
        <Script
          id="demo-lazy-onload"
          strategy="lazyOnload"
          onLoad={() => setLazyOnloadFired(true)}
          dangerouslySetInnerHTML={{
            __html: `
              window.__labLazyLoaded = true;
              console.log('[lab-optimizations] lazyOnload script ran');
            `,
          }}
        />
        <div className="rounded bg-white border border-purple-100 px-3 py-2 font-mono text-xs text-gray-700">
          {`<Script id="chat" strategy="lazyOnload" src="/chat-widget.js" />`}
        </div>
      </div>

      {/* ── beforeInteractive — shown as a code sample only ──────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-300">
          strategy="beforeInteractive" — layout/page.tsx only
        </span>
        <p className="text-sm text-amber-900">
          Use for: consent management (GDPR CMP), critical polyfills that other
          scripts depend on. Injects into the initial HTML and blocks hydration.
          MUST be placed in a layout.tsx or page.tsx — not in a nested component.
          Overusing this directly harms TTI.
        </p>
        {/* We show the pattern as a code block only — not a live Script element —
            because beforeInteractive is restricted to layout/page placement and
            this component is nested.  Trying to use it here would be silently
            ignored or produce a Next.js warning. */}
        <div className="rounded bg-white border border-amber-100 px-3 py-2 font-mono text-xs text-gray-700">
          {`// In app/(challenges)/lab-optimizations/layout.tsx:\n<Script id="cmp" strategy="beforeInteractive" src="/cmp.js" />`}
        </div>
        <p className="text-xs text-amber-700 italic">
          (Not rendered live here — beforeInteractive only works in layout.tsx or page.tsx)
        </p>
      </div>

      {/* ── comparison table ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Strategy</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">When it runs</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Use case</th>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">TTI impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="bg-amber-50">
              <td className="px-3 py-2 font-mono">beforeInteractive</td>
              <td className="px-3 py-2">Before hydration (blocks)</td>
              <td className="px-3 py-2">CMP, critical polyfills</td>
              <td className="px-3 py-2 text-red-700">High (blocks TTI)</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="px-3 py-2 font-mono">afterInteractive</td>
              <td className="px-3 py-2">After hydration</td>
              <td className="px-3 py-2">Analytics, tag managers</td>
              <td className="px-3 py-2 text-yellow-700">Low</td>
            </tr>
            <tr className="bg-purple-50">
              <td className="px-3 py-2 font-mono">lazyOnload</td>
              <td className="px-3 py-2">Idle time</td>
              <td className="px-3 py-2">Chat widgets, embeds</td>
              <td className="px-3 py-2 text-green-700">Minimal</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
