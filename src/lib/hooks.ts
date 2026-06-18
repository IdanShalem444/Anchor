"use client";

import { useEffect, useState } from "react";

/** True once the component has mounted on the client. Guards persisted state. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** Reads a URL query param once on mount (avoids Suspense boundary needs). */
export function useQueryParam(key: string) {
  const [val, setVal] = useState<string | null>(null);
  useEffect(() => {
    setVal(new URLSearchParams(window.location.search).get(key));
  }, [key]);
  return val;
}
