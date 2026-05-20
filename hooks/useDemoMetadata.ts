"use client";

import { useCallback } from "react";
import { getDemoMetadata } from "@/lib/backend/client";
import { useBackendResource } from "./useBackendResource";

export function useDemoMetadata() {
  return useBackendResource(useCallback(() => getDemoMetadata(), []));
}
