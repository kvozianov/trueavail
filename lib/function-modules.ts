import type { DecisionPhase } from "@/lib/demo-phase";
import type { GoldenIncident } from "@/lib/golden-incident";
import { formatCurrencyAmount, formatDateTime, formatNumber } from "@/lib/backend/formatters";

export type FunctionKey = "forecast" | "stress" | "hhi" | "optimizer" | "governance" | "contingency";
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

export const functionKeys: FunctionKey[] = ["forecast", "stress", "hhi", "optimizer", "governance", "contingency"];

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
