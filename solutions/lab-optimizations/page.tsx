// ─── solutions/lab-optimizations/page.tsx ────────────────────────────────
//
// Reference solution for the Built-in Optimizations lab.
//
// This file is the production-ready version of every pattern demonstrated in
// the lab.  Compare it to the lab page to see the difference between a
// teaching scaffold and a clean implementation.

import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";

// Static image imports — dimensions extracted at build time (zero CLS).
// Using @/ alias (maps to repo root) so the import resolves correctly
// regardless of where this solutions file sits relative to app/.
import heroShoe from "@/app/(challenges)/lab-optimizations/_components/assets/hero-shoe.svg";

export const metadata: Metadata = {
  title: "Solution — Built-in Optimizations",
};

// ── next/dynamic (code splitting) ────────────────────────────────────────
// At module level so the split decision is made at build time.
const HeavyChart = dynamic(
  () =>
    import(
      "@/app/(challenges)/lab-optimizations/_components/HeavyAnalyticsChart"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-40 bg-gray-50 rounded-lg border" />
    ),
  }
);

export default function SolutionPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-8">
      <div>
        <p className="text-xs font-mono text-indigo-400 mb-1">
          solutions/lab-optimizations
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Reference Solution — Built-in Optimizations
        </h1>
        <p className="text-sm text-gray-500">
          Production-ready patterns for all five optimizations.  See NOTES.md
          for the design decisions behind each choice.
        </p>
      </div>

      {/* 1. next/image — static import, priority, blur placeholder */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-800">1. next/image (static import)</h2>
        <Image
          src={heroShoe}
          alt="AirMax Pro — LCP image"
          priority
          placeholder="blur"
          className="rounded-lg w-full max-w-sm"
        />
      </section>

      {/* 2. next/font — applied via CSS variable from layout (see layout.tsx
           in the challenge folder) */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">2. next/font</h2>
        <p
          className="text-lg text-indigo-900"
          style={{ fontFamily: "var(--font-lab, system-ui)" }}
        >
          Self-hosted Inter via next/font/google — no Google Fonts request.
        </p>
      </section>

      {/* 3. next/script — afterInteractive + lazyOnload */}
      {/* (ScriptDemo is a client component — imported from the shared _components
          folder.  In a production scenario you'd import it here.) */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">3. next/script</h2>
        <p className="text-sm text-gray-600">
          See <code className="font-mono text-xs bg-gray-100 rounded px-1">
            _components/ScriptDemo.tsx
          </code> for the full implementation.
          Strategies: afterInteractive (analytics) and lazyOnload (chat widgets).
        </p>
      </section>

      {/* 4. <Link> prefetch */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">4. Link prefetch</h2>
        <div className="flex gap-3">
          {/* Default: prefetch on viewport entry (production only) */}
          <Link
            href="/c01-auth"
            className="rounded-md bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-sm text-indigo-800 hover:bg-indigo-100"
          >
            C01 Auth (default prefetch)
          </Link>
          {/* Disabled: use for low-probability or expensive routes */}
          <Link
            href="/c02-catalog-ssg-isr"
            prefetch={false}
            className="rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            C02 Catalog (prefetch=false)
          </Link>
        </div>
      </section>

      {/* 5. next/dynamic — separate chunk, ssr: false */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">5. next/dynamic (code splitting)</h2>
        <HeavyChart />
      </section>

      {/* Catalog data — inside Suspense (Cache Components rule) */}
      <section className="space-y-2">
        <h2 className="font-semibold text-gray-800">Cached catalog data</h2>
        <Suspense
          fallback={
            <div className="h-16 bg-gray-50 rounded animate-pulse" />
          }
        >
          <CatalogData />
        </Suspense>
      </section>
    </div>
  );
}

// Dynamic hole — catalog data via 'use cache' function (inside Suspense)
async function CatalogData() {
  // Import the cached helper — safe inside Suspense.
  // Static import (not dynamic) is fine here; the function is async and
  // the module is server-only, so no client bundle impact.
  const { getFeaturedProducts } = await import(
    "@/app/(challenges)/lab-optimizations/_lib/catalog"
  );
  const products = await getFeaturedProducts();

  return (
    <ul className="text-sm space-y-1">
      {products.map((p: { id: string; name: string; priceCents: number }) => (
        <li key={p.id} className="text-gray-700">
          {p.name} — ${(p.priceCents / 100).toFixed(2)}
        </li>
      ))}
    </ul>
  );
}
