// ─── app/(challenges)/c06-metadata-seo/[slug]/opengraph-image.tsx ────────────
//
// DYNAMIC OG IMAGE — file-system metadata convention.
//
// HOW THE FILE CONVENTION WORKS:
//   When Next.js finds a file named `opengraph-image.tsx` inside a route
//   segment it:
//     1. Serves it at `<segment-path>/opengraph-image` (Content-Type: image/png).
//     2. Auto-injects `<meta property="og:image" content="…/opengraph-image">`
//        into the segment's `<head>`.
//   You do NOT manually wire up the route or add it to generateMetadata.
//
// WHY NOT A ROUTE HANDLER (og/route.tsx)?
//   Both work but the file convention is simpler for the common case:
//   less boilerplate, automatic head injection, typed props from Next.js.
//   The separate og/route.tsx in this challenge is kept as a teaching
//   comparison showing how to do the same thing with a Route Handler.
//
// WHY `export const runtime = "edge"`?
//   The @vercel/og library (which Next.js bundles for ImageResponse) runs in
//   the Edge runtime.  Declaring it here avoids the need for Next.js to do
//   a slower Node.js process to generate the image.  Omitting the export
//   still works (falls back to Node runtime) but is less efficient.
//
// CACHE COMPONENTS NOTE:
//   `opengraph-image.tsx` is a special metadata file, not an App Router page
//   component.  The cacheComponents / PPR rules (no `export const dynamic`,
//   etc.) apply to page.tsx and layout.tsx files.  This file follows the
//   metadata image convention and is exempt from that constraint.

import { ImageResponse } from "next/og";
import { getCachedProduct, formatPrice } from "../_lib/seo";

// Use the Edge runtime for efficient image generation.
export const runtime = "edge";

// Image dimensions — 1200×630 is the standard OG image size recommended
// by most social platforms (Facebook, Twitter/X, LinkedIn, Discord).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Await params — required in Next 15+ where params is a Promise.
  const { slug } = await params;

  const product = await getCachedProduct(slug);

  // Fallback content for unknown products.  The og image returns 200 with
  // a "product not found" card rather than 404, because:
  //   a) A social crawl that hits a 404 OG image would fall back to
  //      its own default image, which is acceptable — no error needed.
  //   b) The page.tsx itself calls notFound() for 404 handling.
  const name = product?.name ?? "Product Not Found";
  const price = product
    ? formatPrice(product.priceCents, product.currency)
    : "";
  const description = product?.description
    ? product.description.slice(0, 100) + (product.description.length > 100 ? "…" : "")
    : "This product is not available.";

  return new ImageResponse(
    (
      // The JSX here is rendered by @vercel/og using Satori (a CSS-to-SVG
      // engine) and then converted to PNG.  Only a subset of CSS is
      // supported — flexbox layout, basic typography, borders, backgrounds.
      // No grid, no relative units (use px), no pseudo-elements.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "60px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar — branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "auto",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              color: "#a5b4fc",
              fontWeight: 600,
              letterSpacing: "2px",
              textTransform: "uppercase",
            }}
          >
            Nextmart
          </div>
        </div>

        {/* Product name — main headline */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: "20px",
            // Cap at roughly 2 lines to avoid overflow.
            maxWidth: "900px",
          }}
        >
          {name}
        </div>

        {/* Description — subtitle */}
        <div
          style={{
            fontSize: "26px",
            color: "#c7d2fe",
            lineHeight: 1.4,
            marginBottom: "32px",
            maxWidth: "900px",
          }}
        >
          {description}
        </div>

        {/* Bottom row — price badge */}
        {price && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                background: "#4ade80",
                color: "#14532d",
                padding: "12px 28px",
                borderRadius: "9999px",
                fontSize: "32px",
                fontWeight: 700,
              }}
            >
              {price}
            </div>
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
