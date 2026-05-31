// ─── app/(challenges)/c11-server-actions/page.tsx ────────────────────────
//
// C11 — Server Actions challenge page.
//
// CACHE COMPONENTS PATTERN (Next 16, cacheComponents: true):
//   This page is a STATIC SHELL.  The reviews list reads from the in-memory
//   data layer (which has Math.random() latency — non-deterministic) so it
//   MUST be wrapped in a <Suspense> boundary.  Reads inside Suspense are
//   always safe; the shell prerenders immediately while the hole streams in.
//
//   The review list itself is a 'use cache' function (inside ReviewList) so
//   it is cached between requests and invalidated by revalidateTag in the
//   Server Action.  This is the key teaching: action writes → revalidateTag
//   → next render serves fresh data.
//
// NO route-segment config exports (export const dynamic, revalidate, etc.)
// — those are incompatible with cacheComponents and fail the build.

import { Suspense } from "react";
import { cacheTag, cacheLife } from "next/cache";
import { listReviews, getProductById, tags } from "@/lib/data";
import type { Metadata } from "next";
import ReviewForm from "./_components/ReviewForm";

export const metadata: Metadata = {
  title: "C11 — Server Actions",
};

// The demo product we display reviews for.  We use a fixed id from the seed
// data so the page always has reviews to show without requiring a URL param.
const DEMO_PRODUCT_ID = "p-elec-001";

// ---------------------------------------------------------------------------
// Page (static shell)
// ---------------------------------------------------------------------------

export default function C11ServerActionsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── STATIC SHELL: header ── */}
      <div>
        <p className="text-xs font-mono text-indigo-500 mb-1">c11-server-actions</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Server Actions: Forms That Work Without JavaScript
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Learn how Next.js Server Actions let you mutate data directly from a
          form — no API route, no fetch call, and no JavaScript required for
          the baseline to work.
        </p>
      </div>

      {/* ── STATIC SHELL: concept explainer ── */}
      <ConceptExplainer />

      {/* ── DYNAMIC HOLE: product info + reviews + form ── */}
      {/*
        Everything inside this Suspense reads from lib/data (non-deterministic
        latency).  The Suspense boundary satisfies the cacheComponents rule:
        uncached/dynamic reads must live inside <Suspense>.
      */}
      <Suspense fallback={<ReviewPanelSkeleton />}>
        <ReviewPanel productId={DEMO_PRODUCT_ID} />
      </Suspense>

      {/* ── STATIC SHELL: progressive enhancement explainer ── */}
      <ProgressiveEnhancementExplainer />

      {/* ── STATIC SHELL: useActionState + useFormStatus explainer ── */}
      <HooksExplainer />

      {/* ── STATIC SHELL: Defend-It reminder ── */}
      <section className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Before you read the reference solution:</p>
        <p>
          Fill in{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            app/(challenges)/c11-server-actions/_meta/defend-it.md
          </code>{" "}
          with your answers, commit it, then open{" "}
          <code className="font-mono text-xs bg-amber-100 rounded px-1">
            solutions/c11-server-actions/
          </code>
          .
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DYNAMIC HOLE — ReviewPanel
// ---------------------------------------------------------------------------
// This async Server Component reads the product and cached reviews.
// It lives inside <Suspense> above so cacheComponents is satisfied.

async function ReviewPanel({ productId }: { productId: string }) {
  // Product info: cached with 'use cache' (deterministic after the first call).
  const product = await getCachedProduct(productId);

  // Reviews: cached with 'use cache' + cacheTag so revalidateTag works.
  const reviews = await getCachedReviews(productId);

  if (!product) {
    return (
      <p className="text-red-600 text-sm">
        Demo product not found. Check that seed data is loaded.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product summary */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-mono text-gray-400 mb-1">{product.id}</p>
        <h2 className="font-semibold text-gray-900 text-lg">{product.name}</h2>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </p>
        <p className="text-indigo-600 font-bold mt-2">
          ${(product.priceCents / 100).toFixed(2)}
        </p>
      </section>

      {/* Review list */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No reviews yet. Be the first!
          </p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm font-semibold">
                    {"★".repeat(review.rating)}
                    <span className="text-gray-200">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {review.authorName}
                  </span>
                  <span className="text-xs text-gray-300 ml-auto">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* The review form — where the Server Action lives */}
      <ReviewForm productId={productId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cached data helpers
// ---------------------------------------------------------------------------
// These use 'use cache' at the function level (recommended pattern for
// per-argument caching) so the result is memoised keyed on the argument.
// Using cacheTag enables targeted invalidation via revalidateTag in the action.

async function getCachedProduct(productId: string) {
  "use cache";
  // cacheTag and cacheLife must be called before any await in a 'use cache'
  // function — Next.js reads them synchronously at cache-entry creation time.
  cacheTag(tags.product(productId));
  cacheLife("hours");
  return await getProductById(productId);
}

async function getCachedReviews(productId: string) {
  "use cache";
  // Tag with reviews(productId) — this is what the Server Action revalidates
  // via revalidateTag(tags.reviews(productId)) after a successful submission.
  cacheTag(tags.reviews(productId));
  // No cacheLife here: we want these to be "stale until explicitly
  // invalidated" because the Server Action is the only way reviews change.
  // A short cacheLife would cause unnecessary re-fetches on unrelated requests.
  return await listReviews(productId);
}

// ---------------------------------------------------------------------------
// Static shell sections (no dynamic data — prerender immediately)
// ---------------------------------------------------------------------------

function ConceptExplainer() {
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 space-y-3 text-sm text-indigo-900">
      <h2 className="font-semibold text-base">What is a Server Action?</h2>
      <p>
        A Server Action is a plain <code className="font-mono text-xs bg-indigo-100 rounded px-1">async</code>{" "}
        function marked with{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">&quot;use server&quot;</code>.
        When you pass it to{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">&lt;form action={"{serverAction}"}&gt;</code>,
        Next.js handles the POST automatically — no Route Handler, no{" "}
        <code className="font-mono text-xs bg-indigo-100 rounded px-1">fetch</code> call needed.
      </p>
      <p>
        The function runs <strong>only on the server</strong> and has direct
        access to your data layer, environment variables, and secrets.  The
        client never sees the function body.
      </p>
      <div className="rounded-lg bg-indigo-100 p-3 font-mono text-xs leading-relaxed text-indigo-800 overflow-x-auto">
        <p className="text-indigo-500 mb-1">{`// _lib/actions.ts`}</p>
        <p>{`"use server";`}</p>
        <p className="mt-1">{`export async function submitReview(`}</p>
        <p>{`  prevState: State,`}</p>
        <p>{`  formData: FormData`}</p>
        <p>{`) {`}</p>
        <p>{`  const body = formData.get("body");`}</p>
        <p>{`  await addReview({ ... });`}</p>
        <p>{`  revalidateTag(tags.reviews(productId));`}</p>
        <p>{`}`}</p>
      </div>
    </section>
  );
}

function ProgressiveEnhancementExplainer() {
  return (
    <section className="rounded-xl border border-green-100 bg-green-50 p-5 space-y-3 text-sm text-green-900">
      <h2 className="font-semibold text-base">
        Try it: Disable JavaScript
      </h2>
      <p>
        Open DevTools → Command Menu (⌘+Shift+P or Ctrl+Shift+P) → type{" "}
        <strong>Disable JavaScript</strong> → run it.  Then submit the review
        form below.  You will see a full-page reload — the native browser POST
        is happening — and the new review will appear.
      </p>
      <p>
        This works because Next.js injects a hidden{" "}
        <code className="font-mono text-xs bg-green-100 rounded px-1">$ACTION_ID</code>{" "}
        input into every{" "}
        <code className="font-mono text-xs bg-green-100 rounded px-1">
          &lt;form action={"{serverAction}"}&gt;
        </code>
        . The browser sends a plain multipart POST; Next.js routes it to the
        correct action function server-side and re-renders the page.
      </p>
      <p>
        With JavaScript enabled, React intercepts the submit event, calls the
        action via fetch, and updates only the affected UI — no full-page
        reload needed.  <strong>Same action, two behaviours, zero
        extra code.</strong>
      </p>
    </section>
  );
}

function HooksExplainer() {
  return (
    <section className="rounded-xl border border-purple-100 bg-purple-50 p-5 space-y-4 text-sm text-purple-900">
      <h2 className="font-semibold text-base">useActionState + useFormStatus</h2>

      <div className="space-y-2">
        <h3 className="font-semibold text-purple-800">
          useActionState
        </h3>
        <p>
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            useActionState(action, initialState)
          </code>{" "}
          returns{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            [state, formAction, isPending]
          </code>.
          The action must accept{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            (prevState, formData)
          </code>{" "}
          — React passes the previous return value back in so the action can
          distinguish &quot;first render&quot; from &quot;after a submission&quot;.
        </p>
        <p>
          The return value of the action becomes <code className="font-mono text-xs bg-purple-100 rounded px-1">state</code>{" "}
          on the client — pass errors in it and they appear inline without a
          page reload.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="font-semibold text-purple-800">
          useFormStatus
        </h3>
        <p>
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            useFormStatus()
          </code>{" "}
          returns{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            {"{ pending, data, method, action }"}
          </code>.
          It reads the status of the <strong>closest enclosing</strong>{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">&lt;form&gt;</code>.
        </p>
        <p className="font-medium text-purple-800">
          Why the separate &lt;SubmitButton&gt; component?
        </p>
        <p>
          You <strong>cannot</strong> call{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            useFormStatus()
          </code>{" "}
          in the same component that renders the{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">&lt;form&gt;</code> — the form&apos;s
          React context does not exist yet when the parent renders.  The fix: a
          small{" "}
          <code className="font-mono text-xs bg-purple-100 rounded px-1">
            &lt;SubmitButton&gt;
          </code>{" "}
          component rendered <em>inside</em> the form as a child.
        </p>
      </div>

      <div className="rounded-lg bg-purple-100 p-3 font-mono text-xs leading-relaxed text-purple-800 overflow-x-auto">
        <p className="text-purple-500 mb-1">{`// ReviewForm.tsx ("use client")`}</p>
        <p>{`const [state, formAction] = useActionState(submitReview, initial);`}</p>
        <p className="mt-1">{`return (`}</p>
        <p>{`  <form action={formAction}>`}</p>
        <p>{`    {state.errors.body && <p>{state.errors.body}</p>}`}</p>
        <p>{`    <SubmitButton />  {/* useFormStatus lives here */}`}</p>
        <p>{`  </form>`}</p>
        <p>{`);`}</p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — shown while the Suspense hole loads
// ---------------------------------------------------------------------------

function ReviewPanelSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Product skeleton */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-2">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-5 w-64 bg-gray-100 rounded" />
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-4 w-16 bg-gray-100 rounded mt-2" />
      </div>
      {/* Reviews skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
          <div className="h-3 w-32 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      ))}
      {/* Form skeleton */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-100 rounded" />
        <div className="h-8 w-24 bg-gray-100 rounded" />
        <div className="h-20 w-full bg-gray-100 rounded" />
        <div className="h-9 w-32 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
