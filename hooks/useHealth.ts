"use client";

import { useCallback } from "react";
import { getHealth } from "@/lib/backend/client";
import { useBackendResource } from "./useBackendResource";

export function useHealth() {
  return useBackendResource(useCallback(() => getHealth(), []));
}
