import { translateText, type Language } from "@/lib/i18n";

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentLifecycle =
  | "detected"
  | "incidentSelected"
  | "analysisRunning"
  | "analysisCompleted"
  | "recommendationAccepted"
  | "ticketCreated"
  | "incidentClosed"
  | "analysisFailed";

export type AnalysisStepStatus = "pending" | "running" | "completed" | "failed";

export type LiquidityIncident = {
  id: string;
  title: string;
  type: string;
  severity: IncidentSeverity;
  status: string;
  accountId: string;
  bank: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  detectedAt: string;
  source: string;
  mapZone: string;
  description: string;
  expectedBehavior: string;
  observedBehavior: string;
  affectedObjects: string[];
  riskFactors: string[];
  telemetry: {
    p05Balance: number;
    p50Balance: number;
    requiredBuffer: number;
    scheduledDebit: number;
    settlementDelayHours: number;
    anomalyZScore: number;
    hhiAfterStress: number;
    es99Loss: number;
    ccriDowngradeDelta: number;
  };
};

export type AnalysisStep = {
  id: string;
  label: string;
  detail: string;
};

export type AnalysisStepState = AnalysisStep & {
  status: AnalysisStepStatus;
};

export type ModelVote = "approve" | "hold" | "reject" | "escalate";
export type ModelStatus = "passed" | "warning" | "blocked";

export type EnsembleModelResult = {
  modelName: string;
  status: ModelStatus;
  confidence: number;
  vote: ModelVote;
  signal: string;
  explanation: string;
  contribution: number;
  detectedFeatures: string[];
};

export type EnsembleAnalysisResult = {
  incidentId: string;
  finalVerdict: string;
  severity: IncidentSeverity;
  confidence: number;
  riskScore: number;
  rootCause: string;
  explanation: string;
  evidence: string[];
  recommendations: string[];
  nextActions: string[];
  modelVotes: EnsembleModelResult[];
  generatedAt: string;
};

export type DeepAnalyticsGroup =
  | "Forecast & Data Science"
  | "Optimization & Risk"
  | "Workflow & Business Value"
  | "UI & Integration";

export type DeepAnalyticsFunction = {
  id: string;
  group: DeepAnalyticsGroup;
  title: string;
  simpleName: string;
  endpoint: string;
  metric: string;
  signal: string;
  juryNarrative: string;
  demoBehavior: string;
};

export const defaultLiquidityIncident: LiquidityIncident = {
  id: "INC-NY-2026-0518-001",
  title: "New York usable liquidity breach",
  type: "ML-detected settlement anomaly",
  severity: "high",
  status: "Awaiting ML ensemble analysis",
  accountId: "new-york",
  bank: "JPMorgan Chase",
  city: "New York",
  coordinates: {
    latitude: 40.7128,
    longitude: -74.006,
  },
  detectedAt: "2026-05-18T09:00:00Z",
  source: "Demo Snapshot / forecast corridor / settlement calendar",
  mapZone: "New York Fedwire and USD payroll liquidity zone",
  description:
    "The map shows a red anomaly on the New York USD account because a scheduled credit repayment collides with a delayed SWIFT cover leg.",
  expectedBehavior:
    "The New York account should remain above its USD survival floor after scheduled debits and confirmed inbound liquidity.",
  observedBehavior:
    "Projected p05 usable liquidity drops below the survival floor before the Singapore cover becomes usable in New York.",
  affectedObjects: ["US-USD-1042", "DBS to JPM cover", "Fedwire close", "Payroll-season buffer"],
  riskFactors: [
    "p05 corridor breaches survival floor",
    "Known event: credit repayment at 16:00 ET",
    "Settlement delay pushes cover to T+1",
    "HHI concentration remains above policy threshold under stress",
  ],
  telemetry: {
    p05Balance: 2_500_000,
    p50Balance: 3_140_000,
    requiredBuffer: 3_000_000,
    scheduledDebit: 2_300_000,
    settlementDelayHours: 24,
    anomalyZScore: 5.8,
    hhiAfterStress: 0.312,
    es99Loss: 1_840_000,
    ccriDowngradeDelta: 25,
  },
};

export const analysisPipeline: AnalysisStep[] = [
  {
    id: "ingest",
    label: "Ingest map and demo snapshot data",
    detail: "Read account balances, route legs, settlement calendar, known events, and forecast corridor.",
  },
  {
    id: "geo-validation",
    label: "Validate coordinates and affected zone",
    detail: "Confirm the incident belongs to the New York Fedwire liquidity zone and active scenario account.",
  },
  {
    id: "telemetry",
    label: "Analyze treasury telemetry",
    detail: "Compare p05, p50, survival floor, scheduled debit, inbound cover, and settlement window.",
  },
  {
    id: "anomaly",
    label: "Run anomaly detection",
    detail: "Apply robust MAD z-score and known-event features to separate signal from outlier noise.",
  },
  {
    id: "risk",
    label: "Calculate risk score and tail loss",
    detail: "Combine HHI, ES99, CCRI downgrade, stress loss, and liquidity gap into a risk score.",
  },
  {
    id: "ensemble",
    label: "Aggregate ML ensemble votes",
    detail: "Merge forecast, anomaly, risk, pattern, and governance votes into one deterministic verdict.",
  },
  {
    id: "recommendations",
    label: "Generate recommendations and actions",
    detail: "Create a jury-readable explanation, action list, ticket payload, and downloadable report.",
  },
];

export const deepAnalyticsFunctions: DeepAnalyticsFunction[] = [
  {
    id: "liquidity-forecast",
    group: "Forecast & Data Science",
    title: "Liquidity Forecast",
    simpleName: "Forecast corridor",
    endpoint: "/api/forecast/run",
    metric: "p05 below floor by USD 500k",
    signal: "Forecast corridor crosses the survival floor before inbound cover is usable.",
    juryNarrative: "The product does not look only at book cash; it forecasts usable liquidity before the payment window closes.",
    demoBehavior: "Highlights the New York point and feeds downside gap into every downstream model.",
  },
  {
    id: "ml-forecast-ensemble",
    group: "Forecast & Data Science",
    title: "ML Forecast Ensemble",
    simpleName: "Model blend",
    endpoint: "/api/forecast/run",
    metric: "91% ensemble confidence",
    signal: "LightGBM quantile, sklearn quantile, and EWMA baseline agree on downside pressure.",
    juryNarrative: "Independent models vote on one forecast corridor instead of trusting a single estimator.",
    demoBehavior: "Shows model votes and confidence cards after analysis.",
  },
  {
    id: "feature-engineering",
    group: "Forecast & Data Science",
    title: "Feature Engineering",
    simpleName: "Prepared signals",
    endpoint: "backend/liquidity_control_tower/features.py",
    metric: "12 active feature families",
    signal: "Cyclical time, EWMA, lags, rolling statistics, calendar flags, and settlement flags are active.",
    juryNarrative: "The ML layer receives treasury-ready features, not raw payment rows.",
    demoBehavior: "Listed as detected features in the ensemble model explanations.",
  },
  {
    id: "anomaly-filtering",
    group: "Forecast & Data Science",
    title: "Anomaly Filtering",
    simpleName: "MAD z-score",
    endpoint: "/api/forecast/run",
    metric: "MAD z-score 5.8",
    signal: "Robust anomaly detection marks the scheduled movement as unusual but explainable.",
    juryNarrative: "Rare extreme movements do not poison training because they are flagged with robust statistics.",
    demoBehavior: "Turns the marker red before analysis and confirms the anomaly after analysis.",
  },
  {
    id: "known-events",
    group: "Forecast & Data Science",
    title: "Known Events",
    simpleName: "Calendar intelligence",
    endpoint: "/api/forecast/run",
    metric: "Payroll and credit repayment flags",
    signal: "The event calendar explains why the risk appears on this date.",
    juryNarrative: "The system knows recurring merchant, payroll, holiday, and settlement events before they hit cash.",
    demoBehavior: "Displayed in the incident evidence list and calendar strip.",
  },
  {
    id: "risk-status",
    group: "Forecast & Data Science",
    title: "Risk Status",
    simpleName: "Green/yellow/red",
    endpoint: "/api/forecast/run",
    metric: "Red: p05 below buffer",
    signal: "Risk color is derived from downside forecast, not manual operator judgment.",
    juryNarrative: "Treasury sees a deterministic status tied to the forecast corridor.",
    demoBehavior: "Incident badge moves from awaiting analysis to analyzed high risk.",
  },
  {
    id: "hhi",
    group: "Forecast & Data Science",
    title: "HHI Concentration",
    simpleName: "Bank concentration",
    endpoint: "/api/stress/run",
    metric: "HHI 0.312 > 0.25",
    signal: "Bank concentration remains above policy threshold after the stress case.",
    juryNarrative: "The product sees dependence on one bank before it approves a transfer.",
    demoBehavior: "Feeds the governance blocker and final verdict.",
  },
  {
    id: "ccri",
    group: "Optimization & Risk",
    title: "CCRI Bank Rating",
    simpleName: "Bank risk score",
    endpoint: "/api/optimizer/rebalance",
    metric: "Downgrade delta 25",
    signal: "A bank risk downgrade tightens exposure limits during optimization.",
    juryNarrative: "When a bank becomes riskier, the system automatically reduces safe exposure.",
    demoBehavior: "Displayed as a risk factor in the analytics report.",
  },
  {
    id: "mip-optimizer",
    group: "Optimization & Risk",
    title: "MIP Liquidity Optimizer",
    simpleName: "Constrained transfers",
    endpoint: "/api/optimizer/rebalance",
    metric: "0 safe auto-transfer routes",
    signal: "The optimizer cannot find a safe route that preserves survival floors and policy limits.",
    juryNarrative: "This is not a heuristic; it is constrained optimization with business rules.",
    demoBehavior: "Produces the recommended hold and contingency path.",
  },
  {
    id: "survival-floor",
    group: "Optimization & Risk",
    title: "Survival Floor Constraints",
    simpleName: "Do not drain weak accounts",
    endpoint: "/api/optimizer/rebalance",
    metric: "USD floor 3.0M",
    signal: "The system blocks transfers that would save one metric by creating another cash gap.",
    juryNarrative: "The optimizer cannot solve concentration by draining an already-breached account.",
    demoBehavior: "Shown beside the selected account and model evidence.",
  },
  {
    id: "stress-testing",
    group: "Optimization & Risk",
    title: "Stress Testing",
    simpleName: "Bank run / TARGET2",
    endpoint: "/api/stress/run",
    metric: "TARGET2 and bank-run scenarios",
    signal: "Stress removes settlement flexibility and recomputes balances.",
    juryNarrative: "The demo can show how the system behaves under rail outage or bank run conditions.",
    demoBehavior: "Scenario cards repaint the route and incident panel.",
  },
  {
    id: "es99",
    group: "Optimization & Risk",
    title: "Expected Shortfall 99%",
    simpleName: "Tail risk",
    endpoint: "/api/stress/run",
    metric: "ES99 USD 1.84M",
    signal: "Worst 1% outcomes imply a material liquidity tail loss.",
    juryNarrative: "The CFO gets one number for tail risk rather than a noisy chart.",
    demoBehavior: "Appears in the final ensemble risk explanation.",
  },
  {
    id: "governance-gate",
    group: "Optimization & Risk",
    title: "Governance Gate",
    simpleName: "Approve blocker",
    endpoint: "/api/recommendation/approve",
    metric: "Auto-approval blocked",
    signal: "Governance rejects unsafe automated release when blockers are still active.",
    juryNarrative: "Math can suggest action, but governance prevents unsafe approval.",
    demoBehavior: "Final verdict asks the user to hold and create a ticket.",
  },
  {
    id: "contingency-plan",
    group: "Optimization & Risk",
    title: "Contingency Plan",
    simpleName: "Emergency playbook",
    endpoint: "/api/contingency/plan",
    metric: "Prefund + throttle + fallback rail",
    signal: "When MIP is infeasible, the system proposes prefunding, throttling, fallback rails, and intraday credit sizing.",
    juryNarrative: "The story does not end at alerting; it turns into an executable treasury playbook.",
    demoBehavior: "Next actions become clickable after analysis.",
  },
  {
    id: "recommendation-approval",
    group: "Workflow & Business Value",
    title: "Recommendation Approval",
    simpleName: "Human approved action",
    endpoint: "/api/recommendation/approve",
    metric: "Mock audit receipt ready",
    signal: "Approved actions update local demo state and write an audit-style receipt.",
    juryNarrative: "The MVP shows human-approved treasury action, not real money movement.",
    demoBehavior: "Accept recommendation changes the incident lifecycle state.",
  },
  {
    id: "explainability",
    group: "Workflow & Business Value",
    title: "Explainability",
    simpleName: "Why panel",
    endpoint: "/api/explainability/summary",
    metric: "5 evidence groups",
    signal: "Root causes include forecast breach, known event, anomaly flag, stress loss, HHI, and governance blocker.",
    juryNarrative: "The operator can open the why and defend the decision.",
    demoBehavior: "Details modal contains root cause, evidence, and model cards.",
  },
  {
    id: "roi-summary",
    group: "Workflow & Business Value",
    title: "ROI Summary",
    simpleName: "CFO economics",
    endpoint: "/api/roi/summary",
    metric: "Avoided gap and tail loss",
    signal: "At-risk liquidity, avoided gap, released reserve, transfer cost, and ES99 are summarized for CFO review.",
    juryNarrative: "The value story is financial impact, not just a dashboard visual.",
    demoBehavior: "Download report includes CFO-readable metrics.",
  },
  {
    id: "ai-council",
    group: "Workflow & Business Value",
    title: "AI Council",
    simpleName: "Five advisors",
    endpoint: "/api/ai-council/review",
    metric: "5 advisor critiques",
    signal: "Advisors critique the calculated facts and chairman verdict, not raw bank data.",
    juryNarrative: "LLMs are used for governance review over deterministic facts.",
    demoBehavior: "Model report mirrors a council-style decision stack.",
  },
  {
    id: "openai-claude-routing",
    group: "Workflow & Business Value",
    title: "OpenAI + Claude Routing",
    simpleName: "Multi-provider governance",
    endpoint: "/api/ai-council/review",
    metric: "mock/openai/anthropic/mixed",
    signal: "Provider routing supports mock, OpenAI, Anthropic, and mixed review modes.",
    juryNarrative: "The demo can run safely in mock mode while preserving a production-like governance shape.",
    demoBehavior: "Displayed in deep analytics as a provider routing capability.",
  },
  {
    id: "demo-snapshot",
    group: "UI & Integration",
    title: "Demo Snapshot",
    simpleName: "One cockpit payload",
    endpoint: "/api/demo/snapshot",
    metric: "Forecast + stress + optimizer + ROI",
    signal: "One endpoint assembles the golden dashboard state.",
    juryNarrative: "Frontend and design can build from one stable payload.",
    demoBehavior: "This page uses deterministic local data shaped like the golden snapshot.",
  },
  {
    id: "openapi-contract",
    group: "UI & Integration",
    title: "OpenAPI Contract",
    simpleName: "Typed API surface",
    endpoint: "backend/artifacts/openapi.json",
    metric: "FastAPI contract exported",
    signal: "Request and response schemas are documented and machine-readable.",
    juryNarrative: "The team is not integrating by guesswork.",
    demoBehavior: "Technical proof route links the jury to implementation evidence.",
  },
  {
    id: "ui-handoff",
    group: "UI & Integration",
    title: "UI Handoff Artifacts",
    simpleName: "Design handoff",
    endpoint: "backend/artifacts/ui_handoff_summary.json",
    metric: "Snapshot, metadata, OpenAPI",
    signal: "Design and frontend receive stable demo state artifacts.",
    juryNarrative: "The MVP is ready for productized UI iteration.",
    demoBehavior: "The deep analytics matrix makes every artifact visible.",
  },
  {
    id: "backend-verify",
    group: "UI & Integration",
    title: "Backend Verify",
    simpleName: "One sanity check",
    endpoint: "npm run backend:verify",
    metric: "Forecast + optimizer + demo + council + tests",
    signal: "A single command validates the full backend demonstration path.",
    juryNarrative: "Before the pitch, the team can run one command and know the demo is coherent.",
    demoBehavior: "Verification status is represented in the final report actions.",
  },
];

export function createInitialAnalysisSteps(): AnalysisStepState[] {
  return analysisPipeline.map((step) => ({ ...step, status: "pending" }));
}

export function runDeterministicLiquidityEnsemble(incident: LiquidityIncident): EnsembleAnalysisResult {
  const gap = incident.telemetry.requiredBuffer - incident.telemetry.p05Balance;
  const gapRatio = clamp(gap / incident.telemetry.requiredBuffer, 0, 1);
  const delayRatio = clamp(incident.telemetry.settlementDelayHours / 36, 0, 1);
  const anomalyRatio = clamp(incident.telemetry.anomalyZScore / 7, 0, 1);
  const hhiRatio = clamp((incident.telemetry.hhiAfterStress - 0.25) / 0.18, 0, 1);
  const esRatio = clamp(incident.telemetry.es99Loss / 2_600_000, 0, 1);
  const weightedRisk = gapRatio * 30 + delayRatio * 20 + anomalyRatio * 18 + hhiRatio * 17 + esRatio * 15;
  const boundedRiskScore = Math.round(Math.min(96, Math.max(72, weightedRisk + 34)));

  const modelVotes: EnsembleModelResult[] = [
    {
      modelName: "GeoValidationModel",
      status: "warning",
      confidence: 87,
      vote: "hold",
      signal: "Incident is inside the New York Fedwire zone, but route usability depends on a foreign SWIFT cover leg.",
      explanation: "The coordinates are valid; the risk is not a wrong point, it is a settlement-zone timing mismatch.",
      contribution: 0.12,
      detectedFeatures: ["valid coordinates", "Fedwire zone", "cross-zone cover leg"],
    },
    {
      modelName: "AnomalyDetectionModel",
      status: "blocked",
      confidence: 93,
      vote: "reject",
      signal: `MAD z-score ${incident.telemetry.anomalyZScore.toFixed(1)} marks the movement as abnormal for this account window.`,
      explanation: "The movement is unusual enough to trigger review, but known-event features explain the source.",
      contribution: 0.22,
      detectedFeatures: ["MAD z-score breach", "known credit repayment", "payroll-season buffer"],
    },
    {
      modelName: "RiskScoringModel",
      status: "blocked",
      confidence: 91,
      vote: "reject",
      signal: `Risk score ${Math.round(boundedRiskScore)}/100 with HHI ${incident.telemetry.hhiAfterStress.toFixed(3)}.`,
      explanation: "Downside gap, concentration, and expected shortfall combine into a high-risk operating state.",
      contribution: 0.24,
      detectedFeatures: ["p05 below floor", "HHI above policy", "ES99 tail loss"],
    },
    {
      modelName: "PatternRecognitionModel",
      status: "warning",
      confidence: 89,
      vote: "hold",
      signal: "Pattern matches merchant/payroll seasonality plus delayed correspondent cover.",
      explanation: "The event is not random noise; it follows a known recurring liquidity pattern.",
      contribution: 0.15,
      detectedFeatures: ["seasonality spike", "T+1 cash availability", "settlement cut-off"],
    },
    {
      modelName: "ForecastModel",
      status: "blocked",
      confidence: 92,
      vote: "reject",
      signal: `p05 usable liquidity is USD ${formatShortNumber(gap)} under the survival floor.`,
      explanation: "The forecast corridor shows that book cash is not usable soon enough to approve the debit safely.",
      contribution: 0.19,
      detectedFeatures: ["p05 breach", "p50 watch zone", "delayed inbound cover"],
    },
    {
      modelName: "DecisionAggregator",
      status: "blocked",
      confidence: 94,
      vote: "escalate",
      signal: "3 reject votes, 2 hold votes, 1 escalate vote; no model supports automatic approval.",
      explanation: "The ensemble blocks auto-release and routes the case to contingency and human approval.",
      contribution: 0.08,
      detectedFeatures: ["governance blocker", "contingency needed", "manual approval required"],
    },
  ];

  return {
    incidentId: incident.id,
    finalVerdict: "High probability usable-liquidity breach detected",
    severity: "high",
    confidence: 91,
    riskScore: Math.round(boundedRiskScore),
    rootCause:
      "The New York book balance looks sufficient, but scheduled debit timing plus T+1 cover availability drops p05 usable liquidity below the survival floor.",
    explanation:
      "The ensemble agrees that this is a real liquidity incident rather than a map rendering issue. Coordinates are valid, telemetry is abnormal, known events explain timing, and governance should block automatic approval.",
    evidence: [
      `p05 balance ${formatUsd(incident.telemetry.p05Balance)} is below required buffer ${formatUsd(incident.telemetry.requiredBuffer)}.`,
      `Scheduled debit ${formatUsd(incident.telemetry.scheduledDebit)} lands before inbound cover becomes usable.`,
      `MAD z-score ${incident.telemetry.anomalyZScore.toFixed(1)} exceeds the anomaly threshold.`,
      `HHI ${incident.telemetry.hhiAfterStress.toFixed(3)} is above the 0.25 concentration threshold.`,
      `ES99 tail loss estimate is ${formatUsd(incident.telemetry.es99Loss)}.`,
    ],
    recommendations: [
      "Hold automatic release until SWIFT cover is confirmed in the New York usability window.",
      "Prefund the New York account or throttle the last 20% of the payout batch.",
      "Create an incident ticket for treasury owner review before Fedwire cut-off.",
      "Keep the governance gate blocked until survival floor and HHI constraints pass.",
    ],
    nextActions: [
      "Open incident details",
      "Create treasury ticket",
      "Accept recommendation",
      "Close incident after confirmation",
    ],
    modelVotes,
    generatedAt: "2026-05-18T09:06:00Z",
  };
}

export function buildAnalysisReport(incident: LiquidityIncident, result: EnsembleAnalysisResult, language: Language = "en"): string {
  const tr = (value: string) => translateText(language, value);
  const modelLines = result.modelVotes
    .map(
      (model) =>
        `- ${model.modelName}: ${model.vote.toUpperCase()} / ${model.confidence}% ${tr("confidence")} / ${tr(model.signal)}`,
    )
    .join("\n");
  const evidence = result.evidence.map((item) => `- ${tr(item)}`).join("\n");
  const recommendations = result.recommendations.map((item) => `- ${tr(item)}`).join("\n");

  return [
    tr("Liquidity Control Tower - ML Ensemble Incident Report"),
    `${tr("Incident")}: ${incident.id}`,
    `${tr("Title")}: ${tr(incident.title)}`,
    `${tr("Generated at")}: ${result.generatedAt}`,
    "",
    `${tr("Verdict")}: ${tr(result.finalVerdict)}`,
    `${tr("Severity")}: ${tr(result.severity)}`,
    `${tr("Confidence")}: ${result.confidence}%`,
    `${tr("Risk score")}: ${result.riskScore}/100`,
    "",
    tr("Root cause"),
    tr(result.rootCause),
    "",
    tr("Evidence"),
    evidence,
    "",
    tr("Model votes"),
    modelLines,
    "",
    tr("Recommendations"),
    recommendations,
  ].join("\n");
}

export function functionGroups(): DeepAnalyticsGroup[] {
  return ["Forecast & Data Science", "Optimization & Risk", "Workflow & Business Value", "UI & Integration"];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatShortNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
