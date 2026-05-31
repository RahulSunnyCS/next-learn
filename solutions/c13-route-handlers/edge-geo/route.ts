// ─── solutions/c13-route-handlers/edge-geo/route.ts ─────────────────────
//
// REFERENCE SOLUTION — Edge-runtime Route Handler
//
// This is the annotated reference for Part B of the C13 challenge.
// The production implementation lives at:
//   app/(challenges)/c13-route-handlers/edge-geo/route.ts
//
// Extra teaching content added here:
//   1. Comparison of Web Crypto vs Node crypto for the same operation.
//   2. When you would choose Edge vs Node for a route handler.
//   3. How geolocation injection works on different platforms.

export const runtime = "edge";

// ── Web Crypto vs Node crypto: the same HMAC, two APIs ───────────────────
//
// Suppose you want to sign a string with HMAC-SHA256.
//
// NODE RUNTIME (Node crypto module):
//
//   import { createHmac } from 'crypto';            // NOT available at Edge
//   const sig = createHmac('sha256', secret)
//     .update(data)
//     .digest('hex');                               // synchronous
//
// EDGE RUNTIME (Web Crypto SubtleCrypto):
//
//   const enc = new TextEncoder();
//   const key = await crypto.subtle.importKey(
//     'raw', enc.encode(secret),
//     { name: 'HMAC', hash: 'SHA-256' },
//     false, ['sign']
//   );
//   const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
//   const sigHex = Array.from(new Uint8Array(sigBuffer))
//     .map(b => b.toString(16).padStart(2, '0')).join('');  // no Buffer
//
// Key differences:
//   - Web Crypto is ASYNC (importKey, sign, verify all return Promises).
//   - Web Crypto uses CryptoKey objects; Node crypto uses raw strings.
//   - No Buffer at Edge: convert Uint8Array to hex/base64 with Array.from().
//   - The jose library (used by lib/auth) abstracts this — it uses Web Crypto
//     internally when running at Edge, which is why it works in both runtimes.

// ── When to choose Edge vs Node ──────────────────────────────────────────
//
// USE EDGE when ALL of these are true:
//   ✓ Low latency is critical (auth checks, redirects, feature flags)
//   ✓ The handler logic uses only Web APIs (no Node built-ins needed)
//   ✓ The npm packages you import have Edge-compatible builds
//   ✓ Bundle size is manageable (<4MB on Vercel free tier, <250MB pro)
//   ✓ Cold start time matters (Edge: <1ms vs Node Lambda: 100–500ms)
//
// USE NODE when ANY of these apply:
//   ✓ You need Node built-ins: fs, Buffer, child_process, net, zlib
//   ✓ You use npm packages that depend on Node built-ins (many do)
//   ✓ CPU-intensive computation (image processing, CSV parsing, ML inference)
//   ✓ Long-running operations (Edge has a ~30s wall-clock limit)
//   ✓ The handler is not latency-sensitive (e.g. background processing)
//
// PRACTICAL RULE: default to Node runtime for Route Handlers. Switch to Edge
// only when you have a specific requirement (global distribution, latency SLA)
// and have verified your dependency tree is Edge-compatible.

// ── Geolocation: how CDN injection works ─────────────────────────────────
//
// When a user makes a request to a CDN edge node (Vercel, Cloudflare, Fastly),
// the CDN looks up the requester's IP address in a geoIP database and injects
// metadata headers before forwarding the request to your Edge function.
//
// This is NOT the browser Geolocation API (which asks the user for permission).
// It is IP-based geolocation — accurate to city level for most IPs, but:
//   - VPN/proxy users will show the VPN exit node's location.
//   - IPv6 GeoIP databases are less complete than IPv4.
//   - Corporate networks behind a single egress IP appear as one location.
//
// The injection happens transparently — your Edge function receives the
// headers as if the user sent them. In local development, no CDN is involved,
// so the headers are absent.
//
// Security consideration: because these headers are injected by the CDN
// BEFORE your function, they cannot be forged by the end user (the CDN
// strips any x-vercel-ip-* headers the user attempts to send and injects
// its own values). However, if you are not running behind Vercel (or your
// configured CDN), an attacker could inject arbitrary values. Never trust
// these headers without knowing they come from a trustworthy CDN.

import { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const h = request.headers;

  // Platform detection
  const isVercel = h.has("x-vercel-ip-country");
  const isCloudflare = h.has("cf-ipcountry");

  const country = isVercel
    ? h.get("x-vercel-ip-country")
    : isCloudflare
    ? h.get("cf-ipcountry")
    : null;

  const city = isVercel
    ? (() => {
        const raw = h.get("x-vercel-ip-city");
        if (!raw) return null;
        try { return decodeURIComponent(raw); } catch { return raw; }
      })()
    : null;

  const locale =
    h.get("accept-language")?.split(",")[0]?.trim().split(";")[0]?.trim() ?? null;

  // Demonstrate Web Crypto (available at Edge, NOT using Node Buffer)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const demoToken = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Demonstrate SubtleCrypto HMAC (async, Web Crypto standard)
  // This shows the alternative to Node's createHmac() at Edge.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("demo-edge-key"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode("hello"));
  const hmacHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new Response(
    JSON.stringify({
      country,
      city,
      locale,
      source: isVercel ? "vercel" : isCloudflare ? "cloudflare" : "local",
      runtime: "edge",
      demoToken,
      demoHmac: hmacHex,
      // Note: demoHmac is deterministic (same key + message) — in production
      // you would sign something meaningful (e.g. a request fingerprint).
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }
  );
}
