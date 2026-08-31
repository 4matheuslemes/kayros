"use client";

import { useEffect, useState } from "react";
import { flushSyncQueue } from "@/lib/db/sync";

/**
 * Registers window online/offline listeners.
 * When the browser reconnects, it flushes the Dexie sync queue.
 * Returns current online state for UI use.
 */
export function useOnlineSync(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void flushSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Flush on mount in case we missed items from last session
    if (navigator.onLine) void flushSyncQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
