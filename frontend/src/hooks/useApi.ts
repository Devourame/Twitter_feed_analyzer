import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic data-fetching hook with loading/error state, abort-on-unmount,
 * and a manual refresh(). The fetcher receives an AbortSignal so stale
 * requests are cancelled when dependencies change or the page unmounts.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Keep the latest fetcher/refresh counter in refs so the effect is stable
  // across re-renders and only re-runs when deps change.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcherRef
      .current(controller.signal)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        const message =
          err instanceof ApiError
            ? err.message
            : 'An unexpected error occurred while loading data.';
        setState((prev) => ({ ...prev, loading: false, error: message }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey]);

  return { ...state, refresh };
}
