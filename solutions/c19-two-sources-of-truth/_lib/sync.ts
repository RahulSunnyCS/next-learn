"use client";
// ─── solutions/c19-two-sources-of-truth/_lib/sync.ts ─────────────────────────
//
// Reference implementation of useCrossTabSync.
//
// This is the solved version — identical to the challenge's _lib/sync.ts but
// with additional explanatory comments targeted at the learner reading the
// solution after completing the challenge.

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface SyncMessage {
  type: "invalidate";
  queryKey: readonly unknown[];
  mutatedAt: string;
}

export interface CrossTabSyncOptions {
  channelName: string;
  queryKey: readonly unknown[];
  onReceive?: (msg: SyncMessage) => void;
}

/**
 * useCrossTabSync — Reference Solution
 *
 * Key design decisions explained:
 *
 * 1. WHY useRef for the channel (not useState)?
 *    The channel instance never needs to cause a re-render. Storing it in state
 *    would trigger unnecessary re-renders on mount/unmount. useRef gives us a
 *    stable container with no rendering side-effects.
 *
 * 2. WHY create the channel inside useEffect (not at module level)?
 *    - Module-level BroadcastChannel would be created during SSR, where
 *      BroadcastChannel does not exist → ReferenceError.
 *    - useEffect only runs in the browser (after hydration), so it is safe.
 *    - useEffect's cleanup function can call channel.close() on unmount,
 *      preventing memory leaks. Module-level channels have no cleanup hook.
 *
 * 3. WHY does the sender NOT receive its own BroadcastChannel message?
 *    This is specified behaviour of BroadcastChannel: messages are delivered
 *    to all OTHER browsing contexts (tabs, iframes) that have subscribed to
 *    the same channel name on the same origin. The sender is explicitly
 *    excluded. This means we do not need to check "was this message from me?"
 *    in the onmessage handler — it is always from a different tab.
 *
 * 4. WHY is the localStorage fallback necessary?
 *    Safari Private Browsing and some Chromium configurations with strict
 *    storage isolation may prevent BroadcastChannel messages from crossing
 *    tab boundaries. The `storage` event is an older, simpler mechanism that
 *    fires in all other tabs when localStorage is modified. It is less clean
 *    (has side-effects on localStorage) but more broadly supported as a fallback.
 *
 * 5. WHY eslint-disable react-hooks/exhaustive-deps?
 *    The useEffect intentionally omits `queryKey` and `onReceive` from the
 *    dependency array. We WANT the channel to be created once (on mount) and
 *    not recreated if the queryKey reference changes identity (e.g. an inline
 *    array `["saved-items"]` is a new reference on each render but semantically
 *    the same key). We use `queryKeyRef.current` inside the broadcast closure
 *    to always read the latest value without needing the effect to re-run.
 */
export function useCrossTabSync(options: CrossTabSyncOptions) {
  const { channelName, queryKey, onReceive } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const storageKeyRef = useRef(`${channelName}-sync`);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const msg = event.data;
      if (msg.type !== "invalidate") return;

      console.log(
        `[c19-cross-tab] Received invalidate for`,
        msg.queryKey,
        "— mutated at",
        msg.mutatedAt
      );

      queryClient.invalidateQueries({ queryKey: msg.queryKey });
      onReceive?.(msg);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKeyRef.current) return;
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

    return () => {
      channel.close();
      channelRef.current = null;
      window.removeEventListener("storage", handleStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, queryClient]);

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;

  const broadcast = () => {
    const msg: SyncMessage = {
      type: "invalidate",
      queryKey: queryKeyRef.current,
      mutatedAt: new Date().toISOString(),
    };

    if (channelRef.current) {
      try {
        channelRef.current.postMessage(msg);
      } catch {
        // Channel may be closing during unmount.
      }
    }

    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(storageKeyRef.current, JSON.stringify(msg));
        localStorage.removeItem(storageKeyRef.current);
      } catch {
        // Storage unavailable in some contexts.
      }
    }
  };

  return { broadcast };
}
