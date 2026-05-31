"use client";
// ─── _components/ReconciledList.tsx ───────────────────────────────────────────
//
// This component is the interactive heart of the C19 challenge. It:
//
//  1. Fetches saved items via TanStack Query (polling an internal API route).
//  2. Lets the user save/remove items via Server Actions.
//  3. Shows the DIVERGENCE: after a mutation, the TanStack panel updates but the
//     RSC panel (rendered by the server Suspense hole) does not — until reconciled.
//  4. Provides a RECONCILE button that calls invalidateQueries + router.refresh().
//  5. Uses useCrossTabSync to broadcast invalidations to other open tabs.
//
// RENDERING STRATEGY:
//   This is a "use client" component — it receives the server-rendered RSC items
//   as a prop (initialServerItems) so the server side is visible in the same view.
//   The TanStack panel sits next to it, managed entirely in the browser.
//
// NOTE on the split-panel layout:
//   Left panel = TanStack Query (client cache)
//   Right panel = RSC-rendered items passed as prop from the Suspense hole
//   The right panel only updates when the parent Server Component re-renders
//   (i.e. when router.refresh() is called), showing the server-cache lag.

import { useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCrossTabSync } from "../_lib/sync";
import { saveItem, removeItem } from "../_lib/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Items from the server-side 'use cache' boundary, rendered at request time. */
  initialServerItems: string[];
  /** ISO timestamp of when the server cache was last rendered/revalidated. */
  serverCachedAt: string;
}

// ── Query key (stable constant) ───────────────────────────────────────────────
// Extracting the query key as a const avoids accidental reference inequality
// (an inline ["saved-items"] on every render is a new array — still works with
// TanStack v5 deep equality, but the const makes intent explicit).
const SAVED_ITEMS_QUERY_KEY = ["saved-items"] as const;

// ── API endpoint ──────────────────────────────────────────────────────────────
// TanStack Query needs an async function to fetch data. We use a route handler
// (defined at app/api/c19-saved-items/route.ts) so the client-side fetch goes
// through the Next.js API layer rather than importing server code directly.
async function fetchSavedItems(): Promise<string[]> {
  // Route handler at app/(challenges)/c19-two-sources-of-truth/api/saved-items/route.ts
  // Maps to URL: /c19-two-sources-of-truth/api/saved-items
  const res = await fetch("/c19-two-sources-of-truth/api/saved-items", {
    // No-store: we want TanStack to control freshness, not the browser's
    // HTTP cache. Without this, browser caching could mask TanStack's state.
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch saved items: ${res.status}`);
  return res.json() as Promise<string[]>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ReconciledList({
  initialServerItems,
  serverCachedAt,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // useTransition gives us isPending for the reconcile button without blocking
  // the UI. Both invalidateQueries (sync) and router.refresh() run inside startTransition.
  const [isPending, startTransition] = useTransition();

  // Track cross-tab sync events for display in the UI.
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // ── Cross-tab sync ────────────────────────────────────────────────────────
  const { broadcast } = useCrossTabSync({
    channelName: "c19-saved-items",
    queryKey: SAVED_ITEMS_QUERY_KEY,
    onReceive: (msg) => {
      // Update the "last synced from another tab" indicator.
      setLastSyncAt(msg.mutatedAt);
    },
  });

  // ── TanStack Query ────────────────────────────────────────────────────────
  const {
    data: tqItems,
    isLoading,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: SAVED_ITEMS_QUERY_KEY,
    queryFn: fetchSavedItems,
  });

  // ── Mutation handlers ─────────────────────────────────────────────────────

  // Local state for the "new item" input.
  const [newItemId, setNewItemId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  /**
   * handleSave: calls the Server Action, then:
   *   1. Invalidates the TanStack Query cache (so the TQ panel refetches).
   *   2. Broadcasts a cross-tab sync message to other open tabs.
   *
   * NOTE: we do NOT call router.refresh() here intentionally — that would
   * immediately reconcile the RSC panel and make the divergence invisible.
   * The user sees the divergence first, then uses the RECONCILE button.
   */
  async function handleSave() {
    const id = newItemId.trim();
    if (!id) return;

    setActionError(null);

    const result = await saveItem(id);
    if (!result.success) {
      setActionError(result.error ?? "Save failed");
      return;
    }

    setNewItemId("");

    // Invalidate TanStack cache to show the new item in the TQ panel.
    // The RSC panel will NOT update yet — that is the divergence.
    await queryClient.invalidateQueries({ queryKey: SAVED_ITEMS_QUERY_KEY });

    // Broadcast to other tabs so they also refetch via TanStack Query.
    broadcast();
  }

  /**
   * handleRemove: same pattern as handleSave but for removal.
   * Shows that divergence applies to deletes too — not just adds.
   */
  async function handleRemove(itemId: string) {
    setActionError(null);

    const result = await removeItem(itemId);
    if (!result.success) {
      setActionError(result.error ?? "Remove failed");
      return;
    }

    await queryClient.invalidateQueries({ queryKey: SAVED_ITEMS_QUERY_KEY });
    broadcast();
  }

  /**
   * handleReconcile: the full-stack reconciliation operation.
   *
   * We call BOTH operations simultaneously (not sequentially):
   *   - invalidateQueries: re-fetches from the API route → updates TQ panel.
   *   - router.refresh(): re-requests the RSC route → updates the server panel.
   *
   * Why simultaneously?
   *   Sequential calls would work, but they would cause two separate React
   *   render cycles. Simultaneous calls inside startTransition batch the state
   *   updates and give the user a single visual update.
   *
   * Why startTransition?
   *   router.refresh() is a navigation action; wrapping it in startTransition
   *   marks the update as non-urgent, which prevents it from blocking the UI
   *   and exposes isPending for the button loading state.
   */
  function handleReconcile() {
    startTransition(() => {
      // invalidateQueries is synchronous (it marks queries stale and triggers
      // background refetch) — it can run inside startTransition safely.
      queryClient.invalidateQueries({ queryKey: SAVED_ITEMS_QUERY_KEY });

      // router.refresh() re-fetches the current RSC route and re-renders the
      // Server Components. This is what makes the right panel update.
      router.refresh();
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const tqItemList = tqItems ?? [];
  const tqUpdatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className="space-y-6">
      {/* ── Mutation controls ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Mutation Controls
        </h3>
        <p className="text-xs text-gray-500">
          Use these controls to mutate the saved-items list. After saving,
          observe the{" "}
          <span className="font-semibold text-blue-600">left (TanStack)</span>{" "}
          panel updating immediately, while the{" "}
          <span className="font-semibold text-purple-600">right (Server)</span>{" "}
          panel stays stale — this is the divergence.
        </p>

        <div className="flex gap-2 items-end flex-wrap">
          <label className="flex flex-col gap-1 text-xs text-gray-600 flex-1 min-w-0">
            Item ID to save
            <input
              type="text"
              value={newItemId}
              onChange={(e) => setNewItemId(e.target.value)}
              placeholder="e.g. item-gamma"
              className="rounded border border-gray-300 px-2 py-1.5 text-xs w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </label>
          <button
            onClick={handleSave}
            disabled={!newItemId.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            Save Item
          </button>
        </div>

        {actionError && (
          <p className="text-xs text-red-600">{actionError}</p>
        )}
      </div>

      {/* ── Two-panel divergence view ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Left panel: TanStack Query */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                TanStack Query
              </span>
              {isFetching && (
                <span className="text-xs text-blue-500 animate-pulse">
                  fetching...
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-blue-700 font-mono space-y-0.5">
            <p>Last updated: {tqUpdatedAt}</p>
            <p>Status: {isLoading ? "loading" : isFetching ? "refetching" : "idle"}</p>
          </div>

          {isLoading ? (
            <div className="h-8 bg-blue-100 rounded animate-pulse" />
          ) : tqItemList.length === 0 ? (
            <p className="text-xs text-blue-600 italic">No saved items</p>
          ) : (
            <ul className="space-y-1">
              {tqItemList.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between rounded bg-white border border-blue-100 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono text-gray-800">{item}</span>
                  <button
                    onClick={() => handleRemove(item)}
                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                    aria-label={`Remove ${item}`}
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {lastSyncAt && (
            <p className="text-xs text-blue-500 italic">
              Synced from another tab at{" "}
              {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          )}

          <p className="text-xs text-blue-600">
            Client cache — updates via <code className="font-mono bg-blue-100 rounded px-1">invalidateQueries()</code>
          </p>
        </div>

        {/* Right panel: RSC server-rendered (passed as prop) */}
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-purple-200">
              RSC Server Cache
            </span>
          </div>

          <div className="text-xs text-purple-700 font-mono space-y-0.5">
            <p>Cached at: {new Date(serverCachedAt).toLocaleTimeString()}</p>
            <p>Status: static (stale until router.refresh())</p>
          </div>

          {initialServerItems.length === 0 ? (
            <p className="text-xs text-purple-600 italic">No saved items</p>
          ) : (
            <ul className="space-y-1">
              {initialServerItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center rounded bg-white border border-purple-100 px-3 py-1.5 text-xs"
                >
                  <span className="font-mono text-gray-800">{item}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-purple-600">
            Server cache — updates only via{" "}
            <code className="font-mono bg-purple-100 rounded px-1">router.refresh()</code>
          </p>
        </div>
      </div>

      {/* ── Divergence callout ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-amber-800">
          The Divergence (the two caches disagree)
        </p>
        <p className="text-xs text-amber-700">
          After clicking &quot;Save Item&quot;, the TanStack panel (left) shows the
          new item because the client called{" "}
          <code className="font-mono bg-amber-100 rounded px-1">invalidateQueries()</code>.
          The RSC panel (right) still shows the old data — the{" "}
          <code className="font-mono bg-amber-100 rounded px-1">revalidateTag()</code> call
          in the Server Action marked the server cache stale, but a stale cache
          is only re-executed on the NEXT server render request. Until{" "}
          <code className="font-mono bg-amber-100 rounded px-1">router.refresh()</code> fires,
          the browser is showing HTML that was rendered from the old cache.
        </p>
      </div>

      {/* ── Reconcile button ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-green-800">
          Reconciliation
        </h3>
        <p className="text-xs text-green-700">
          Click the button below to call{" "}
          <code className="font-mono bg-green-100 rounded px-1">
            invalidateQueries()
          </code>{" "}
          +{" "}
          <code className="font-mono bg-green-100 rounded px-1">
            router.refresh()
          </code>{" "}
          simultaneously. Both panels should converge to the same list.
        </p>
        <button
          onClick={handleReconcile}
          disabled={isPending}
          className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {isPending
            ? "Reconciling..."
            : "Reconcile (invalidate + refresh)"}
        </button>
        <p className="text-xs text-green-600 italic">
          Why both? <code className="font-mono bg-green-100 rounded px-1">invalidateQueries</code>{" "}
          updates the client cache; <code className="font-mono bg-green-100 rounded px-1">router.refresh()</code>{" "}
          re-requests the server&apos;s RSC render so the server-cached HTML is also fresh.
          Omitting either leaves one panel stale.
        </p>
      </div>
    </div>
  );
}
