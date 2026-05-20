"use client";

import { runForecast } from "@/lib/backend/client";
import type { ForecastRequest } from "@/lib/backend/types";
import { useBackendMutation } from "./useBackendResource";

export function useForecastRun() {
  return useBackendMutation<ForecastRequest, Awaited<ReturnType<typeof runForecast>>>(runForecast);
}
