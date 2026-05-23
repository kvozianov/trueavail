import type { DecisionPhase } from "@/lib/demo-phase";
import type { GoldenIncident } from "@/lib/golden-incident";
import { formatCurrencyAmount, formatDateTime, formatNumber } from "@/lib/backend/formatters";
import { buildBlockchainTransferScenario, scoreTransferRails } from "@/lib/blockchain-transfer-model";
import { buildPermissionedRailScenario } from "@/lib/permissioned-rail";

export type FunctionKey =
  | "forecast"
  | "stress"
  | "hhi"
  | "optimizer"
  | "governance"
  | "contingency"
  | "aiCouncil"
  | "roi"
  | "contracts"
  | "blockchainTransfers"
  | "permissionedRail";
export type FunctionTone = "neutral" | "danger" | "blocked";

export type FunctionModule = {
  key: FunctionKey;
  step: string;
  name: string;
  endpoint: string;
  status: string;
  tone: FunctionTone;
  metricLabel: string;
  metricValue: string;
  input: string;
  output: string;
  handoff: string;
  checks: string[];
  receipt: Array<[string, string]>;
};

export const functionKeys: FunctionKey[] = [
  "forecast",
  "stress",
  "hhi",
  "optimizer",
  "governance",
  "contingency",
  "aiCouncil",
  "roi",
  "contracts",
  "blockchainTransfers",
  "permissionedRail",
];

export function isFunctionKey(value: string): value is FunctionKey {
  return functionKeys.includes(value as FunctionKey);
}

export function buildFunctionModules(incident: GoldenIncident, phase: DecisionPhase): FunctionModule[] {
  const revealed = phase !== "pending";
  const locked = revealed ? "" : "locked until decision click";
  const riskTone: FunctionTone = revealed ? "danger" : "neutral";
  const blockedTone: FunctionTone = phase === "rejected" ? "blocked" : revealed ? "danger" : "neutral";
  const firstForecast = incident.forecastRows[0];
  const lastForecast = incident.forecastRows.at(-1);
  const breachDate = incident.forecastRows.find((row) => row.breach)?.date ?? incident.date;
  const primaryAction = incident.contingencyActions[0];
  const rail = buildPermissionedRailScenario(incident);
  const blockchain = buildBlockchainTransferScenario(incident);
  const blockchainIntent = blockchain.intents[0];
  const blockchainBest = scoreTransferRails(blockchainIntent, blockchain.rails)[0];

  return [
    {
      key: "forecast",
      step: "01",
      name: "Forecast Engine",
      endpoint: "/api/forecast/run",
      status: revealed ? "p05 breach found" : "queued",
      tone: riskTone,
      metricLabel: "p05 usable gap",
      metricValue: revealed ? formatEur(incident.p05Gap, 3) : "locked",
      input: `${incident.accountId}, ${incident.payoutCurrency}, ${formatDateTime(firstForecast?.date ?? incident.date)}`,
      output: revealed ? `Breach day ${formatDateTime(breachDate)}` : locked,
      handoff: "Sends downside gap into stress and concentration risk.",
      checks: [
        "Reads anomaly-aware cash features.",
        "Compares p05 corridor against survival floor.",
        "Marks the payout as unsafe when usable cash crosses below zero.",
      ],
      receipt: [
        ["Window", `${formatDateTime(firstForecast?.date ?? incident.date)} to ${formatDateTime(lastForecast?.date ?? incident.date)}`],
        ["Rows", formatNumber(incident.forecastRows.length)],
        ["Account", incident.accountId],
      ],
    },
    {
      key: "stress",
      step: "02",
      name: "Stress Runner",
      endpoint: "/api/stress/run",
      status: revealed ? "TARGET2 outage applied" : "waiting on forecast",
      tone: riskTone,
      metricLabel: "stress loss",
      metricValue: revealed ? formatEur(incident.target2StressLoss, 3) : "locked",
      input: "Scenario target2_outage plus forecast corridor.",
      output: revealed ? "Settlement flexibility removed from the rail plan." : locked,
      handoff: "Pushes stressed balances into HHI and optimizer constraints.",
      checks: [
        "Applies rail outage haircut.",
        "Recalculates usable liquidity after stress.",
        "Stores stress receipt for audit replay.",
      ],
      receipt: [
        ["Scenario", "target2_outage"],
        ["Bank", incident.bankName],
        ["Loss", revealed ? formatEur(incident.target2StressLoss, 3) : "locked"],
      ],
    },
    {
      key: "hhi",
      step: "03",
      name: "Concentration Risk",
      endpoint: "/api/stress/run",
      status: revealed ? "policy threshold crossed" : "waiting on stress",
      tone: riskTone,
      metricLabel: "HHI after stress",
      metricValue: revealed ? `${incident.hhiAfterStress.toFixed(3)} > ${incident.hhiThreshold.toFixed(2)}` : "locked",
      input: "Stressed balances by bank and currency.",
      output: revealed ? "Concentration policy blocks automatic approval." : locked,
      handoff: "Adds bank exposure blocker before optimizer can suggest transfers.",
      checks: [
        "Calculates HHI on stressed liquidity distribution.",
        "Compares against governance threshold.",
        "Emits concentration blocker into approval gate.",
      ],
      receipt: [
        ["Threshold", incident.hhiThreshold.toFixed(2)],
        ["Observed", revealed ? incident.hhiAfterStress.toFixed(3) : "locked"],
        ["Severity", revealed ? incident.governanceSeverity : "pending"],
      ],
    },
    {
      key: "optimizer",
      step: "04",
      name: "Optimizer",
      endpoint: "/api/optimizer/rebalance",
      status: revealed ? incident.optimizerStatus : "not started",
      tone: blockedTone,
      metricLabel: "safe transfer routes",
      metricValue: revealed ? "0" : "locked",
      input: "Survival floors, HHI blocker, stress losses, payout deadline.",
      output: revealed ? incident.optimizerReason : locked,
      handoff: "Returns infeasible status so governance refuses false-positive transfers.",
      checks: [
        "Builds transfer constraints.",
        "Tests survival floors after each candidate route.",
        "Writes solver status into the decision receipt.",
      ],
      receipt: [
        ["Solver", revealed ? incident.solverEngine : "queued"],
        ["Status", revealed ? incident.optimizerStatus : "pending"],
        ["Routes", revealed ? "0 safe transfers" : "locked"],
      ],
    },
    {
      key: "governance",
      step: "05",
      name: "Governance Gate",
      endpoint: "/api/recommendation/approve",
      status: phase === "rejected" ? "reject recorded" : revealed ? "reject recommended" : "awaiting evidence",
      tone: blockedTone,
      metricLabel: "decision",
      metricValue: phase === "rejected" ? "rejected" : revealed ? incident.governanceDecision : "pending",
      input: "Forecast gap, stress loss, HHI blocker, optimizer result.",
      output: phase === "rejected" ? "Audit stamp written to decision trace." : revealed ? "Approval blocked." : locked,
      handoff: "Sends the operator to contingency actions instead of approval.",
      checks: [
        "Requires every blocker to be resolved before approval.",
        "Rejects when optimizer is infeasible.",
        "Preserves evidence IDs for judge review.",
      ],
      receipt: [
        ["Blockers", revealed ? formatNumber(incident.blockers.length) : "locked"],
        ["Warnings", revealed ? formatNumber(incident.warnings.length) : "locked"],
        ["Decision", phase === "rejected" ? "rejected" : revealed ? incident.governanceDecision : "pending"],
      ],
    },
    {
      key: "contingency",
      step: "06",
      name: "Contingency Plan",
      endpoint: "/api/contingency/plan",
      status: revealed ? "actions ready" : "not requested",
      tone: phase === "rejected" ? "blocked" : revealed ? "danger" : "neutral",
      metricLabel: "primary action",
      metricValue: revealed && primaryAction?.amount ? formatEur(primaryAction.amount, 3) : revealed ? "action ready" : "locked",
      input: "Rejected payout, treasury owner, cut-off, funding gap.",
      output: revealed ? (primaryAction?.description ?? "Prefund or throttle before cut-off.") : locked,
      handoff: "Moves the case from alerting into executable treasury work.",
      checks: [
        "Assigns owner.",
        "Sets deadline before payout cut-off.",
        "Connects ROI story to the blocked unsafe approval.",
      ],
      receipt: [
        ["Actions", revealed ? formatNumber(incident.contingencyActions.length) : "locked"],
        ["Owner", revealed ? (primaryAction?.owner ?? "Treasury Lead") : "pending"],
        ["Deadline", revealed ? formatDateTime(primaryAction?.deadline ?? incident.date) : "locked"],
      ],
    },
    {
      key: "aiCouncil",
      step: "07",
      name: "AI Council",
      endpoint: "/api/council/review",
      status: revealed ? "mock review ready" : "waiting on gate",
      tone: revealed ? "neutral" : "neutral",
      metricLabel: "review basis",
      metricValue: revealed ? "facts only" : "locked",
      input: "Forecast, stress, optimizer, governance receipt.",
      output: revealed ? "Explains why rejection is defensible without overriding policy." : locked,
      handoff: "Adds narrative review for treasury, CFO, and risk without changing the deterministic gate.",
      checks: [
        "Reads only the evidence packet.",
        "Separates model explanation from policy decision.",
        "Returns a mock provider response during demo verify.",
      ],
      receipt: [
        ["Provider", "mock"],
        ["Mode", revealed ? "deterministic" : "queued"],
        ["Decision", revealed ? incident.governanceDecision : "pending"],
      ],
    },
    {
      key: "roi",
      step: "08",
      name: "ROI",
      endpoint: "/api/roi/summary",
      status: revealed ? "business case computed" : "waiting on decision",
      tone: "neutral",
      metricLabel: "released capital",
      metricValue: revealed ? incident.roi.releasedCapital : "locked",
      input: "Rejected false-safe payout, reserve before/after, overdraft avoidance.",
      output: revealed ? incident.roi.summary : locked,
      handoff: "Connects risk prevention to CFO-visible capital efficiency.",
      checks: [
        "Shows reserve before and after.",
        "Quantifies overdraft reduction.",
        "Translates early warning into manual work reduction.",
      ],
      receipt: [
        ["Reserve before", incident.roi.reserveBefore],
        ["Reserve after", incident.roi.reserveAfter],
        ["Early warning", incident.roi.earlyWarning],
      ],
    },
    {
      key: "contracts",
      step: "09",
      name: "OpenAPI / Contracts",
      endpoint: "/api/backend/openapi.json",
      status: "contract exported",
      tone: "neutral",
      metricLabel: "backend proof",
      metricValue: "OpenAPI",
      input: "FastAPI contract artifact and Next backend proxy.",
      output: "Frontend can show deterministic contracts even when the live API is unavailable.",
      handoff: "Lets judges inspect implementation depth instead of only UI claims.",
      checks: [
        "Uses exported OpenAPI artifact.",
        "Keeps replay fallback explicit.",
        "Verifies backend contracts with npm run backend:contracts.",
      ],
      receipt: [
        ["Proxy", "/api/backend/[...path]"],
        ["Artifact", "backend/artifacts/openapi.json"],
        ["Mode", "replay-safe"],
      ],
    },
    {
      key: "blockchainTransfers",
      step: "10",
      name: "Blockchain Transfer Router",
      endpoint: "/transfers",
      status: revealed ? "multi-rail router ready" : "available as prototype",
      tone: phase === "pending" ? "neutral" : phase === "rejected" ? "blocked" : "danger",
      metricLabel: "recommended rail",
      metricValue: blockchainBest.rail.shortName,
      input: `${blockchainIntent.sourceAccount} to ${blockchainIntent.destinationAccount}, ${formatCurrencyAmount(blockchainIntent.amount, blockchainIntent.currency)}`,
      output: revealed ? `${blockchainBest.score}/100 score, ${blockchainBest.verdict}` : "prototype visible",
      handoff: "Turns Solana, Polygon, Base, Stellar, ZKsync Prividium, Ethereum, and legacy rails into a treasury routing decision.",
      checks: [
        "Scores rails by asset match, cut-off, fee, privacy, compliance, adoption, security, and market signal.",
        "Keeps the transfer gated by KYB/KYC, sanctions, survival floor, signer, finality, and audit receipt.",
        "Frames blockchain as regulated settlement intelligence, not speculative crypto exposure.",
      ],
      receipt: [
        ["Page", "/transfers"],
        ["Scenario", blockchainIntent.label],
        ["Rail", blockchainBest.rail.name],
      ],
    },
    {
      key: "permissionedRail",
      step: "11",
      name: "Permissioned Liquidity Mobility Overlay",
      endpoint: "/ui/permissioned-rail-simulation",
      status: revealed ? "rail comparison ready" : "available after breach",
      tone: phase === "pending" ? "neutral" : phase === "rejected" ? "blocked" : "danger",
      metricLabel: "p05 gap after overlay",
      metricValue: revealed ? formatEur(rail.after.p05Gap, 3) : "locked",
      input: `${rail.permissioned.sourceAccount} to ${rail.permissioned.destinationAccount}, ${formatEur(rail.permissioned.amount, 3)}`,
      output: revealed ? `${rail.permissioned.finalitySla} finality SLA, ${rail.after.contingency}` : locked,
      handoff: "Shows an alternative corporate liquidity rail beside legacy settlement, with policy checks and audit receipt.",
      checks: [
        "Compares legacy correspondent availability against permissioned ledger availability.",
        "Requires entity, limit, risk, signer, and governance checks.",
        "Shows failure paths where governance still rejects.",
      ],
      receipt: [
        ["Source", rail.permissioned.sourceAccount],
        ["Destination", rail.permissioned.destinationAccount],
        ["Audit", rail.certificate.auditHash],
      ],
    },
  ];
}

function formatEur(value: number, fractionDigits = 1) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions =
      fractionDigits >= 3
        ? Math.floor((abs / 1_000_000) * 1000) / 1000
        : abs / 1_000_000;
    return `${sign}EUR ${millions.toLocaleString("en-US", {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits === 3 ? 3 : 1,
    })}M`;
  }
  return formatCurrencyAmount(value, "EUR");
}
