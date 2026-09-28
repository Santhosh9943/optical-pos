'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Configuration options for `useCachedResource`.
 */
export interface CachedResourceOptions<T> {
  /**
   * Unique client cache identifier (scoped to tenant/entity/branch).
   * Example: `inventory_list:org-1:all`
   */
  cacheKey: string;

  /**
   * Asynchronous fetcher (typically a Server Action or API call).
   */
  fetcher: () => Promise<T>;

  /**
   * Periodic background refresh interval in milliseconds.
   * Defaults to 60,000ms (60 seconds). Set to 0 to disable periodic auto-refresh.
   */
  refreshInterval?: number;

  /**
   * Whether to automatically revalidate in the background when the browser window gains focus.
   * Defaults to true.
   */
  revalidateOnFocus?: boolean;

  /**
   * Whether to revalidate when the device reconnects to the network.
   * Defaults to true.
   */
  revalidateOnReconnect?: boolean;

  /**
   * Optional initial fallback data if nothing is in local cache.
   */
  fallbackData?: T;
}

/**
 * Return signature of `useCachedResource`.
 */
export interface CachedResourceResult<T> {
  /** Current data (synchronously populated from local cache on mount if available) */
  data: T | null;
  /** True ONLY when there is no data at all (first visit on cold device) */
  isLoading: boolean;
  /** True whenever a non-blocking background fetch or auto-refresh is occurring */
  isRevalidating: boolean;
  /** Any error encountered during the most recent fetch attempt */
  error: Error | null;
  /** Timestamp when local cache was last updated */
  lastUpdated: number | null;
  /** Trigger an immediate background revalidation */
  refresh: () => Promise<T | null>;
  /** Optimistically update local data and write to client cache immediately */
  mutate: (updater: T | ((prev: T | null) => T)) => void;
}

const CURRENT_CACHE_VERSION = 'v2';
const STORAGE_PREFIX = `optix_client_cache_${CURRENT_CACHE_VERSION}:`;

/**
 * Fast in-memory cache to ensure 0.00ms synchronous data retrieval across
 * component remounts, route changes, and initial renders.
 */
const memoryCache = new Map<string, { payload: unknown; timestamp: number }>();

/**
 * Automatically purges any deprecated or legacy client cache keys from localStorage.
 */
if (typeof window !== 'undefined') {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('optix_client_cache:') || (key.startsWith('optix_client_cache_') && !key.startsWith(STORAGE_PREFIX)))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Explicit helper to clear all OptixOS client-side browser caches.
 */
export function clearClientStorageCaches(): void {
  if (typeof window !== 'undefined') {
    try {
      memoryCache.clear();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('optix_client_cache') || key.startsWith('optix-') || key.startsWith('priority_notes_cache'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn('[useCachedResource] Failed to clear client storage caches:', e);
    }
  }
}

/**
 * Reads cache synchronously from memoryCache or localStorage.
 */
function readCacheSnapshot<T>(fullKey: string, fallback?: T): { payload: T | null; timestamp: number | null } {
  // 1. Check in-memory cache first (instantaneous lookup)
  if (memoryCache.has(fullKey)) {
    const entry = memoryCache.get(fullKey)!;
    return { payload: entry.payload as T, timestamp: entry.timestamp };
  }

  // 2. Check browser localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && 'payload' in parsed && 'timestamp' in parsed) {
          memoryCache.set(fullKey, { payload: parsed.payload, timestamp: parsed.timestamp });
          return { payload: parsed.payload as T, timestamp: parsed.timestamp as number };
        }
        memoryCache.set(fullKey, { payload: parsed, timestamp: Date.now() });
        return { payload: parsed as T, timestamp: Date.now() };
      }
    } catch (e) {
      console.warn(`[useCachedResource] Failed to read initial cache for "${fullKey}":`, e);
    }
  }

  return { payload: fallback ?? null, timestamp: null };
}

/**
 * Universal Stale-While-Revalidate (SWR) client hook.
 * 
 * 1. Synchronously initializes from `memoryCache` or `localStorage` on frame 0 (0ms instant render, ZERO loading spinner).
 * 2. Synchronously responds to `cacheKey` changes without waiting for useEffect to eliminate render flash.
 * 3. Fires a silent background revalidation without blocking or disrupting the customer.
 * 4. Periodically auto-refreshes in the background at configurable intervals.
 * 5. Provides instant optimistic `mutate()` for snappy Create / Update / Delete interactions.
 * 
 * @param options Configuration options including cacheKey, fetcher, and refresh intervals
 * @returns Cached data, loading/revalidating flags, manual refresh, and optimistic mutation dispatcher
 */
export function useCachedResource<T>({
  cacheKey,
  fetcher,
  refreshInterval = 60000,
  revalidateOnFocus = true,
  revalidateOnReconnect = true,
  fallbackData,
}: CachedResourceOptions<T>): CachedResourceResult<T> {
  const fullStorageKey = `${STORAGE_PREFIX}${cacheKey}`;

  // 1. Synchronously read from memory/localStorage on initial render to prevent layout flash
  const initialSnapshot = readCacheSnapshot<T>(fullStorageKey, fallbackData);

  const [data, setData] = useState<T | null>(initialSnapshot.payload);
  const [lastUpdated, setLastUpdated] = useState<number | null>(initialSnapshot.timestamp);
  const [isLoading, setIsLoading] = useState<boolean>(initialSnapshot.payload === null);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Synchronously update state during render if cacheKey changed (React pattern for prop changes)
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    const nextSnapshot = readCacheSnapshot<T>(fullStorageKey, fallbackData);
    setData(nextSnapshot.payload);
    setLastUpdated(nextSnapshot.timestamp);
    setIsLoading(nextSnapshot.payload === null);
  }

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Persist to memory and localStorage safely
  const persistToStorage = useCallback((payload: T, timestamp: number) => {
    // 1. Update memoryCache immediately
    memoryCache.set(fullStorageKey, { payload, timestamp });

    // 2. Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          fullStorageKey,
          JSON.stringify({ payload, timestamp })
        );
      } catch (e) {
        console.warn(`[useCachedResource] Failed to write cache for "${cacheKey}":`, e);
      }
    }
  }, [fullStorageKey, cacheKey]);

  // Execute background revalidation
  const revalidate = useCallback(async (): Promise<T | null> => {
    setIsRevalidating(true);
    try {
      const freshData = await fetcherRef.current();
      const now = Date.now();
      setData(freshData);
      setLastUpdated(now);
      setError(null);
      persistToStorage(freshData, now);
      return freshData;
    } catch (err) {
      const errObj = err instanceof Error ? err : new Error(String(err));
      setError(errObj);
      console.warn(`[useCachedResource] Revalidation failed for "${cacheKey}":`, errObj.message);
      return null;
    } finally {
      setIsLoading(false);
      setIsRevalidating(false);
    }
  }, [persistToStorage, cacheKey]);

  // Optimistic mutation helper: immediately updates React state, memoryCache, and writes to localStorage
  const mutate = useCallback((updater: T | ((prev: T | null) => T)) => {
    setData((current) => {
      const nextValue = typeof updater === 'function'
        ? (updater as (prev: T | null) => T)(current)
        : updater;
      const now = Date.now();
      setLastUpdated(now);
      persistToStorage(nextValue, now);
      return nextValue;
    });
  }, [persistToStorage]);

  // Silent background revalidation on mount and cacheKey change
  useEffect(() => {
    let isMounted = true;

    // Trigger silent background revalidation
    revalidate();

    return () => {
      isMounted = false;
    };
  }, [fullStorageKey, revalidate]);

  // Background Auto-Refresh Interval
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;

    const timer = setInterval(() => {
      // Only revalidate if document is visible to save battery/bandwidth
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        revalidate();
      }
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, revalidate]);

  // Window Focus & Reconnect Listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (revalidateOnFocus) {
        revalidate();
      }
    };

    const handleOnline = () => {
      if (revalidateOnReconnect) {
        revalidate();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [revalidateOnFocus, revalidateOnReconnect, revalidate]);

  return {
    data,
    isLoading,
    isRevalidating,
    error,
    lastUpdated,
    refresh: revalidate,
    mutate,
  };
}
