"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

type Settled<T> = { run: string; data: T | null; error: unknown };

export interface ApiState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  /** Re-runs the request with the same key. */
  reload: () => void;
}

/**
 * Runs `fetcher` whenever `key` changes (pass null to skip). Results of stale
 * runs are discarded; the previous data stays visible while a reload runs.
 */
export function useApi<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const runId = key === null ? null : `${key}#${nonce}`;
  const fetchNow = useEffectEvent((signal: AbortSignal) => fetcher(signal));

  useEffect(() => {
    if (runId === null) return;
    const ctrl = new AbortController();
    fetchNow(ctrl.signal).then(
      (data) => {
        if (!ctrl.signal.aborted) setSettled({ run: runId, data, error: null });
      },
      (error: unknown) => {
        if (!ctrl.signal.aborted) setSettled((prev) => ({ run: runId, data: prev?.data ?? null, error }));
      },
    );
    return () => ctrl.abort();
  }, [runId]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = settled?.run === runId;
  return {
    data: settled?.data ?? null,
    error: current ? settled?.error : null,
    loading: runId !== null && !current,
    reload,
  };
}
