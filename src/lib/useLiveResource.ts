import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, isSseHealthy, subscribeToChanges } from './api';

/**
 * Loads a resource from the API and keeps it live: whenever the admin panel
 * changes that resource the server broadcasts it over SSE and we refetch.
 * Mirrors what `onSnapshot` did with Firestore.
 *
 * `resource` determines the GET path and `sseTable` (defaults to `resource`)
 * the broadcast table that triggers a refetch — they differ when the path is a
 * dedicated view of the same table (e.g. `reviews/all` behind an admin guard).
 */
export function useLiveResource<T>(resource: string, initial: T, sseTable: string = resource) {
  const [data, setData] = useState<T>(initial);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const next = await apiGet<T>(`/${resource}`);
      if (!mounted.current) return;
      setData(next);
      setAvailable(true);
    } catch (error) {
      if (!mounted.current) return;
      // The UI keeps its local defaults instead of breaking (same behaviour as
      // the old onSnapshot error handler).
      console.error(`API error while loading /${resource}`, error);
      setAvailable(false);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [resource]);

  useEffect(() => {
    setLoading(true);
    load();
    const unsubscribe = subscribeToChanges((table) => {
      if (table === sseTable) load();
    });

    /**
     * Serverless hosts close the SSE stream on a short cycle, so poll while
     * the live feed is down — with a healthy connection this does nothing.
     * A hidden tab gets no polling at all: browsers throttle timers there
     * anyway and every avoided fetch is avoided origin transfer. When the tab
     * becomes visible again we refresh immediately instead of waiting for the
     * next tick.
     */
    const poll = () => {
      if (document.visibilityState !== 'visible') return;
      if (!isSseHealthy()) load();
    };

    const interval = window.setInterval(poll, 20000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      unsubscribe();
    };
  }, [resource, sseTable, load]);

  return { data, available, loading, reload: load };
}