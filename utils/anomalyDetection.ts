import type { CashFlow, CashFlowAnomaly, ObservedCashMovement } from "@/types/finance";

const LARGE_OUTFLOW_THRESHOLD = 3_000_000;
const LOWER_THAN_EXPECTED_THRESHOLD = 0.15;
const BANK_DELAY_RISK_RAILS = ["Card Clearing", "SWIFT"];

function getLowerThanExpectedPercent(movement: ObservedCashMovement) {
  if (movement.expectedAmount === 0 || movement.actualAmount >= movement.expectedAmount) {
    return 0;
  }

  return (movement.expectedAmount - movement.actualAmount) / movement.expectedAmount;
}

function findCashFlow(cashFlows: CashFlow[], cashFlowId: string) {
  return cashFlows.find((cashFlow) => cashFlow.id === cashFlowId);
}

function getLargeOutflowAnomalies(cashFlows: CashFlow[]): CashFlowAnomaly[] {
  return cashFlows
    .filter((cashFlow) => cashFlow.direction === "outflow")
    .filter((cashFlow) => cashFlow.amount >= LARGE_OUTFLOW_THRESHOLD)
    .map((cashFlow) => ({
      id: `anomaly-large-outflow-${cashFlow.id}`,
      type: "large_outflow",
      severity: "alert",
      cashFlowId: cashFlow.id,
      accountId: cashFlow.accountId,
      currency: cashFlow.currency,
      amount: cashFlow.amount,
      message: `${cashFlow.businessReason} is a large ${cashFlow.currency} outflow and can pressure usable liquidity.`,
    }));
}

function getLowerThanExpectedInflowAnomalies(
  cashFlows: CashFlow[],
  movements: ObservedCashMovement[],
): CashFlowAnomaly[] {
  return movements
    .filter((movement) => getLowerThanExpectedPercent(movement) >= LOWER_THAN_EXPECTED_THRESHOLD)
    .map((movement) => {
      const cashFlow = findCashFlow(cashFlows, movement.cashFlowId);

      return {
        id: `anomaly-lower-inflow-${movement.id}`,
        type: "lower_than_expected_inflow",
        severity: "alert",
        cashFlowId: movement.cashFlowId,
        accountId: movement.accountId,
        currency: movement.currency,
        amount: movement.expectedAmount - movement.actualAmount,
        message: `${cashFlow?.businessReason ?? "Expected inflow"} came in lower than expected by ${movement.currency} ${(movement.expectedAmount - movement.actualAmount).toLocaleString()}.`,
      };
    });
}

function getBankDelayRiskAnomalies(cashFlows: CashFlow[]): CashFlowAnomaly[] {
  return cashFlows
    .filter((cashFlow) => cashFlow.direction === "inflow")
    .filter((cashFlow) => BANK_DELAY_RISK_RAILS.includes(cashFlow.rail))
    .map((cashFlow) => ({
      id: `anomaly-bank-delay-${cashFlow.id}`,
      type: "bank_delay_risk",
      severity: "watch",
      cashFlowId: cashFlow.id,
      accountId: cashFlow.accountId,
      currency: cashFlow.currency,
      amount: cashFlow.amount,
      message: `${cashFlow.rail} inflow may arrive later than planned and should be watched before payout deadlines.`,
    }));
}

export function detectCashFlowAnomalies(params: {
  cashFlows: CashFlow[];
  observedMovements: ObservedCashMovement[];
}): CashFlowAnomaly[] {
  return [
    ...getLargeOutflowAnomalies(params.cashFlows),
    ...getLowerThanExpectedInflowAnomalies(params.cashFlows, params.observedMovements),
    ...getBankDelayRiskAnomalies(params.cashFlows),
  ];
}
