"use client";

import { getExplainabilitySummary } from "@/lib/backend/client";
import type { ExplanationRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useExplainability() {
  return useBackendMutation<ExplanationRequest, Awaited<ReturnType<typeof getExplainabilitySummary>>>(
    getExplainabilitySummary,
  );
}
