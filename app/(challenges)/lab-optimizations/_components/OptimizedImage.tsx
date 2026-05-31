// ─── OptimizedImage.tsx ───────────────────────────────────────────────────
//
// Demonstrates next/image best practices for CLS prevention.
//
// WHAT IS CLS (Cumulative Layout Shift)?
//   CLS measures how much the page layout moves unexpectedly during load.
//   A score above 0.1 (Google's "Good" threshold) harms Core Web Vitals and
//   user experience.  The classic CLS trigger: an <img> without width/height
//   attributes — the browser allocates no space until the image arrives, then
//   the content below it jumps down.
//
// HOW next/image SOLVES THIS:
//   Case 1 — Static import:  import img from './assets/hero.jpg'
//     Next.js reads the image dimensions at build time from the file itself and
//     injects them automatically.  Zero developer effort, zero CLS.
//
//   Case 2 — Remote URL or dynamic path:
//     You must supply explicit width/height so the browser can reserve space
//     before the image loads.  Also use `sizes` to let the browser pick the
//     right srcset variant, and `priority` on above-the-fold / LCP images to
//     start fetching early (avoids a render-blocking waterfall).
//
//   Case 3 — blur placeholder:
//     For remote images: set `placeholder="blur"` + `blurDataURL="data:..."`.
//     For static imports: set `placeholder="blur"` — blurDataURL is generated
//     automatically.  A blurred preview fills the reserved space while the
//     real image loads, which removes the white-flash of empty space.
//
// This file is a SERVER COMPONENT (no "use client" directive).
// next/image works fully on the server — no client JS required for the <img>
// element itself.

import Image from "next/image";

// ── Static imports ────────────────────────────────────────────────────────
// Importing SVG/PNG/JPEG files directly gives next/image the dimensions at
// build time — no layout shift possible because the browser already knows how
// much space to reserve.
import heroShoe from "./assets/hero-shoe.svg";
import productBadge from "./assets/product-badge.svg";

// ─────────────────────────────────────────────────────────────────────────────
// WRONG WAY demo — illustrates what causes CLS
// ─────────────────────────────────────────────────────────────────────────────

/** Shows the anti-pattern: a remote image with no dimensions provided.
 *  In dev mode Next.js will throw a console error about missing width/height
 *  and fill=... to make the demo run without crashing.  In a real app
 *  omitting width + height on a non-fill image is a build error. */
export function WrongWayImage() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-red-600 bg-red-50 rounded px-2 py-1 inline-block">
        WRONG — remote image, no width/height, no sizes
      </p>
      {/* fill + a sized container is the closest we can get in code that
          still compiles.  In real legacy code you'd see a plain <img src="...">
          or a next/image with neither fill nor explicit width/height — that
          throws a build error in v16, so we show the educational pattern here.
          The key teaching point: without space reservation, content below jumps. */}
      <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-red-300">
        <Image
          src="https://picsum.photos/seed/cls-wrong/800/600"
          alt="Remote image loaded without proper sizing hints"
          fill
          // No sizes prop — browser downloads the largest srcset variant
          // even on a mobile device.  Wastes bandwidth and slows LCP.
          className="object-cover"
          // No priority — even if this were the LCP image it would not be
          // preloaded, adding extra latency.
        />
      </div>
      <ul className="text-xs text-red-700 space-y-0.5 list-disc list-inside">
        <li>No <code className="font-mono bg-red-50 rounded px-0.5">width</code>/<code className="font-mono bg-red-50 rounded px-0.5">height</code> → browser cannot reserve space → CLS</li>
        <li>No <code className="font-mono bg-red-50 rounded px-0.5">sizes</code> prop → browser may download a 2x larger variant than needed</li>
        <li>No <code className="font-mono bg-red-50 rounded px-0.5">priority</code> → LCP image not preloaded → slower perceived load</li>
        <li>No <code className="font-mono bg-red-50 rounded px-0.5">placeholder</code> → white void while loading → jarring experience</li>
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT WAY #1 — static import (preferred)
// ─────────────────────────────────────────────────────────────────────────────

/** Static import — dimensions known at build time, zero CLS.
 *  The blurDataURL is auto-generated from the image for a smooth placeholder. */
export function StaticImportImage() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-green-600 bg-green-50 rounded px-2 py-1 inline-block">
        RIGHT — static import (auto width/height from file)
      </p>
      {/* heroShoe is a StaticImageData object: { src, width, height, blurDataURL }
          next/image reads width/height from it automatically — no CLS. */}
      <Image
        src={heroShoe}
        alt="AirMax Pro sneaker illustration"
        // width and height come from the import — no need to supply them manually
        className="rounded-lg shadow w-full max-w-sm"
        // priority: this is the first image on the page and likely the LCP
        // element — telling next/image to add a <link rel="preload"> in <head>
        // means the browser fetches it before it discovers the <img> tag.
        priority
        // placeholder="blur" works automatically with static imports because
        // blurDataURL is pre-computed by Next.js from the image content.
        placeholder="blur"
      />
      <ul className="text-xs text-green-700 space-y-0.5 list-disc list-inside">
        <li>Static import → width/height extracted at build → no CLS</li>
        <li><code className="font-mono bg-green-50 rounded px-0.5">priority</code> → <code className="font-mono bg-green-50 rounded px-0.5">&lt;link rel=&quot;preload&quot;&gt;</code> in &lt;head&gt; → faster LCP</li>
        <li><code className="font-mono bg-green-50 rounded px-0.5">placeholder=&quot;blur&quot;</code> → smooth fade-in, no white void</li>
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT WAY #2 — static import, smaller badge image
// ─────────────────────────────────────────────────────────────────────────────

/** Second static-import example — a smaller badge image. */
export function BadgeImage() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-green-600 bg-green-50 rounded px-2 py-1 inline-block">
        RIGHT — static import, smaller image
      </p>
      <Image
        src={productBadge}
        alt="Top Pick award badge"
        className="rounded shadow"
        placeholder="blur"
      />
      <p className="text-xs text-green-700">
        Same pattern — static import auto-supplies 200×200 dimensions.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIGHT WAY #3 — remote image with explicit width/height + sizes
// ─────────────────────────────────────────────────────────────────────────────

/** Remote image from picsum.photos (already allowed in remotePatterns). */
export function RemoteImageWithSizes() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-mono text-blue-600 bg-blue-50 rounded px-2 py-1 inline-block">
        RIGHT — remote image with explicit width + height + sizes
      </p>
      <Image
        src="https://picsum.photos/seed/nextmart-hero/800/600"
        alt="Remote product image with correct sizing"
        width={800}
        height={600}
        // sizes tells the browser: on ≤768px screens use 100vw, otherwise 50vw.
        // This lets next/image serve the correct srcset variant for each
        // viewport — mobile gets a small file, desktop gets a larger one.
        sizes="(max-width: 768px) 100vw, 50vw"
        className="rounded-lg shadow w-full max-w-sm"
        // blurDataURL required when placeholder="blur" on a remote image.
        // This 10px wide base64 data URI is a tiny placeholder that matches the
        // image's dominant colour.  In a real app you'd generate this with a
        // tool like `plaiceholder` or store it alongside the image record.
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAKABABAREA/8QAFgABAQEAAAAAAAAAAAAAAAAAAAYH/8QAGxABAAICAwAAAAAAAAAAAAAAAAECAxETIf/aAAgBAQAAPwDWl5dpLDRsrdPmQIvDFarDj//Z"
      />
      <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
        <li>Explicit <code className="font-mono bg-blue-50 rounded px-0.5">width={800} height={600}</code> → browser reserves exact space</li>
        <li><code className="font-mono bg-blue-50 rounded px-0.5">sizes</code> → correct srcset variant per viewport → saves bandwidth</li>
        <li><code className="font-mono bg-blue-50 rounded px-0.5">blurDataURL</code> required for remote placeholder</li>
      </ul>
    </div>
  );
}
