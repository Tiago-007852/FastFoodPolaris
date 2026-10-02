import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, subscribeToChanges } from './api';

/**
 * Loads a resource from the API and keeps it live: whenever the admin panel
 * changes that resource the server broadcasts it over SSE and we refetch.
 * Mirrors what `onSnapshot` did with Firestore.
 */
export function useLiveResource<T>(resource: string, initial: T) {
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
    return subscribeToChanges((table) => {
      if (table === resource) load();
    });
  }, [resource, load]);

  return { data, available, loading, reload: load };
}