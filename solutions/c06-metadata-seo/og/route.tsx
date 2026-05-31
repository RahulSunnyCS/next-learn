// ─── solutions/c06-metadata-seo/og/route.tsx ─────────────────────────────────
//
// REFERENCE SOLUTION — C06 OG Image Route Handler
//
// This is the annotated reference for the explicit Route Handler pattern.
// See the challenge's og/route.tsx for the implementation.
//
// PATTERN COMPARISON: opengraph-image.tsx vs og/route.tsx
//
//   | Aspect                  | opengraph-image.tsx    | og/route.tsx          |
//   |-------------------------|------------------------|-----------------------|
//   | URL                     | [slug]/opengraph-image | /og?slug=…            |
//   | og:image auto-injection | YES (built-in)         | NO (manual in meta)   |
//   | Typed params prop       | YES                    | NO (read from URL)    |
//   | Boilerplate             | Less                   | More                  |
//   | Flexibility             | One image per segment  | Multiple slugs/types  |
//   | Cache control headers   | Automatic              | Manual                |
//
// WHEN TO USE og/route.tsx:
//   - When you need a single OG endpoint that can serve different image types
//     based on query params (e.g. ?type=product&id=… vs ?type=blog&id=…).
//   - When you need custom Cache-Control headers on the image response.
//   - When the segment structure makes opengraph-image.tsx inconvenient.
//
// IN THIS CHALLENGE:
//   opengraph-image.tsx is the recommended pattern.  og/route.tsx is here
//   only to demonstrate the Route Handler alternative.

export { GET } from "../../app/(challenges)/c06-metadata-seo/og/route";
