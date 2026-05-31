// ─── app/(challenges)/lab-optimizations/page.tsx ─────────────────────────
//
// LAB — Built-in Next.js Optimizations Checklist
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page follows the canonical static-shell + Suspense-hole pattern
//   from c01-auth.  The page itself is a static shell — it contains no dynamic
//   data reads at the top level.  The catalog data (featured products) is read
//   inside a <Suspense> boundary via a 'use cache' wrapped helper.
//
//   The font is loaded in a local layout (lab-optimizations/layout.tsx) rather
//   than here, so the <html> wrapper can receive the font CSS variable.
//
// SECTIONS:
//   1. next/image — CLS prevention (wrong vs right)
//   2. next/font  — self-hosting + layout shift prevention
//   3. next/script — loading strategy comparison
//   4. <Link> prefetch — tuning and disabling
//   5. Per-route code splitting — next/dynamic

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";

import {
  WrongWayImage,
  StaticImportImage,
  BadgeImage,
  RemoteImageWithSizes,
} from "./_components/OptimizedImage";
import { ScriptDemo } from "./_components/ScriptDemo";
import { getFeaturedProducts } from "./_lib/catalog";

export const metadata: Metadata = {
  title: "LAB — Built-in Optimizations",
};

// ── Per-route code splitting with next/dynamic ───────────────────────────
//
// next/dynamic wraps a dynamic import (import()) so Next.js can split the
// component into a separate JS chunk.  The main route bundle stays small;
// the heavy component's code is only fetched when it renders.
//
// `ssr: false` — skip server rendering for this component.
//   Why: heavy charting/analytics components often use browser APIs (canvas,
//   resize observers) that are unavailable during SSR.  Setting ssr:false
//   keeps the server bundle clean and avoids hydration mismatches.
//   Tradeoff: the component is invisible in the initial HTML, so it should
//   never be the LCP element.
//
// `loading` — the React fallback shown while the chunk downloads.
//   Without this, next/dynamic shows nothing until the chunk arrives,
//   which can cause a jarring pop-in.
//
// This call is at module level (outside any component) so the chunk splitting
// decision is made at build time — NOT inside a render function.
const HeavyAnalyticsChart = dynamic(
  () => import("./_components/HeavyAnalyticsChart"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 animate-pulse h-40 flex items-center justify-center text-sm text-gray-400">
        Loading chart chunk…
      </div>
    ),
  }
);

// ─────────────────────────────────────────────────────────────────────────
// Page (static shell)
// ─────────────────────────────────────────────────────────────────────────

export default function LabOptimizationsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 py-8">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">lab-optimizations</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Built-in Next.js Optimizations
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          A guided checklist of the five built-in optimizations that ship with
          Next.js: image loading (CLS prevention), font self-hosting, third-party
          scripts, Link prefetching, and per-route code splitting.  Each section
          shows the wrong pattern, the right pattern, and the mechanism that makes
          the right pattern faster.
        </p>
        {/* Jump links */}
        <nav className="mt-4 flex flex-wrap gap-2 text-xs" aria-label="Sections">
          {[
            ["#image", "1. next/image"],
            ["#font", "2. next/font"],
            ["#script", "3. next/script"],
            ["#prefetch", "4. Link prefetch"],
            ["#codesplit", "5. Code splitting"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 1 — next/image
          ═══════════════════════════════════════════════════════════════ */}
      <section id="image" className="space-y-4">
        <SectionHeading
          number={1}
          title="next/image — CLS Prevention"
          status="checklist"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong>Cumulative Layout Shift (CLS)</strong> happens when content
            jumps because the browser did not know how big an image would be before
            it loaded.  A CLS score above 0.1 is rated "Needs Improvement" by
            Google Core Web Vitals.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            <code className="font-mono text-xs bg-gray-100 rounded px-1">next/image</code>{" "}
            prevents CLS by requiring width and height so the browser can reserve
            the exact space before the file arrives.  The preferred approach is a
            <strong> static import</strong> — Next.js extracts dimensions from the
            file at build time automatically.
          </p>
        </div>

        {/* Checklist items */}
        <div className="space-y-2 text-sm">
          <ChecklistItem done label="Understand what causes CLS" />
          <ChecklistItem done label="Compare wrong vs right image usage" />
          <ChecklistItem done label="Use static import (auto width/height)" />
          <ChecklistItem done label="Add priority to the LCP image" />
          <ChecklistItem done label="Add blur placeholder" />
          <ChecklistItem done label="Use sizes for responsive remote images" />
        </div>

        {/* Demos */}
        <div className="grid md:grid-cols-2 gap-6">
          <WrongWayImage />
          <StaticImportImage />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <BadgeImage />
          <RemoteImageWithSizes />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 2 — next/font
          ═══════════════════════════════════════════════════════════════ */}
      <section id="font" className="space-y-4">
        <SectionHeading
          number={2}
          title="next/font — Self-hosted Google Fonts"
          status="checklist"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Traditional Google Fonts usage inserts a{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">
              &lt;link rel=&quot;stylesheet&quot; href=&quot;https://fonts.googleapis.com/...&quot;&gt;
            </code>{" "}
            into the page.  This causes two problems:
          </p>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside pl-2">
            <li>
              <strong>Render-blocking request</strong> — the browser cannot paint until
              the CSS is downloaded (adds 200–400ms on slow connections).
            </li>
            <li>
              <strong>Layout shift on font swap</strong> — the fallback font occupies
              different space than the custom font; when the swap happens the layout
              jumps.
            </li>
          </ol>
          <p className="text-sm text-gray-700 leading-relaxed">
            <code className="font-mono text-xs bg-gray-100 rounded px-1">next/font/google</code>{" "}
            downloads font files at <strong>build time</strong>, self-hosts them in
            the{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">.next/</code>{" "}
            output, and generates{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">@font-face</code>{" "}
            rules with a <code className="font-mono text-xs bg-gray-100 rounded px-1">size-adjust</code>{" "}
            property calculated from the font metrics — this pre-resizes the fallback
            so the swap produces zero layout shift.
          </p>

          {/* Demonstrate the font is applied to this section */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
            <p className="text-xs text-indigo-500 mb-1 font-mono">
              Demo — Inter font (from next/font/google) applied via CSS variable
            </p>
            <p
              className="text-lg text-indigo-900"
              style={{ fontFamily: "var(--font-lab, system-ui)" }}
            >
              The quick brown fox jumps over the lazy dog.
              <br />
              <span className="text-sm text-indigo-600">
                This text uses Inter loaded by next/font — no network request to
                Google at runtime.
              </span>
            </p>
          </div>

          <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
            <p className="font-medium text-gray-700">How the font is loaded in this lab:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>
                <code className="font-mono bg-gray-100 rounded px-0.5">_lib/fonts.ts</code>{" "}
                calls <code className="font-mono bg-gray-100 rounded px-0.5">Inter({"{ subsets: [\"latin\"], display: \"swap\", variable: \"--font-lab\" }"})</code>
              </li>
              <li>
                <code className="font-mono bg-gray-100 rounded px-0.5">layout.tsx</code>{" "}
                applies <code className="font-mono bg-gray-100 rounded px-0.5">labFont.variable</code>{" "}
                as a className on the wrapper — this sets the CSS variable on
                all descendants.
              </li>
              <li>
                Any element with{" "}
                <code className="font-mono bg-gray-100 rounded px-0.5">font-family: var(--font-lab)</code>{" "}
                receives Inter.
              </li>
            </ol>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <ChecklistItem done label="Understand render-blocking font requests" />
          <ChecklistItem done label="Configure next/font/google in _lib/fonts.ts" />
          <ChecklistItem done label="Apply font via CSS variable in layout.tsx" />
          <ChecklistItem done label="Confirm no fonts.googleapis.com request in Network tab" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 3 — next/script
          ═══════════════════════════════════════════════════════════════ */}
      <section id="script" className="space-y-4">
        <SectionHeading
          number={3}
          title="next/script — Loading Strategies"
          status="checklist"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            A plain{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">&lt;script src="..."&gt;</code>{" "}
            in the document head is render-blocking — the browser pauses HTML
            parsing until the script downloads and executes.  Even a{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">&lt;script defer&gt;</code>{" "}
            competes for the main thread during parse.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            <code className="font-mono text-xs bg-gray-100 rounded px-1">next/script</code>{" "}
            lets you declare intent with a{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">strategy</code>{" "}
            prop.  Next.js handles the timing so you never have to write{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">defer</code> or{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">async</code> manually.
          </p>
          <ScriptDemo />
        </div>

        <div className="space-y-2 text-sm">
          <ChecklistItem done label="Identify scripts that need beforeInteractive (rare)" />
          <ChecklistItem done label="Move analytics to afterInteractive" />
          <ChecklistItem done label="Move chat/widgets to lazyOnload" />
          <ChecklistItem done label="Observe console logs timing in DevTools" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 4 — <Link> prefetch
          ═══════════════════════════════════════════════════════════════ */}
      <section id="prefetch" className="space-y-4">
        <SectionHeading
          number={4}
          title="<Link> Prefetching"
          status="checklist"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            <code className="font-mono text-xs bg-gray-100 rounded px-1">next/link</code>{" "}
            automatically prefetches linked pages when they scroll into the
            viewport (in production builds).  The browser fetches the route&apos;s
            JS chunk and RSC payload in the background, so navigating feels
            instant.
          </p>

          {/* Default prefetch */}
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2">
            <p className="text-xs font-mono text-green-700">Default — prefetch on viewport entry</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/c01-auth"
                className="rounded-md bg-white border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-100 transition-colors"
              >
                Go to C01 Auth
              </Link>
              <Link
                href="/c02-catalog-ssg-isr"
                className="rounded-md bg-white border border-green-300 px-4 py-2 text-sm text-green-800 hover:bg-green-100 transition-colors"
              >
                Go to C02 Catalog
              </Link>
            </div>
            <p className="text-xs text-green-700">
              In a production build: open DevTools → Network → filter by Fetch/XHR.
              As these links enter the viewport, Next.js fires prefetch requests for
              their route payloads (
              <code className="font-mono bg-green-100 rounded px-0.5">?_rsc=1</code> suffix).
            </p>
          </div>

          {/* Disabled prefetch */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2">
            <p className="text-xs font-mono text-gray-600">prefetch={"{false}"} — disable prefetching</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/c01-auth"
                prefetch={false}
                className="rounded-md bg-white border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                C01 Auth (no prefetch)
              </Link>
            </div>
            <p className="text-xs text-gray-600">
              <code className="font-mono bg-gray-100 rounded px-0.5">prefetch={"{false}"}</code>{" "}
              disables automatic prefetching.  Use this for links to heavy pages
              that the user is unlikely to visit, or when you want to conserve
              bandwidth on mobile.  The page still navigates normally when
              clicked — it just isn&apos;t pre-fetched.
            </p>
          </div>

          {/* Explanation table */}
          <div className="rounded-lg border border-gray-200 overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Behaviour</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">When</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-3 py-2">Static route prefetch</td>
                  <td className="px-3 py-2">Link enters viewport (prod only)</td>
                  <td className="px-3 py-2 font-mono">default</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">Full prefetch on hover</td>
                  <td className="px-3 py-2">Mouse hovers the link (prod only)</td>
                  <td className="px-3 py-2 font-mono">prefetch={"{true}"}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">No prefetch</td>
                  <td className="px-3 py-2">Never</td>
                  <td className="px-3 py-2 font-mono">prefetch={"{false}"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 italic">
            Note: prefetching only fires in production (<code className="font-mono bg-gray-100 rounded px-0.5">next build + next start</code>).
            In <code className="font-mono bg-gray-100 rounded px-0.5">next dev</code> prefetch requests are suppressed to keep
            the dev server snappy.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <ChecklistItem done label="Observe prefetch requests in Network tab (prod)" />
          <ChecklistItem done label="Compare default vs prefetch={false} links" />
          <ChecklistItem done label="Identify links where disabling prefetch saves bandwidth" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          SECTION 5 — Per-route code splitting
          ═══════════════════════════════════════════════════════════════ */}
      <section id="codesplit" className="space-y-4">
        <SectionHeading
          number={5}
          title="Per-route Code Splitting with next/dynamic"
          status="checklist"
        />
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            Next.js automatically code-splits every route — each page only loads
            its own JS.  But components imported at the top of a page are bundled
            into that page&apos;s chunk.  A 200 kB charting library imported in one
            route&apos;s page.tsx adds 200 kB to <em>every user</em> who loads that
            route, even if they never scroll to the chart.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            <code className="font-mono text-xs bg-gray-100 rounded px-1">next/dynamic</code>{" "}
            (a thin wrapper around React&apos;s{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">lazy()</code> +{" "}
            <code className="font-mono text-xs bg-gray-100 rounded px-1">Suspense</code>) splits the
            component into a separate chunk.  That chunk is only fetched from the
            server when the component is actually rendered.
          </p>

          {/* The dynamically-imported chart component */}
          <div className="space-y-2">
            <p className="text-xs font-mono text-indigo-600 bg-indigo-50 rounded px-2 py-1 inline-block">
              HeavyAnalyticsChart — loaded via next/dynamic (separate chunk)
            </p>
            {/* HeavyAnalyticsChart is imported at module level as a dynamic
                component — see the const at the top of this file.  Rendering
                it here causes Next.js to fetch its chunk asynchronously. */}
            <HeavyAnalyticsChart />
          </div>

          {/* How to verify */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2 text-sm">
            <p className="font-semibold text-amber-900">How to verify the split</p>
            <ol className="text-amber-800 space-y-1 list-decimal list-inside">
              <li>
                Run <code className="font-mono text-xs bg-amber-100 rounded px-0.5">npm run build</code> and look at the terminal output.  Each route&apos;s
                first load JS should be small (this route&apos;s chunk excludes
                HeavyAnalyticsChart).
              </li>
              <li>
                Open <code className="font-mono text-xs bg-amber-100 rounded px-0.5">.next/static/chunks/</code> and search for a file whose name or
                content references &quot;HeavyAnalyticsChart&quot; — it is a separate file
                from the main lab-optimizations chunk.
              </li>
              <li>
                In the browser (production build), open DevTools → Network.
                When the page loads, you should see a separate fetch for the chart
                chunk that fires after the page is interactive.
              </li>
            </ol>
          </div>

          {/* Code snippet */}
          <div className="rounded-lg bg-gray-900 text-green-400 p-4 text-xs font-mono space-y-1 overflow-x-auto">
            <p className="text-gray-400">{`// page.tsx — module level (not inside a component)`}</p>
            <p>{`import dynamic from "next/dynamic";`}</p>
            <p className="mt-2">{`const HeavyChart = dynamic(`}</p>
            <p>{`  () => import("./_components/HeavyAnalyticsChart"),`}</p>
            <p>{`  {`}</p>
            <p>{`    ssr: false,          // skip SSR — uses browser APIs`}</p>
            <p>{`    loading: () => <Skeleton />,`}</p>
            <p>{`  }`}</p>
            <p>{`);`}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <ChecklistItem done label="Understand per-route automatic splitting" />
          <ChecklistItem done label="Use next/dynamic for heavy client components" />
          <ChecklistItem done label="Choose ssr: false for browser-API-dependent components" />
          <ChecklistItem done label="Verify separate chunk in .next/static/chunks/" />
        </div>
      </section>

      {/* ── Cached catalog data demo (inside Suspense per PPR rules) ─── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Bonus: Cached Data with Prefetch-Ready Links
        </h2>
        <p className="text-sm text-gray-600">
          The featured products below are fetched via a{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">{"'use cache'"}</code>{" "}
          server function (inside Suspense per the Cache Components rule).
          Each product link demonstrates next/link prefetching on a real
          data-driven route.
        </p>
        <Suspense fallback={<CatalogSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>

      {/* ── Defend-It reminder ───────────────────────────────────────── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/lab-optimizations/_meta/defend-it.md
          </code>{" "}
          with your own answers, commit it, and only then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/lab-optimizations/
          </code>.
        </p>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC HOLE — catalog data (must be inside <Suspense> per Cache Components)
// ─────────────────────────────────────────────────────────────────────────────

async function FeaturedProducts() {
  // getFeaturedProducts() is a 'use cache' function — safe to call here.
  // It's inside <Suspense> at the call site above, satisfying the PPR rule.
  const products = await getFeaturedProducts();

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {products.map((product) => (
        <Link
          key={product.id}
          // This href would navigate to a product detail page.
          // In this demo we link back to the catalog challenge.
          href="/c02-catalog-ssg-isr"
          className="rounded-lg border border-gray-200 bg-white p-3 hover:border-indigo-300 hover:shadow-sm transition-all block"
        >
          <p className="font-medium text-sm text-gray-900 truncate">{product.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            ${(product.priceCents / 100).toFixed(2)} · Rating: {product.rating}
          </p>
          <p className="text-xs text-indigo-600 mt-1">
            Link prefetch fires on viewport entry (prod)
          </p>
        </Link>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({
  number,
  title,
  status,
}: {
  number: number;
  title: string;
  status: "checklist" | "todo";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
        {number}
      </span>
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <span
        className={`ml-auto text-xs rounded-full px-2 py-0.5 font-medium ${
          status === "checklist"
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-500"
        }`}
      >
        {status === "checklist" ? "checklist" : "to-do"}
      </span>
    </div>
  );
}

function ChecklistItem({ done, label }: { done?: boolean; label: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <span
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border text-xs flex items-center justify-center ${
          done
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 text-transparent"
        }`}
      >
        {done ? "✓" : " "}
      </span>
      <span className={done ? "text-gray-700" : "text-gray-400"}>{label}</span>
    </label>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-100 bg-gray-50 p-3 animate-pulse h-16"
        />
      ))}
    </div>
  );
}
