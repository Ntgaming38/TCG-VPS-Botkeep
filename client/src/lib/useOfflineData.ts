import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  IN_STOCK_CACHE_KEY,
  productsListCacheKey,
  readOfflineSnapshot,
  resolveProductsListFallback,
  saveOfflineSnapshot,
} from "@/lib/offlineDataCache";

/** Live connectivity state, updated on the browser's online/offline events. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

export interface OfflineAwareList<T> {
  data: T[] | undefined;
  /** True when data comes from the on-device snapshot rather than the server. */
  isOfflineSnapshot: boolean;
  /** Epoch ms of the snapshot being shown, when isOfflineSnapshot is true. */
  savedAt: number | null;
}

/**
 * products.list with an offline safety net: successful responses are saved
 * on-device, and when a later fetch fails the last saved data is returned
 * (flagged via isOfflineSnapshot) instead of undefined.
 */
export function useOfflineProductsList(input: { type?: string; status?: string; search?: string }): OfflineAwareList<any> {
  const query = trpc.products.list.useQuery(input);
  const cacheKey = productsListCacheKey(input);

  useEffect(() => {
    if (query.data) saveOfflineSnapshot(cacheKey, query.data);
  }, [query.data, cacheKey]);

  const fallback = useMemo(() => {
    if (query.data || !query.error) return null;
    return resolveProductsListFallback<any>(input);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.error, cacheKey]);

  if (query.data) return { data: query.data, isOfflineSnapshot: false, savedAt: null };
  if (fallback) return { data: fallback.data, isOfflineSnapshot: true, savedAt: fallback.savedAt };
  return { data: undefined, isOfflineSnapshot: false, savedAt: null };
}

/** products.inStock with the same snapshot safety net (used by the sale form's product picker). */
export function useOfflineInStock(): OfflineAwareList<any> {
  const query = trpc.products.inStock.useQuery();

  useEffect(() => {
    if (query.data) saveOfflineSnapshot(IN_STOCK_CACHE_KEY, query.data);
  }, [query.data]);

  const fallback = useMemo(() => {
    if (query.data || !query.error) return null;
    return readOfflineSnapshot<any[]>(IN_STOCK_CACHE_KEY);
  }, [query.data, query.error]);

  if (query.data) return { data: query.data, isOfflineSnapshot: false, savedAt: null };
  if (fallback) return { data: fallback.data, isOfflineSnapshot: true, savedAt: fallback.savedAt };
  return { data: undefined, isOfflineSnapshot: false, savedAt: null };
}
