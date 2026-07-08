import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * In-memory stale-while-revalidate cache for screen data.
 *
 * First visit: no cached value → loading=true while the fetcher runs.
 * Every later visit (including tab re-entry): the cached value renders
 * instantly (loading=false) and the fetcher re-runs silently in the
 * background, updating both the cache and the screen when it resolves.
 *
 * The cache is module-level memory only — cleared on logout (see
 * clearScreenCache in AuthContext.logout) so accounts never see each
 * other's data, and naturally empty on a fresh app launch.
 */
const cache = new Map<string, unknown>();

export function clearScreenCache(): void {
  cache.clear();
}

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
): {
  data: T | undefined;
  loading: boolean;
  refreshing: boolean;
  /** True when the last fetch failed AND there is no cached data to show. */
  error: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<T | undefined>(cache.get(key) as T | undefined);
  const [loading, setLoading] = useState(!cache.has(key));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  // Keep the latest fetcher without re-triggering the focus effect.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);

  // If the key changes (e.g. period switch), swap to that key's cache entry.
  if (keyRef.current !== key) {
    keyRef.current = key;
    const cached = cache.get(key) as T | undefined;
    setData(cached);
    setLoading(!cache.has(key));
  }

  const load = useCallback(async (asRefresh: boolean) => {
    const activeKey = keyRef.current;
    if (asRefresh) setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      cache.set(activeKey, result);
      // Ignore stale responses if the key changed while fetching.
      if (keyRef.current === activeKey) {
        setData(result);
        setLoading(false);
        setError(false);
      }
    } catch {
      // Keep showing cached data on failure. Flag `error` only when there is
      // nothing cached — otherwise an offline app silently renders empty and
      // looks like the user's data was lost.
      if (keyRef.current === activeKey) {
        setLoading(false);
        setError(!cache.has(activeKey));
      }
    } finally {
      if (keyRef.current === activeKey) setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Silent background refresh on every focus; spinner only when empty.
      load(false);
    }, [load, key]),
  );

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, refreshing, error, refresh };
}
