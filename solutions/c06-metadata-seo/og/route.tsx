// ─── solutions/c06-metadata-seo/og/route.tsx ─────────────────────────────────
//
// REFERENCE SOLUTION — C06 OG Image Route Handler (explicit pattern)
//
// This annotated file explains the Route Handler alternative to the
// opengraph-image.tsx file convention.  The actual running implementation
// is at app/(challenges)/c06-metadata-seo/og/route.tsx.
//
// PATTERN COMPARISON: opengraph-image.tsx vs og/route.tsx
//
//   | Feature                 | opengraph-image.tsx    | og/route.tsx          |
//   |-------------------------|------------------------|-----------------------|
//   | URL                     | [slug]/opengraph-image | /og?slug=…            |
//   | og:image auto-injection | YES                    | NO — add in metadata  |
//   | Typed params prop       | YES                    | NO — read from URL    |
//   | Boilerplate             | Minimal                | More                  |
//   | Multiple image types    | No                     | Yes                   |
//   | Custom Cache-Control    | Automatic              | Manual                |
//
// WHEN TO USE og/route.tsx INSTEAD OF opengraph-image.tsx:
//   - You need one endpoint that can serve different image types based on
//     query params (e.g. ?type=product&id=… vs ?type=blog&id=…).
//   - You need custom Cache-Control headers on the image response.
//   - The segment structure makes opengraph-image.tsx inconvenient.
//
// IN THIS CHALLENGE:
//   opengraph-image.tsx is the recommended approach.  The og/route.tsx file
//   exists solely to demonstrate the Route Handler alternative.
//
// SEE: app/(challenges)/c06-metadata-seo/og/route.tsx for the implementation.
//      solutions/c06-metadata-seo/NOTES.md for full explanation.

// This file is intentionally annotation-only.
// The implementation lives at:
//   @/app/(challenges)/c06-metadata-seo/og/route.tsx
export {};
