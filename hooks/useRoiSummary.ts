"use client";

import { getRoiSummary } from "@/lib/backend/client";
import type { RoiRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useRoiSummary() {
  return useBackendMutation<RoiRequest, Awaited<ReturnType<typeof getRoiSummary>>>(getRoiSummary);
}
