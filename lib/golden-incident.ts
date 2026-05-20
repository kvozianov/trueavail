import demoSnapshotArtifact from "@/backend/artifacts/demo_snapshot.json";
import { asArray, asNumber, getHhiValue, isRecord, mapGateToStatus } from "@/lib/backend/mappers";
import type {
  ContingencyPlanResponse,
  DemoSnapshotResponse,
  ForecastPoint,
  OptimizerAuditEvent,
  StressScenarioResponse,
} from "@/lib/backend/types";

export type DemoMode = "live" | "replay";

export type GoldenIncidentActionType =
  | "prefund"
  | "throttle"
  | "credit_line"
  | "fallback_rail";

export type GoldenIncident = {
  accountId: "atlas-eur-operating";
  bankId: "atlas";
  bankName: string;
  date: "2026-05-19";
  event: "merchant payout cycle";
  payoutAmount: number;
  payoutCurrency: "EUR";
  payoutRail: "SEPA";
  payoutCounterparty: string;
  bookBalance: number;
  settledBalance: number;
  requiredBuffer: number;
  usableLiquidityAfterPayout: number;
  p05Gap: number;
  target2StressLoss: number;
  es99: number;
  hhiAfterStress: number;
  hhiThreshold: number;
  optimizerStatus: "optimal" | "infeasible" | "failed";
  optimizerReason: string;
  solverEngine: string;
  governanceDecision: "approve" | "reject" | "escalate";
  governanceSeverity: string;
  contingencyActions: Array<{
    type: GoldenIncidentActionType;
    amount?: number;
    description: string;
    deadline?: string;
    owner: string;
  }>;
  blockers: string[];
  warnings: string[];
  requiredNextActions: string[];
  rootCauses: Array<{
    title: string;
    detail: string;
    amount?: number;
    type?: string;
  }>;
  timeline: Array<{
    date: string;
    label: string;
    detail: string;
  }>;
  forecastRows: ForecastPoint[];
  stress: StressScenarioResponse;
  auditEvents: Array<{
    timestamp: string;
    event: string;
    detail: string;
    state: string;
  }>;
  roi: {
    releasedCapital: string;
    overdraftReduction: string;
    earlyWarning: string;
    manualWorkReduction: string;
    reserveBefore: string;
    reserveAfter: string;
    summary: string;
  };
  snapshot: DemoSnapshotResponse;
};

const DEMO_ACCOUNT = "atlas-eur-operating";
const DEMO_CURRENCY = "EUR";
const DEMO_STRESS_SCENARIO = "target2_outage";
const DEMO_BOOK_BALANCE = 5_900_000;
const DEMO_SETTLED_BALANCE = 3_000_000;
const DEMO_REQUIRED_BUFFER = 1_000_000;
const DEMO_PAYOUT_AMOUNT = 4_100_000;

export const goldenIncidentSnapshotFallback = demoSnapshotArtifact as DemoSnapshotResponse;

export const goldenIncidentFallback = buildGoldenIncident(goldenIncidentSnapshotFallback);

export function buildGoldenIncident(snapshot: DemoSnapshotResponse = goldenIncidentSnapshotFallback): GoldenIncident {
  const forecast = snapshot.forecast;
  const stress =
    snapshot.stress_scenarios?.[DEMO_STRESS_SCENARIO] ??
    snapshot.stress_scenarios?.bank_run ??
    snapshot.stress ??
    {};
  const optimizer = stress.optimizer_recommendation ?? snapshot.primary_recommendation ?? snapshot.optimizer;
  const gate = mapGateToStatus(stress.approval_gate ?? snapshot.roi?.approval_gate);
  const contingency = snapshot.contingency;
  const firstBreach = forecast?.first_breach;
  const p05Gap =
    numberFromRecordPath(stress.approval_gate, ["forecast_gaps_by_account", DEMO_ACCOUNT]) ??
    numberFromRecordPath(snapshot.roi?.approval_gate, ["forecast_gaps_by_account", DEMO_ACCOUNT]) ??
    Math.max(0, -(firstBreach?.usable_liquidity_p05 ?? 0));
  const hhiAfterStress = getHhiValue(stress.hhi_after) ?? 0;
  const hhiThreshold = stress.hhi_after?.threshold ?? forecast?.hhi?.threshold ?? 0.25;
  const es99 =
    stress.expected_shortfall_99?.value ??
    (typeof stress.es99 === "number" ? stress.es99 : undefined) ??
    snapshot.roi?.expected_shortfall_99 ??
    0;
  const target2StressLoss = stress.total_loss ?? 0;
  const rootCauses = asArray<Record<string, unknown>>(snapshot.explanation?.root_causes).map((cause) => ({
    title: stringValue(cause.title, "Evidence"),
    detail: stringValue(cause.detail, "No detail returned."),
    amount: asNumber(cause.amount),
    type: typeof cause.type === "string" ? cause.type : undefined,
  }));
  const timeline = asArray<Record<string, unknown>>(snapshot.explanation?.timeline).map((item) => ({
    date: stringValue(item.date, "2026-05-18"),
    label: stringValue(item.label, "Audit event"),
    detail: stringValue(item.detail, "No detail returned."),
  }));

  return {
    accountId: DEMO_ACCOUNT,
    bankId: "atlas",
    bankName: firstBreach?.bank_name ?? "Atlas Bank",
    date: "2026-05-19",
    event: "merchant payout cycle",
    payoutAmount: DEMO_PAYOUT_AMOUNT,
    payoutCurrency: DEMO_CURRENCY,
    payoutRail: "SEPA",
    payoutCounterparty: "Top merchants payout batch",
    bookBalance: DEMO_BOOK_BALANCE,
    settledBalance: DEMO_SETTLED_BALANCE,
    requiredBuffer: DEMO_REQUIRED_BUFFER,
    usableLiquidityAfterPayout: DEMO_SETTLED_BALANCE - DEMO_REQUIRED_BUFFER - DEMO_PAYOUT_AMOUNT,
    p05Gap,
    target2StressLoss,
    es99,
    hhiAfterStress,
    hhiThreshold,
    optimizerStatus: normalizeOptimizerStatus(optimizer?.status),
    optimizerReason: optimizer?.infeasible_reason ?? "Survival floors conflict with bank exposure constraints.",
    solverEngine: optimizer?.solver_engine ?? "pulp-cbc",
    governanceDecision: normalizeGovernanceDecision(gate.decision),
    governanceSeverity: gate.severity ?? "red",
    contingencyActions: buildContingencyActions(contingency),
    blockers: gate.blockers.map(String),
    warnings: gate.warnings.map(String),
    requiredNextActions: gate.requiredNextActions.map(String),
    rootCauses,
    timeline,
    forecastRows: (forecast?.forecast ?? []).filter(
      (point) => point.account_id === DEMO_ACCOUNT && point.currency === DEMO_CURRENCY,
    ),
    stress,
    auditEvents: buildAuditEvents(optimizer?.audit_events, timeline),
    roi: {
      releasedCapital: "$6-7M",
      overdraftReduction: "75-90%",
      earlyWarning: "24-48h",
      manualWorkReduction: "50-60%",
      reserveBefore: "$15M",
      reserveAfter: "$8-9M",
      summary:
        snapshot.roi?.summary ??
        "The engine rejects a false-safe payout, then moves the operator to prefund or throttle actions before payment failure.",
    },
    snapshot,
  };
}

function normalizeOptimizerStatus(value: unknown): GoldenIncident["optimizerStatus"] {
  if (value === "optimal") return "optimal";
  if (value === "failed" || value === "error") return "failed";
  return "infeasible";
}

function normalizeGovernanceDecision(value: unknown): GoldenIncident["governanceDecision"] {
  if (value === "approve" || value === "approved") return "approve";
  if (value === "escalate" || value === "escalated") return "escalate";
  return "reject";
}

function buildContingencyActions(plan?: ContingencyPlanResponse): GoldenIncident["contingencyActions"] {
  const actions = asArray<Record<string, unknown>>(plan?.actions).map((action) => ({
    type: mapActionType(action.action_type),
    amount: asNumber(action.amount),
    description: stringValue(action.description, "Execute contingency liquidity action."),
    deadline: typeof action.deadline === "string" ? action.deadline : undefined,
    owner: action.action_type === "payment_throttle" ? "Treasury Lead" : "CFO approval",
  }));

  if (actions.length) {
    return actions;
  }

  return [
    {
      type: "prefund",
      amount: 2_136_774,
      description: "Prefund atlas-eur-operating before the merchant payout cut-off.",
      deadline: "2026-05-19",
      owner: "CFO approval",
    },
    {
      type: "throttle",
      amount: 2_136_774,
      description: "Throttle the merchant payout batch until the survival floor is restored.",
      deadline: "2026-05-19T18:00:00Z",
      owner: "Treasury Lead",
    },
  ];
}

function mapActionType(value: unknown): GoldenIncidentActionType {
  if (value === "payment_throttle") return "throttle";
  if (value === "intraday_credit" || value === "credit_line") return "credit_line";
  if (value === "fallback_rail") return "fallback_rail";
  return "prefund";
}

function buildAuditEvents(
  optimizerEvents: OptimizerAuditEvent[] | undefined,
  timeline: GoldenIncident["timeline"],
): GoldenIncident["auditEvents"] {
  const events = asArray<OptimizerAuditEvent>(optimizerEvents).map((event) => ({
    timestamp: event.timestamp ?? "2026-05-18T09:00:00Z",
    event: event.event_type ?? "optimizer_event",
    detail: event.message ?? "Optimizer audit event recorded.",
    state: event.severity ?? "replay",
  }));

  if (events.length) {
    return events;
  }

  return [
    {
      timestamp: "2026-05-18T09:00:00Z",
      event: "snapshot_loaded",
      detail: timeline[0]?.detail ?? "Forecast, stress, optimizer, and governance evidence loaded.",
      state: "replay",
    },
    {
      timestamp: "2026-05-19T18:00:00Z",
      event: "approval_gate",
      detail: "Reject decision recorded with p05 gap, HHI breach, and infeasible optimizer status.",
      state: "rejected",
    },
  ];
}

function numberFromRecordPath(source: unknown, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return asNumber(current);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
