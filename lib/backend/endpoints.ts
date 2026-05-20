export const BACKEND_PROXY_BASE = "/api/backend";

export const backendEndpoints = {
  health: "/health",
  demoMetadata: "/api/demo/metadata",
  demoSnapshot: "/api/demo/snapshot",
  forecastRun: "/api/forecast/run",
  optimizerRebalance: "/api/optimizer/rebalance",
  stressRun: "/api/stress/run",
  recommendationApprove: "/api/recommendation/approve",
  explainabilitySummary: "/api/explainability/summary",
  roiSummary: "/api/roi/summary",
  contingencyPlan: "/api/contingency/plan",
  aiCouncilReview: "/api/ai-council/review",
} as const;

export type BackendEndpointName = keyof typeof backendEndpoints;
