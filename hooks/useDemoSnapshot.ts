"use client";

import { useCallback } from "react";
import { getDemoSnapshot } from "@/lib/backend/client";
import { useBackendResource } from "./useBackendResource";

export function useDemoSnapshot() {
  return useBackendResource(useCallback(() => getDemoSnapshot(), []));
}
