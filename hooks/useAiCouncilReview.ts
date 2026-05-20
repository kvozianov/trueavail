"use client";

import { runAiCouncilReview } from "@/lib/backend/client";
import type { AICouncilRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useAiCouncilReview() {
  return useBackendMutation<AICouncilRequest, Awaited<ReturnType<typeof runAiCouncilReview>>>(
    runAiCouncilReview,
  );
}
