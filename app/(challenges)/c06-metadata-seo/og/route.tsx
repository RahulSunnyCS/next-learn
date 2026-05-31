// ─── app/(challenges)/c06-metadata-seo/og/route.tsx ─────────────────────────
//
// EXPLICIT OG IMAGE ROUTE HANDLER (teaching alternative to opengraph-image.tsx)
//
// This Route Handler produces the same PNG as opengraph-image.tsx but via
// an explicit HTTP GET endpoint at:
//   /challenges/c06-metadata-seo/og?slug=<product-slug>
//
// PURPOSE — WHY BOTH FILES EXIST:
//   The challenge teaches two patterns side-by-side:
//
//   Pattern A — `opengraph-image.tsx` (file convention, recommended):
//     - Lives next to page.tsx in [slug]/opengraph-image.tsx.
//     - Next.js auto-injects the og:image meta tag.
//     - Receives typed `params` prop directly.
//     - Less boilerplate; no manual URL construction needed.
//
//   Pattern B — `og/route.tsx` (explicit Route Handler):
//     - Lives at a fixed path under the challenge.
//     - Accepts a `?slug=` query parameter.
//     - Must be linked manually in generateMetadata if used for og:image.
//     - More flexible (can serve multiple product images from one route).
//     - Required if you need fine-grained control over cache headers.
//
//   In practice you would use ONE pattern, not both.  This file exists only
//   to let learners compare and understand the tradeoffs.
//
// USAGE:
//   GET /challenges/c06-metadata-seo/og?slug=wireless-noise-cancelling-headphones
//
// CACHE COMPONENTS NOTE:
//   Route Handlers are not subject to the PPR / `use cache` rules that govern
//   page.tsx files.  However, we still reuse getCachedProduct() from _lib/seo.ts
//   so the data fetch is cached consistently with the page render.

import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getCachedProduct, formatPrice } from "../_lib/seo";

// Standard OG image dimensions (same as opengraph-image.tsx).
const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  // Validate — slug is required.
  if (!slug || typeof slug !== "string" || slug.trim() === "") {
    return new Response("Missing required query parameter: slug", {
      status: 400,
    });
  }

  // Sanitise — prevent excessively long slugs from being forwarded to
  // the data layer.  Product slugs in this app are kebab-case strings
  // under 120 characters.
  if (slug.length > 200) {
    return new Response("slug parameter too long", { status: 400 });
  }

  const product = await getCachedProduct(slug.trim());

  const name = product?.name ?? "Product Not Found";
  const price = product
    ? formatPrice(product.priceCents, product.currency)
    : "";
  const description = product
    ? product.description.slice(0, 100) + (product.description.length > 100 ? "…" : "")
    : "This product could not be found.";

  return new ImageResponse(
    (
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
        {/* Branding */}
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
            Nextmart · via og/route.tsx
          </div>
        </div>

        {/* Product name */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.1,
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          {name}
        </div>

        {/* Description */}
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

        {/* Price badge */}
        {price && (
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
    { width: WIDTH, height: HEIGHT }
  );
}
