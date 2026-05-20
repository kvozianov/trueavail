import { NextRequest } from "next/server";
import demoMetadataArtifact from "@/backend/artifacts/demo_metadata.json";
import demoSnapshotArtifact from "@/backend/artifacts/demo_snapshot.json";
import openApiArtifact from "@/backend/artifacts/openapi.json";
import uiHandoffArtifact from "@/backend/artifacts/ui_handoff_summary.json";

export const dynamic = "force-dynamic";

const backendBase = process.env.BACKEND_URL?.trim();

type JsonRecord = Record<string, unknown>;

const demoSnapshot = demoSnapshotArtifact as JsonRecord;
const demoMetadata = demoMetadataArtifact as JsonRecord;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

async function readJsonBody(request: NextRequest): Promise<JsonRecord> {
  if (request.method === "GET" || request.method === "HEAD") {
    return {};
  }

  const text = await request.text();
  if (!text) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function demoJson(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-liquidity-demo-source": backendBase ? "live-backend" : "vercel-static-mock",
    },
  });
}

function stressScenarioFor(scenarioId: unknown): JsonRecord {
  const stressScenarios = isRecord(demoSnapshot.stress_scenarios) ? demoSnapshot.stress_scenarios : {};
  const key = typeof scenarioId === "string" && scenarioId in stressScenarios ? scenarioId : "target2_outage";
  const scenario = stressScenarios[key] ?? stressScenarios.bank_run;
  return isRecord(scenario) ? scenario : {};
}

function optimizerRecommendation() {
  if (isRecord(demoSnapshot.primary_recommendation)) {
    return demoSnapshot.primary_recommendation;
  }

  const bankRun = stressScenarioFor("bank_run");
  return isRecord(bankRun.optimizer_recommendation) ? bankRun.optimizer_recommendation : {};
}

async function mockBackend(request: NextRequest, endpoint: string) {
  const body = await readJsonBody(request);

  switch (endpoint) {
    case "/health":
      return demoJson({
        status: "ok",
        mode: "static-mock",
        detail: "Vercel deployment is serving deterministic demo artifacts.",
      });
    case "/api/demo/metadata":
      return demoJson(demoMetadata);
    case "/api/demo/snapshot":
      return demoJson({
        ...demoSnapshot,
        generated_at: new Date().toISOString(),
      });
    case "/api/forecast/run":
      return demoJson(demoSnapshot.forecast ?? {});
    case "/api/stress/run":
      return demoJson(stressScenarioFor(body.scenario_id));
    case "/api/optimizer/rebalance":
      return demoJson(optimizerRecommendation());
    case "/api/explainability/summary":
      return demoJson(demoSnapshot.explanation ?? {});
    case "/api/roi/summary":
      return demoJson(demoSnapshot.roi ?? {});
    case "/api/contingency/plan":
      return demoJson(demoSnapshot.contingency ?? {});
    case "/api/ai-council/review":
      return demoJson({
        ...(isRecord(demoSnapshot.ai_council) ? demoSnapshot.ai_council : {}),
        resolved_mode: body.mode ?? "mock",
        provider: body.provider ?? "mock",
      });
    case "/api/recommendation/approve": {
      const transfers = asArray(body.transfers);
      const totalTransferAmount = transfers.reduce(
        (sum, transfer) => sum + (typeof transfer.amount === "number" ? transfer.amount : 0),
        0,
      );
      const totalTransferCost = transfers.reduce(
        (sum, transfer) =>
          sum +
          (typeof transfer.total_cost === "number"
            ? transfer.total_cost
            : typeof transfer.cost === "number"
              ? transfer.cost
              : 0),
        0,
      );

      return demoJson({
        approved: true,
        approved_by: typeof body.approved_by === "string" ? body.approved_by : "vercel-demo@trueavail.local",
        reason:
          typeof body.reason === "string"
            ? body.reason
            : "Static Vercel demo approval receipt.",
        total_transfer_amount: totalTransferAmount,
        total_transfer_cost: totalTransferCost,
        post_transfer_balances: Array.isArray(body.balances) ? body.balances : [],
        audit_log: [
          {
            event_type: "vercel_mock_approval_recorded",
            message: "Static deployment recorded a safe local approval receipt.",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }
    case "/openapi.json":
    case "/api/openapi.json":
      return demoJson(openApiArtifact);
    case "/api/ui-handoff/summary":
      return demoJson(uiHandoffArtifact);
    default:
      return demoJson(
        {
          detail: "Static Vercel demo endpoint is not implemented.",
          endpoint,
          available_mode: "Set BACKEND_URL in Vercel to proxy a live FastAPI backend.",
        },
        404,
      );
  }
}

async function proxyBackend(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const endpoint = `/${path.join("/")}`;
  if (!backendBase) {
    return mockBackend(request, endpoint);
  }

  const target = new URL(endpoint, backendBase);
  target.search = request.nextUrl.search;

  const init: RequestInit = {
    method: request.method,
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
    init.headers = {
      ...init.headers,
      "content-type": request.headers.get("content-type") ?? "application/json",
    };
  }

  try {
    const response = await fetch(target, init);
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "cache-control": "no-store",
        "content-type": response.headers.get("content-type") ?? "application/json",
        "x-liquidity-demo-source": "live-backend",
      },
    });
  } catch (error) {
    return Response.json(
      {
        detail: error instanceof Error ? error.message : "Backend proxy failed",
        endpoint,
      },
      { status: 502 },
    );
  }
}

export const GET = proxyBackend;
export const POST = proxyBackend;
