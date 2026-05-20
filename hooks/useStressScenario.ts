"use client";

import { runStressScenario } from "@/lib/backend/client";
import type { StressScenarioRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useStressScenario() {
  return useBackendMutation<StressScenarioRequest, Awaited<ReturnType<typeof runStressScenario>>>(runStressScenario);
}
