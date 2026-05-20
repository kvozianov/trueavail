import {
  formatCompactNumber,
  formatCurrencyAmount,
  formatDate,
  formatGateDecision,
  formatPercent,
  formatScenarioName,
  normalizeStatus,
  titleize,
  toneForStatus,
} from "./formatters";
import type {
  AICouncilResponse,
  ContingencyPlanResponse,
  DashboardViewModel,
  DemoSnapshotResponse,
  ExplanationResponse,
  ForecastPoint,
  ForecastRunResponse,
  FormulaDictionary,
  FormulaLike,
  HHIResult,
  MetricCardModel,
  OptimizerResponse,
  RoiResponse,
  ScenarioId,
  StressScenarioResponse,
  TransferPlanItem,
} from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function getHhiValue(hhi?: HHIResult) {
  return asNumber(hhi?.value) ?? asNumber(hhi?.hhi);
}

export function formulaEntries(formulas: FormulaDictionary | FormulaLike[] | undefined): FormulaLike[] {
  if (!formulas) {
    return [];
  }

  if (Array.isArray(formulas)) {
    return formulas;
  }

  if (!isRecord(formulas)) {
    return [];
  }

  return Object.entries(formulas).map(([key, formula]) => ({
    key,
    title: titleize(key),
    formula: String(formula),
  }));
}

export function mapSnapshotToDashboardModel(
  snapshot?: DemoSnapshotResponse,
  health?: string,
  selectedScenario: ScenarioId = "bank_run",
): DashboardViewModel {
  const forecast = snapshot?.forecast;
  const stress = snapshot?.stress_scenarios?.[selectedScenario] ?? snapshot?.stress;
  const optimizer =
    stress?.optimizer_recommendation ??
    snapshot?.primary_recommendation ??
    snapshot?.optimizer;
  const roi = snapshot?.roi;
  const contingency = snapshot?.contingency;
  const explanation = snapshot?.explanation;
  const council = snapshot?.ai_council;
  const metrics = buildTopMetrics(forecast, stress, optimizer, roi, contingency);

  const warnings: string[] = [];
  if (!forecast?.forecast?.length) warnings.push("No forecast rows were present in demo snapshot.");
  if (!optimizer) warnings.push("No optimizer recommendation was present in demo snapshot.");
  if (optimizer?.status && normalizeStatus(optimizer.status) === "infeasible") {
    warnings.push(optimizer.infeasible_reason ?? "Optimizer is infeasible.");
  }
  if (stress?.approval_gate) {
    const gate = mapGateToStatus(stress.approval_gate);
    if (gate.decision && toneForStatus(gate.decision) !== "positive") {
      warnings.push(`Governance gate is ${formatGateDecision(gate.decision)}.`);
    }
  }

  return {
    generatedAt: snapshot?.generated_at ?? forecast?.generated_at,
    health,
    topMetrics: metrics,
    forecast,
    stress,
    optimizer,
    explanation,
    roi,
    contingency,
    council,
    warnings,
  };
}

function buildTopMetrics(
  forecast?: ForecastRunResponse,
  stress?: StressScenarioResponse,
  optimizer?: OptimizerResponse | null,
  roi?: RoiResponse,
  contingency?: ContingencyPlanResponse,
): MetricCardModel[] {
  const cards: MetricCardModel[] = [];
  const firstBreach = forecast?.first_breach;
  const forecastRows = forecast?.forecast ?? [];
  const accountsBelowBuffer = stress?.accounts_below_buffer?.length;
  const hhiValue = getHhiValue(stress?.hhi_after ?? forecast?.hhi ?? optimizer?.hhi_after);
  const es99 = asNumber(stress?.expected_shortfall_99?.value) ?? asNumber(roi?.expected_shortfall_99);
  const optimizerCost = asNumber(optimizer?.total_transfer_cost) ?? asNumber(roi?.optimizer_cost);
  const avoidedGap = asNumber(roi?.avoided_liquidity_gap) ?? asNumber(roi?.avoided_gap);
  const releasedReserve = asNumber(roi?.released_idle_reserve) ?? asNumber(roi?.released_reserve);
  const gate = mapGateToStatus(stress?.approval_gate ?? roi?.approval_gate);
  const planStatus = contingency?.plan_status;

  if (forecastRows.length > 0) {
    const totalP50 = forecastRows
      .filter((point) => point.date === forecastRows[0]?.date)
      .reduce((sum, point) => sum + (point.usable_liquidity_p50 ?? point.balance_p50 ?? 0), 0);
    cards.push({
      id: "usable-liquidity",
      title: "Usable liquidity",
      value: formatCurrencyAmount(totalP50, forecastRows[0]?.currency),
      rawValue: totalP50,
      subtitle: "First forecast date aggregate",
      status: totalP50 >= 0 ? "positive" : "danger",
    });
  }

  if (firstBreach) {
    cards.push({
      id: "first-breach",
      title: "First projected breach",
      value: formatDate(firstBreach.date),
      subtitle: [firstBreach.account_id, firstBreach.currency].filter(Boolean).join(" · "),
      status: firstBreach.breach ? "danger" : toneForStatus(firstBreach.risk_status),
    });
  }

  if (typeof accountsBelowBuffer === "number") {
    cards.push({
      id: "below-buffer",
      title: "Accounts below buffer",
      value: String(accountsBelowBuffer),
      subtitle: formatScenarioName(stress?.scenario_id),
      status: accountsBelowBuffer > 0 ? "danger" : "positive",
    });
  }

  if (typeof hhiValue === "number") {
    const threshold = stress?.hhi_after?.threshold ?? forecast?.hhi?.threshold ?? optimizer?.hhi_after?.threshold;
    cards.push({
      id: "hhi",
      title: "Concentration risk",
      value: hhiValue.toFixed(3),
      subtitle: typeof threshold === "number" ? `Policy threshold ${threshold.toFixed(2)}` : undefined,
      status: hhiValue > (threshold ?? 0.25) ? "danger" : "positive",
    });
  }

  if (typeof es99 === "number") {
    cards.push({
      id: "es99",
      title: "ES99 tail loss",
      value: formatCompactNumber(es99),
      rawValue: es99,
      status: es99 > 0 ? "warning" : "positive",
    });
  }

  if (typeof optimizerCost === "number") {
    cards.push({
      id: "optimizer-cost",
      title: "Optimizer cost",
      value: formatCompactNumber(optimizerCost),
      rawValue: optimizerCost,
      subtitle: optimizer?.solver_engine,
      status: toneForStatus(optimizer?.status),
    });
  }

  if (typeof avoidedGap === "number") {
    cards.push({
      id: "avoided-gap",
      title: "Avoided gap",
      value: formatCompactNumber(avoidedGap),
      rawValue: avoidedGap,
      status: avoidedGap > 0 ? "info" : "neutral",
    });
  }

  if (typeof releasedReserve === "number") {
    cards.push({
      id: "released-reserve",
      title: "Released reserve",
      value: formatCompactNumber(releasedReserve),
      rawValue: releasedReserve,
      status: releasedReserve > 0 ? "positive" : "neutral",
    });
  }

  if (gate.decision) {
    cards.push({
      id: "gate-decision",
      title: "Gate decision",
      value: formatGateDecision(gate.decision),
      subtitle: gate.reason,
      status: toneForStatus(gate.decision),
    });
  }

  if (planStatus) {
    cards.push({
      id: "plan-status",
      title: "Plan status",
      value: titleize(planStatus),
      subtitle: contingency?.optimizer_infeasible_reason ?? contingency?.optimizer_reason,
      status: toneForStatus(planStatus),
    });
  }

  return cards;
}

export function mapForecastToChartSeries(forecast?: ForecastPoint[]) {
  return asArray<ForecastPoint>(forecast)
    .filter((point) => point.date)
    .map((point) => ({
      ...point,
      p05: point.usable_liquidity_p05 ?? point.balance_p05,
      p50: point.usable_liquidity_p50 ?? point.balance_p50,
      p95: point.usable_liquidity_p95 ?? point.balance_p95,
      breach: point.breach ?? point.breach_flag ?? false,
    }));
}

export function mapForecastToTableRows(forecast?: ForecastPoint[]) {
  return mapForecastToChartSeries(forecast);
}

export function mapStressToScenarioView(stress?: StressScenarioResponse) {
  return {
    scenarioName: stress?.scenario_name ?? formatScenarioName(stress?.scenario_id),
    balances: stress?.balances ?? (stress?.stressed_balances as StressScenarioResponse["balances"]) ?? [],
    coefficients: stress?.coefficients ?? (stress?.stress_coefficients as StressScenarioResponse["coefficients"]) ?? [],
    totalLoss: stress?.total_loss,
    es99: stress?.expected_shortfall_99?.value ?? (typeof stress?.es99 === "number" ? stress.es99 : undefined),
    hhiBefore: stress?.hhi_before,
    hhiAfter: stress?.hhi_after,
    gate: mapGateToStatus(stress?.approval_gate),
  };
}

export function mapOptimizerToRecommendationView(optimizer?: OptimizerResponse | null) {
  return {
    status: optimizer?.status,
    solverEngine: optimizer?.solver_engine,
    objectiveValue: optimizer?.objective_value,
    totalTransferCost: optimizer?.total_transfer_cost,
    hhiBefore: optimizer?.hhi_before,
    hhiAfter: optimizer?.hhi_after,
    transfers: optimizer?.transfers ?? [],
    auditEvents: optimizer?.audit_events ?? [],
    infeasibleReason: optimizer?.infeasible_reason,
    exposureLimits: optimizer?.bank_exposure_limits ?? {},
    survivalMinBalances: optimizer?.survival_min_balances ?? {},
    formulas: formulaEntries(optimizer?.formulas),
  };
}

export function mapGateToStatus(gate: unknown) {
  if (!isRecord(gate)) {
    return {
      decision: undefined,
      reason: undefined,
      severity: undefined,
      blockers: [] as unknown[],
      warnings: [] as unknown[],
      requiredNextActions: [] as unknown[],
      canAutoApprove: undefined as boolean | undefined,
    };
  }

  return {
    decision: asString(gate.decision) ?? asString(gate.status),
    reason: asString(gate.reason) ?? asString(gate.message),
    severity: asString(gate.severity),
    blockers: asArray(gate.blockers),
    warnings: asArray(gate.warnings),
    requiredNextActions: asArray(gate.required_next_actions),
    canAutoApprove: typeof gate.can_auto_approve === "boolean" ? gate.can_auto_approve : undefined,
  };
}

export function mapExplanationToDrawer(explanation?: ExplanationResponse) {
  return {
    summary: explanation?.summary,
    riskStatus: explanation?.risk_status,
    affectedAccount: explanation?.affected_account_id ?? explanation?.affected_account,
    affectedCurrency: explanation?.affected_currency,
    rootCauses: asArray(explanation?.root_causes),
    timeline: asArray(explanation?.timeline),
    formulas: explanation?.formula_cards ?? [],
    dataQualityNotes: asArray(explanation?.data_quality_notes),
  };
}

export function mapRoiToExecutiveMetrics(roi?: RoiResponse) {
  return {
    summary: roi?.summary,
    metrics: asArray(roi?.metrics),
    optimizerCost: roi?.optimizer_cost,
    expectedShortfall99: roi?.expected_shortfall_99,
    avoidedGap: roi?.avoided_liquidity_gap ?? roi?.avoided_gap,
    releasedReserve: roi?.released_idle_reserve ?? roi?.released_reserve,
    gate: mapGateToStatus(roi?.approval_gate),
    formulas: formulaEntries(roi?.formulas),
  };
}

export function mapContingencyToActionList(plan?: ContingencyPlanResponse) {
  return {
    planStatus: plan?.plan_status,
    optimizerStatus: plan?.optimizer_status,
    optimizerReason: plan?.optimizer_infeasible_reason ?? plan?.optimizer_reason,
    gateDecision: plan?.approval_gate_decision ?? plan?.gate_decision,
    p05Gap: plan?.total_p05_gap ?? plan?.p05_gap,
    deferrableCoverage: plan?.deferrable_coverage,
    intradayCreditNeed: plan?.intraday_credit_need,
    actions: asArray(plan?.actions),
    formulas: formulaEntries(plan?.formulas),
  };
}

export function mapCouncilToAdvisorCards(council?: AICouncilResponse) {
  return {
    mode: council?.mode ?? council?.resolved_mode,
    providerMode: council?.provider_mode ?? council?.provider,
    providerStatus: council?.provider_status ?? council?.provider_availability,
    fallbackReason: council?.fallback_reason,
    framedQuestion: council?.framed_question,
    facts: council?.facts ?? council?.mathematical_facts,
    advisors: asArray(council?.advisor_responses),
    peerReviews: asArray(council?.peer_reviews),
    verdict: council?.verdict ?? council?.chairman_verdict,
    formulas: formulaEntries(council?.formulas_used),
  };
}

export function canApproveRecommendation(
  optimizer?: OptimizerResponse | null,
  gate?: unknown,
) {
  const status = normalizeStatus(optimizer?.status);
  const gateStatus = mapGateToStatus(gate);
  const decision = normalizeStatus(gateStatus.decision);
  const hasTransfers = Boolean(optimizer?.transfers?.length);
  const hasBalances = Boolean(optimizer?.post_transfer_balances?.length);
  const optimizerAllows = ["optimal", "feasible", "success"].includes(status);
  const gateAllows =
    !gateStatus.decision ||
    ["approve", "approved"].includes(decision) ||
    gateStatus.canAutoApprove === true;

  return hasTransfers && hasBalances && optimizerAllows && gateAllows;
}

export function transferCost(transfer: TransferPlanItem) {
  return transfer.total_cost ?? transfer.cost ?? 0;
}

export function hhiContributionRows(hhi?: HHIResult) {
  const contributions = hhi?.contributions;
  if (!isRecord(contributions)) {
    return [];
  }

  return Object.entries(contributions)
    .filter(([, value]) => typeof value === "number")
    .map(([label, value]) => ({
      label,
      value: value as number,
      displayValue: formatPercent(value),
    }))
    .sort((a, b) => b.value - a.value);
}
