// ─── app/(challenges)/c12-action-security/page.tsx ───────────────────────────
//
// C12 — Server Action Security challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a STATIC SHELL.  All dynamic/uncached reads — getSession()
//   (reads the session cookie) and listReviews() (calls Math.random() via
//   the delay() helper) — are wrapped in <Suspense> boundaries so the static
//   shell prerenders immediately and the dynamic holes stream in.
//
//   NO `export const dynamic` — under cacheComponents that directive is
//   disallowed.  Dynamic is the default; you opt INTO caching with 'use cache'.

import { Suspense } from "react";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { listReviews } from "@/lib/data";
import type { Review } from "@/lib/data";
import { EditReviewForm } from "./_components/EditReviewForm";

export const metadata: Metadata = {
  title: "C12 — Server Action Security",
};

export default function C12ActionSecurityPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c12-action-security</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Server Action Security: Break It, Then Harden It
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Next.js Server Actions compile to public POST endpoints that anyone
          can call directly — bypassing the React UI entirely.  This challenge
          shows a deliberately insecure action (no auth, no authz, no validation)
          and the hardened version that fixes all four threat vectors.
        </p>
      </div>

      {/* ── STATIC SHELL: key insight callout ── */}
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-2">
        <p className="font-semibold text-amber-900 text-sm">Key insight</p>
        <p className="text-amber-800 text-sm leading-relaxed">
          A Server Action marked <code className="font-mono text-xs bg-amber-100 rounded px-1">&quot;use server&quot;</code>{" "}
          is not a private function — it is an HTTP endpoint.  Any attacker with
          the action ID can POST to it directly with{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">curl</code> or{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">fetch()</code>.
          The React UI is just a convenience wrapper, not a security boundary.
        </p>
      </section>

      {/* ── DYNAMIC HOLE: session state + review form ── */}
      <Suspense fallback={<ReviewPanelSkeleton />}>
        <ReviewPanel />
      </Suspense>

      {/* ── STATIC SHELL: threat model summary ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Threat Model: Four Gaps, Four Defenses</h2>
        <div className="space-y-3 text-sm">
          <ThreatRow
            id="T1"
            label="Missing Authentication"
            color="red"
            attack="Any HTTP client (no session cookie) can call the action and mutate data."
            defense="getSession() — reject immediately with &quot;Unauthorized&quot; if null."
          />
          <ThreatRow
            id="T2"
            label="Missing Authorization / IDOR"
            color="red"
            attack="An authenticated user passes another user&apos;s reviewId to edit their data."
            defense="Ownership check: review.userId === session.user.id — reject with &quot;Forbidden&quot;."
          />
          <ThreatRow
            id="T3"
            label="Missing Input Validation"
            color="orange"
            attack="rating: 999 corrupts product averages.  A 10MB body floods server memory."
            defense="Zod schema: rating 1–5 integer, body 1–2000 chars — parse before any write."
          />
          <ThreatRow
            id="T4"
            label="CSRF / Origin"
            color="yellow"
            attack="A cross-origin page tricks the victim&apos;s browser into calling the action."
            defense="Next.js built-in Origin check.  Note: this does NOT replace T1 or T2."
          />
        </div>
      </section>

      {/* ── STATIC SHELL: insecure example explainer ── */}
      <section className="rounded-xl border border-red-100 bg-red-50 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 ring-1 ring-red-200">
            INSECURE
          </span>
          <h2 className="font-semibold text-red-900">The Broken Action</h2>
        </div>
        <p className="text-sm text-red-800 leading-relaxed">
          <code className="font-mono text-xs bg-red-100 rounded px-1">
            solutions/c12-action-security/insecure/actions.ts
          </code>{" "}
          shows the broken version — no auth, no authz, no validation.
          Read it and the accompanying README before working through the
          hardened version.  This file is <strong>never imported</strong> by
          the live application.
        </p>
        <p className="text-xs text-red-700 italic">
          The insecure code lives only under solutions/ — it is a teaching
          artefact, not a running endpoint.
        </p>
      </section>

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-800">
        <p className="font-medium mb-1">Before you open the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            app/(challenges)/c12-action-security/_meta/defend-it.md
          </code>{" "}
          with your own answers and commit it.  Then open{" "}
          <code className="font-mono text-xs bg-indigo-100 rounded px-1">
            solutions/c12-action-security/
          </code>.
        </p>
      </section>
    </div>
  );
}

// ── Static helper: ThreatRow ──────────────────────────────────────────────────

// Color classes are hardcoded strings (not template literals) so Tailwind's
// static analysis can extract them at build time.
const colorMap = {
  red:    { border: "border-red-200",    bg: "bg-red-50",    badge: "bg-red-100 text-red-800",    text: "text-red-900"    },
  orange: { border: "border-orange-200", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800", text: "text-orange-900" },
  yellow: { border: "border-yellow-200", bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", text: "text-yellow-900" },
} as const;

function ThreatRow({
  id,
  label,
  color,
  attack,
  defense,
}: {
  id: string;
  label: string;
  color: keyof typeof colorMap;
  attack: string;
  defense: string;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3 space-y-1`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-mono font-semibold rounded px-1.5 py-0.5 ${c.badge}`}>{id}</span>
        <span className={`font-semibold text-sm ${c.text}`}>{label}</span>
      </div>
      <p className="text-xs text-gray-700">
        <span className="font-medium">Attack: </span>{attack}
      </p>
      <p className="text-xs text-gray-700">
        <span className="font-medium">Defense: </span>{defense}
      </p>
    </div>
  );
}

// ── Dynamic hole: ReviewPanel ─────────────────────────────────────────────────
//
// Reads both the session cookie (dynamic, per-request) and reviews (uses
// Math.random() latency — non-deterministic, uncacheable without 'use cache').
// Must run inside <Suspense> — see cache-components-rules.md rule 2.

async function ReviewPanel() {
  // getSession() reads cookies() — a dynamic per-request API.
  const session = await getSession();

  // listReviews uses delay() which calls Math.random() — non-deterministic.
  // We fetch reviews for the headphones product (has seed data from buyer-1
  // and buyer-2 so we can demonstrate ownership boundaries).
  const reviews = await listReviews("p-elec-001");

  if (!session) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
            No session
          </span>
          <h2 className="font-semibold text-gray-900">Edit Review Demo</h2>
        </div>
        <p className="text-sm text-gray-600">
          Log in at{" "}
          <a href="/c01-auth" className="text-indigo-600 underline underline-offset-2">
            /c01-auth
          </a>{" "}
          first, then return here.  You will only be able to edit reviews you
          own (try manipulating the hidden reviewId field in DevTools to trigger
          the Forbidden response).
        </p>
        <p className="text-sm text-gray-500">
          Tip: try calling the action without a session cookie from the Network
          tab or curl — the action will return{" "}
          <code className="font-mono text-xs bg-gray-100 rounded px-1">{'"Unauthorized"'}</code>.
        </p>
      </section>
    );
  }

  // Filter to reviews owned by the current user so the form defaults make sense.
  const myReviews = reviews.filter((r) => r.userId === session.user.id);
  const othersReviews = reviews.filter((r) => r.userId !== session.user.id);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-200">
          Authenticated
        </span>
        <h2 className="font-semibold text-gray-900">Edit Review Demo</h2>
        <span className="text-xs text-gray-500">
          — logged in as {session.user.name} ({session.user.email})
        </span>
      </div>

      {/* Own reviews — editing these succeeds */}
      {myReviews.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">
            Your reviews — editing these succeeds:
          </p>
          {myReviews.map((review) => (
            <ReviewEditCard
              key={review.id}
              review={review}
              isOwn={true}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          No reviews for this product belong to your account ({session.user.id}).
          Seed data has reviews from u-buyer-1 and u-buyer-2.  Log in as one of
          those users at /c01-auth.
        </p>
      )}

      {/* Others' reviews — editing these triggers Forbidden */}
      {othersReviews.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700">
            Other users&apos; reviews — try editing with DevTools (change the hidden reviewId):
          </p>
          {othersReviews.slice(0, 2).map((review) => (
            <ReviewEditCard
              key={review.id}
              review={review}
              isOwn={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── ReviewEditCard ────────────────────────────────────────────────────────────
//
// Renders a review with an edit form if the caller owns it,
// or a read-only view with a note if they do not.

function ReviewEditCard({ review, isOwn }: { review: Review; isOwn: boolean }) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 ${isOwn ? "border-indigo-100 bg-indigo-50" : "border-gray-100 bg-gray-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-gray-900">{review.authorName}</span>
          <span className="text-xs text-gray-500 ml-2">
            review ID: <code className="font-mono bg-white rounded px-1">{review.id}</code>
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-sm ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`}
            >
              ★
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-700">{review.body}</p>
      {isOwn ? (
        <EditReviewForm review={review} />
      ) : (
        <p className="text-xs text-gray-500 italic">
          This review belongs to another user.  The hardened action will return{" "}
          <code className="font-mono bg-gray-200 rounded px-1">Forbidden</code> if you
          try to edit it — even if you are authenticated.
        </p>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ReviewPanelSkeleton() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <div className="h-5 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="h-24 bg-gray-50 rounded animate-pulse" />
      <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
    </section>
  );
}
