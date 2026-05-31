"use client";

// ─── _components/auth-ui.tsx ─────────────────────────────────────────────
//
// Client-side interactive UI components for the C01 auth challenge.
//
// These are Client Components ("use client") because they contain interactive
// form submissions.  The session state itself (what user is logged in) is
// read on the server in page.tsx and passed down as props — Client Components
// never import lib/auth directly (it is server-only).
//
// Components exported:
//   LoginForm       — lets the learner pick a demo user and POST to /c01-auth/login
//   LogoutButton    — POSTs to /c01-auth/logout
//   SessionDisplay  — shows the current session payload (or "No session")
//   InsecureToyExplainer — explains the toy and shows its cookie format

import type { Session } from "@/lib/auth";

// ── Demo users that match the allow-list in login/route.ts ────────────────

const DEMO_USERS = [
  { id: "u1", label: "Alice (buyer)" },
  { id: "u2", label: "Bob (buyer)" },
  { id: "u3", label: "Carol (seller)" },
] as const;

// ── LoginForm ─────────────────────────────────────────────────────────────

/**
 * Simple login form for the demo.
 *
 * Posts to /c01-auth/login (Route Handler) using a native HTML form POST so
 * it works without JavaScript and demonstrates that cookies are handled purely
 * by the HTTP layer.
 */
export function LoginForm() {
  return (
    <form action="/c01-auth/login" method="POST" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="userId" className="text-xs font-medium text-gray-600">
          Demo user
        </label>
        <select
          id="userId"
          name="userId"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          {DEMO_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Log in (secure)
      </button>
    </form>
  );
}

// ── LogoutButton ──────────────────────────────────────────────────────────

/**
 * Logout button — POSTs to /c01-auth/logout.
 *
 * Using POST (not GET) so that a cross-origin GET request (e.g. an <img> tag)
 * cannot log the user out.  sameSite=lax also blocks cross-origin POST, making
 * this a defence-in-depth measure.
 */
export function LogoutButton() {
  return (
    <form action="/c01-auth/logout" method="POST">
      <button
        type="submit"
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
      >
        Log out
      </button>
    </form>
  );
}

// ── SessionDisplay ────────────────────────────────────────────────────────

/**
 * Shows the current session payload or a "no session" message.
 *
 * The session object is passed as a prop from the Server Component parent
 * (page.tsx reads the session on the server via getSession()).  This component
 * never calls getSession() itself — it only displays what the server provided.
 */
export function SessionDisplay({ session }: { session: Session | null }) {
  if (!session) {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-3">
        <p className="text-sm text-gray-500">
          No active session.{" "}
          <span className="text-gray-400">
            (The <code className="font-mono text-xs">nextmart_session</code> cookie
            is absent, expired, or has an invalid signature.)
          </span>
        </p>
      </div>
    );
  }

  const expiresAt = new Date(session.exp * 1000).toLocaleString();
  const issuedAt = new Date(session.iat * 1000).toLocaleString();

  return (
    <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-green-800">
        Logged in as{" "}
        <strong>{session.user.name}</strong>{" "}
        <span className="text-green-600">({session.user.email})</span>
      </p>
      <dl className="text-xs text-green-700 grid grid-cols-2 gap-x-4 gap-y-1">
        <dt className="font-medium">User ID</dt>
        <dd className="font-mono">{session.user.id}</dd>
        <dt className="font-medium">Role</dt>
        <dd className="font-mono">{session.user.role}</dd>
        <dt className="font-medium">Issued at</dt>
        <dd>{issuedAt}</dd>
        <dt className="font-medium">Expires at</dt>
        <dd>{expiresAt}</dd>
      </dl>
      <p className="text-xs text-green-600 mt-1">
        The server verified the HMAC-SHA256 signature before showing this.
        Any modification to the cookie value would have returned null.
      </p>
    </div>
  );
}

// ── InsecureToyExplainer ─────────────────────────────────────────────────

/**
 * Explains the insecure toy session and shows an example of what the
 * base64-encoded cookie looks like and how to forge it.
 *
 * This is purely educational — no actual insecure cookies are set here.
 */
export function InsecureToyExplainer() {
  // A representative example of what the insecure toy would produce.
  const examplePayload = { id: "u1", email: "alice@nextmart.dev", name: "Alice", role: "buyer" };
  const exampleToken = typeof window === "undefined"
    ? "eyJpZCI6InUxIiwiZW1haWwiOiJhbGljZUBuZXh0bWFydC5kZXYiLCJuYW1lIjoiQWxpY2UiLCJyb2xlIjoiYnV5ZXIifQ=="
    : btoa(JSON.stringify(examplePayload));

  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-300">
          Insecure Toy
        </span>
        <h2 className="font-semibold text-red-900">The Broken Baseline</h2>
      </div>

      <p className="text-sm text-red-800">
        The toy in{" "}
        <code className="font-mono text-xs bg-red-100 rounded px-1">
          solutions/c01-auth/insecure/session.ts
        </code>{" "}
        just base64-encodes the user object. It is{" "}
        <strong>not signed</strong>, has <strong>no expiry</strong>, and
        anyone who can write a cookie can become any user.
      </p>

      {/* Show what the token looks like */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-red-700">
          Example toy cookie value (for user Alice):
        </p>
        <pre className="text-xs font-mono bg-white border border-red-200 rounded p-3 overflow-x-auto text-red-800 break-all whitespace-pre-wrap">
          {exampleToken}
        </pre>
        <p className="text-xs text-red-700">
          Decode it in the browser console:{" "}
          <code className="font-mono bg-red-100 rounded px-1">
            JSON.parse(atob(&quot;{exampleToken.slice(0, 20)}...&quot;))
          </code>
        </p>
      </div>

      {/* Attack steps */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-red-700">Attack: change role to seller</p>
        <ol className="text-xs text-red-700 space-y-1 list-decimal list-inside">
          <li>
            Open DevTools → Application → Cookies → localhost:3000
          </li>
          <li>
            Find <code className="font-mono bg-red-100 rounded px-1">nextmart_insecure_session</code> (if
            the toy were running) and copy its value
          </li>
          <li>
            In the Console: <code className="font-mono bg-red-100 rounded px-1">
              obj = JSON.parse(atob(value))
            </code>
          </li>
          <li>
            Mutate: <code className="font-mono bg-red-100 rounded px-1">
              obj.role = &quot;seller&quot;; obj.email = &quot;attacker@evil.com&quot;
            </code>
          </li>
          <li>
            Re-encode: <code className="font-mono bg-red-100 rounded px-1">
              newToken = btoa(JSON.stringify(obj))
            </code>
          </li>
          <li>
            Paste <code className="font-mono bg-red-100 rounded px-1">newToken</code> back
            as the cookie value and reload — you are now a seller
          </li>
        </ol>
      </div>

      <div className="rounded-md bg-red-100 border border-red-300 px-3 py-2 text-xs text-red-800">
        <strong>TEACHING TOY — NEVER SHIP.</strong> This pattern (base64 cookie, no
        signature, no expiry) is included only to demonstrate why these
        defences are necessary. The insecure code lives solely under{" "}
        <code className="font-mono">solutions/c01-auth/insecure/</code> and
        is never imported by a live route.
      </div>
    </section>
  );
}
