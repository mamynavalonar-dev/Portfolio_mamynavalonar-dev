"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { useAdminMemoryCache } from "@/components/admin/AdminDataProvider";

export default function useAdminCachedState<T>(key: string, initial: T | (() => T)) {
  const cache = useAdminMemoryCache();
  const [fallback] = useState<T>(initial);
  const generation = useRef(cache.generation);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const read = useCallback(() => cache.has(key) ? cache.get<T>(key)! : fallback, [cache, key, fallback]);
  const serverSnapshot = useCallback(() => fallback, [fallback]);
  const value = useSyncExternalStore(cache.subscribe, read, serverSnapshot);
  const hasSnapshot = useCallback(() => cache.has(key), [cache, key]);
  const setValue: Dispatch<SetStateAction<T>> = useCallback((action) => {
    // Un ancien chargement, une page quittée ou une ancienne session ne peut
    // pas remplacer les données du nouvel écran / du nouvel utilisateur.
    if (!mounted.current || generation.current !== cache.generation) return;
    cache.set(key, typeof action === "function" ? (action as (previous: T) => T)(read()) : action);
  }, [cache, key, read]);
  return [value, setValue, hasSnapshot] as const;
}
