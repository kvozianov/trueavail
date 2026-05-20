"use client";

import { getContingencyPlan } from "@/lib/backend/client";
import type { ContingencyPlanRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useContingencyPlan() {
  return useBackendMutation<ContingencyPlanRequest, Awaited<ReturnType<typeof getContingencyPlan>>>(
    getContingencyPlan,
  );
}
