import { BACKEND_PROXY_BASE, backendEndpoints } from "./endpoints";
import type {
  AICouncilRequest,
  AICouncilResponse,
  ApprovalRequest,
  ApprovalResponse,
  ContingencyPlanRequest,
  ContingencyPlanResponse,
  DemoMetadataResponse,
  DemoSnapshotResponse,
  ExplanationRequest,
  ExplanationResponse,
  ForecastRequest,
  ForecastRunResponse,
  HealthResponse,
  OptimizerRequest,
  OptimizerResponse,
  RoiRequest,
  RoiResponse,
  StressScenarioRequest,
  StressScenarioResponse,
} from "./types";

export type BackendError = {
  endpoint: string;
  status?: number;
  message: string;
  payload?: unknown;
};

const DEFAULT_TIMEOUT_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (!isRecord(payload)) {
    return fallback;
  }

  const detail = payload.detail;
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (isRecord(item) && typeof item.msg === "string") {
          return item.msg;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

async function readJson(response: Response, endpoint: string): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw {
      endpoint,
      status: response.status,
      message: "Backend returned invalid JSON.",
    } satisfies BackendError;
  }
}

export async function backendFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  try {
    const response = await fetch(`${BACKEND_PROXY_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = await readJson(response, path);

    if (!response.ok) {
      throw {
        endpoint: path,
        status: response.status,
        message: messageFromPayload(
          payload,
          `Backend request failed with status ${response.status}.`,
        ),
        payload,
      } satisfies BackendError;
    }

    return payload as T;
  } catch (error) {
    if (isBackendError(error)) {
      throw error;
    }

    throw {
      endpoint: path,
      message:
        error instanceof DOMException && error.name === "AbortError"
          ? "Backend request timed out."
          : error instanceof Error
            ? error.message
            : "Backend request failed.",
    } satisfies BackendError;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function isBackendError(error: unknown): error is BackendError {
  return isRecord(error) && typeof error.endpoint === "string" && typeof error.message === "string";
}

export function getHealth() {
  return backendFetch<HealthResponse>(backendEndpoints.health);
}

export function getDemoMetadata() {
  return backendFetch<DemoMetadataResponse>(backendEndpoints.demoMetadata);
}

export function getDemoSnapshot() {
  return backendFetch<DemoSnapshotResponse>(backendEndpoints.demoSnapshot);
}

export function runForecast(request: ForecastRequest) {
  return backendFetch<ForecastRunResponse>(backendEndpoints.forecastRun, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function runOptimizer(request: OptimizerRequest) {
  return backendFetch<OptimizerResponse>(backendEndpoints.optimizerRebalance, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function runStressScenario(request: StressScenarioRequest) {
  return backendFetch<StressScenarioResponse>(backendEndpoints.stressRun, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function approveRecommendation(request: ApprovalRequest) {
  return backendFetch<ApprovalResponse>(backendEndpoints.recommendationApprove, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getExplainabilitySummary(request: ExplanationRequest) {
  return backendFetch<ExplanationResponse>(backendEndpoints.explainabilitySummary, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getRoiSummary(request: RoiRequest) {
  return backendFetch<RoiResponse>(backendEndpoints.roiSummary, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function getContingencyPlan(request: ContingencyPlanRequest) {
  return backendFetch<ContingencyPlanResponse>(backendEndpoints.contingencyPlan, {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export function runAiCouncilReview(request: AICouncilRequest) {
  return backendFetch<AICouncilResponse>(backendEndpoints.aiCouncilReview, {
    method: "POST",
    body: JSON.stringify(request),
    timeoutMs: 45_000,
  });
}
