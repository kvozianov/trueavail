"use client";

import { runOptimizer } from "@/lib/backend/client";
import type { OptimizerRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useOptimizer() {
  return useBackendMutation<OptimizerRequest, Awaited<ReturnType<typeof runOptimizer>>>(runOptimizer);
}
