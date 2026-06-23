"use client";

import { useEffect } from "react";
import { useData } from "@/store/data";

/**
 * Keeps every window (main app + each widget window) in sync. Zustand persists
 * to localStorage on change; a write in one window fires a `storage` event in
 * the others, so we re-hydrate the store there. Also refreshes on focus and on
 * a slow interval as a safety net. This is what makes the widgets live-update.
 */
export function LiveSync() {
  useEffect(() => {
    const rehydrate = () => {
      try {
        (useData as unknown as { persist?: { rehydrate?: () => void } }).persist?.rehydrate?.();
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === "anchor-data") rehydrate();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", rehydrate);
    const t = setInterval(rehydrate, 8000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", rehydrate);
      clearInterval(t);
    };
  }, []);

  return null;
}
