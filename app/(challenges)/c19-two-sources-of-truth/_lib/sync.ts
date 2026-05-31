"use client";
// ─── _lib/sync.ts — Cross-Tab Sync Hook ───────────────────────────────────────
//
// This module provides useCrossTabSync: a React hook that uses BroadcastChannel
// (with a localStorage storage-event fallback) to propagate TanStack Query
// invalidations across browser tabs.
//
// WHY BroadcastChannel:
//   BroadcastChannel is a browser API that lets scripts on the same origin
//   post messages to all other tabs/windows running the same page. It is more
//   explicit than localStorage events: you create a named channel, post a
//   structured message, and all other subscribers receive it. The tab that
//   posts does NOT receive its own message (by design) — so there is no need
//   to filter self-messages.
//
// WHY a localStorage fallback:
//   BroadcastChannel messages do not cross the incognito/normal boundary in
//   Safari, and there are edge cases in older Chromium builds too. The storage
//   event fires on OTHER tabs when localStorage is written — which is exactly
//   what we need as a fallback. We write a small sentinel key and clean it up
//   immediately after posting.
//
// SCOPE: cross-tab sync within the same origin + browser profile only.
//   A different machine, a different user, or an incognito window are all
//   invisible to this mechanism. For those cases you need a server-push
//   mechanism (WebSockets, SSE, polling).

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────────────────────────

/** The structured message payload sent over the BroadcastChannel. */
export interface SyncMessage {
  type: "invalidate";
  /** The TanStack Query key to invalidate in the receiving tab. */
  queryKey: readonly unknown[];
  /** ISO-8601 timestamp — lets the receiver log when the mutation happened. */
  mutatedAt: string;
}

/** Options for useCrossTabSync. */
export interface CrossTabSyncOptions {
  /**
   * The BroadcastChannel channel name. Should be unique per logical data type.
   * Example: "c19-saved-items"
   */
  channelName: string;
  /**
   * The TanStack Query key to invalidate when a sync message arrives.
   * Should match the queryKey used in useQuery for the same data.
   */
  queryKey: readonly unknown[];
  /**
   * Optional: called after a cross-tab invalidation fires, so the component
   * can show a "updated from another tab" indicator if desired.
   */
  onReceive?: (msg: SyncMessage) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useCrossTabSync — subscribes to cross-tab invalidation events.
 *
 * Mount this hook in any client component that holds TanStack Query data
 * which should stay in sync across multiple open tabs.
 *
 * Returns a `broadcast` function that you call AFTER a successful mutation
 * to notify other tabs.
 *
 * Example usage:
 *
 *   const { broadcast } = useCrossTabSync({
 *     channelName: "c19-saved-items",
 *     queryKey: ["saved-items"],
 *   });
 *
 *   // After mutation resolves:
 *   await saveSavedItem(itemId);
 *   broadcast();
 */
export function useCrossTabSync(options: CrossTabSyncOptions) {
  const { channelName, queryKey, onReceive } = options;
  const queryClient = useQueryClient();

  // Stable ref to the channel instance. We store it in a ref rather than state
  // because we do not want to re-render when the channel is created/destroyed.
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Stable ref to the localStorage fallback key.
  const storageKeyRef = useRef(`${channelName}-sync`);

  useEffect(() => {
    // Guard: BroadcastChannel is a browser API; it is undefined during SSR.
    // The "use client" directive means this runs only in the browser, but the
    // typeof check is belt-and-suspenders for any environment quirks.
    if (typeof BroadcastChannel === "undefined") return;

    // Create the channel. Multiple components on the same page can call this
    // hook — they each get their own channel instance, but all instances with
    // the same channelName share the same underlying message bus.
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    // ── Receive handler ─────────────────────────────────────────────────────
    // This fires when ANOTHER tab broadcasts an invalidation.
    // It does NOT fire for messages posted by this tab (BroadcastChannel
    // design — senders do not receive their own messages).
    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;

      if (msg.type !== "invalidate") return;

      // Log for developer visibility during the challenge demo.
      console.log(
        `[c19-cross-tab] Received invalidate for`,
        msg.queryKey,
        "— mutated at",
        msg.mutatedAt
      );

      // Invalidate the local TanStack Query cache entry. This marks the cache
      // entry as stale and triggers a background refetch, so the UI updates.
      queryClient.invalidateQueries({ queryKey: msg.queryKey });

      // Optional callback so the component can show a "synced from another tab" badge.
      onReceive?.(msg);
    };

    // ── localStorage storage event fallback ─────────────────────────────────
    // Safari and some privacy modes block BroadcastChannel cross-tab messages.
    // As a fallback we listen to the storage event on other tabs.
    const handleStorage = (event: StorageEvent) => {
      // Only react to our specific key.
      if (event.key !== storageKeyRef.current) return;
      // A null newValue means the key was removed — that is our signal.
      if (event.newValue === null) return;

      try {
        const msg = JSON.parse(event.newValue) as SyncMessage;
        if (msg.type !== "invalidate") return;

        console.log(
          `[c19-cross-tab] (storage fallback) Received invalidate for`,
          msg.queryKey
        );

        queryClient.invalidateQueries({ queryKey: msg.queryKey });
        onReceive?.(msg);
      } catch {
        // Ignore malformed storage events.
      }
    };

    window.addEventListener("storage", handleStorage);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    // CRITICAL: close the channel on unmount to prevent memory leaks and
    // dangling message listeners after the component is removed.
    return () => {
      channel.close();
      channelRef.current = null;
      window.removeEventListener("storage", handleStorage);
    };
    // We intentionally only depend on channelName and queryClient here.
    // queryKey is read via the closure — if it changes identity on every render
    // (e.g. an inline array literal) we do NOT want to recreate the channel.
    // The broadcast() function below always uses the latest queryKey via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, queryClient]);

  // Stable ref to the latest queryKey so the broadcast closure does not go stale.
  // Updated inside useEffect rather than during render so ESLint's react-hooks/refs
  // rule is satisfied. The effect runs after every render where queryKey changes,
  // which is sufficient because broadcast() is always called from event handlers
  // (never during the render cycle itself).
  const queryKeyRef = useRef(queryKey);
  useEffect(() => {
    queryKeyRef.current = queryKey;
  });

  /**
   * Broadcast an invalidation to all other tabs.
   * Call this AFTER a successful mutation in the current tab.
   *
   * Two mechanisms are used in parallel:
   *   1. BroadcastChannel — fast and clean.
   *   2. localStorage write + immediate delete — triggers the storage event
   *      in other tabs (fallback for Safari/incognito).
   */
  const broadcast = () => {
    const msg: SyncMessage = {
      type: "invalidate",
      queryKey: queryKeyRef.current,
      mutatedAt: new Date().toISOString(),
    };

    // Primary: BroadcastChannel
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(msg);
      } catch {
        // Channel may be closed if the component is unmounting — ignore.
      }
    }

    // Fallback: localStorage storage event
    // We write the message then immediately remove the key. The write triggers
    // a "storage" event in other tabs; the immediate deletion prevents stale
    // data from accumulating in localStorage.
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(storageKeyRef.current, JSON.stringify(msg));
        // Remove synchronously — other tabs receive the "storage" event for
        // the write (newValue !== null), not for the delete (newValue === null).
        localStorage.removeItem(storageKeyRef.current);
      } catch {
        // Ignore — storage may be unavailable in some contexts.
      }
    }
  };

  return { broadcast };
}
