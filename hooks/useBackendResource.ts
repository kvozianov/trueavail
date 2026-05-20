"use client";

import { useCallback, useMemo, useState } from "react";
import type { BackendError } from "@/lib/backend/client";

export type ResourceState<T> = {
  data?: T;
  error?: BackendError;
  loading: boolean;
  refetching: boolean;
  hasLoaded: boolean;
};

export function useBackendResource<T>(
  fetcher: () => Promise<T>,
  options?: { enabled?: boolean; initialData?: T },
) {
  const [state, setState] = useState<ResourceState<T>>({
    data: options?.initialData,
    loading: Boolean(options?.enabled ?? true) && !options?.initialData,
    refetching: false,
    hasLoaded: Boolean(options?.initialData),
  });

  const run = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: !current.hasLoaded,
      refetching: current.hasLoaded,
      error: undefined,
    }));

    try {
      const data = await fetcher();
      setState({
        data,
        loading: false,
        refetching: false,
        hasLoaded: true,
      });
      return data;
    } catch (error) {
      const backendError =
        typeof error === "object" &&
        error !== null &&
        "endpoint" in error &&
        "message" in error
          ? (error as BackendError)
          : {
              endpoint: "unknown",
              message: error instanceof Error ? error.message : "Request failed.",
            };

      setState((current) => ({
        ...current,
        loading: false,
        refetching: false,
        error: backendError,
        hasLoaded: true,
      }));
      throw backendError;
    }
  }, [fetcher]);

  return useMemo(
    () => ({
      ...state,
      refresh: run,
    }),
    [run, state],
  );
}

export function useBackendMutation<TRequest, TResponse>(
  mutation: (request: TRequest) => Promise<TResponse>,
) {
  const [state, setState] = useState<ResourceState<TResponse>>({
    loading: false,
    refetching: false,
    hasLoaded: false,
  });

  const run = useCallback(
    async (request: TRequest) => {
      setState((current) => ({
        ...current,
        loading: !current.hasLoaded,
        refetching: current.hasLoaded,
        error: undefined,
      }));

      try {
        const data = await mutation(request);
        setState({
          data,
          loading: false,
          refetching: false,
          hasLoaded: true,
        });
        return data;
      } catch (error) {
        const backendError =
          typeof error === "object" &&
          error !== null &&
          "endpoint" in error &&
          "message" in error
            ? (error as BackendError)
            : {
                endpoint: "unknown",
                message: error instanceof Error ? error.message : "Request failed.",
              };

        setState((current) => ({
          ...current,
          loading: false,
          refetching: false,
          error: backendError,
          hasLoaded: true,
        }));
        throw backendError;
      }
    },
    [mutation],
  );

  return useMemo(
    () => ({
      ...state,
      run,
    }),
    [run, state],
  );
}
