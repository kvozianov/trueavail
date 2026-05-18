import type {
  BankAccount,
  BankCalendar,
  CashGap,
  CashFlow,
  ForecastPoint,
  RiskStatus,
  SettlementRule,
} from "@/types/finance";
import { calculateSettlementDate, toDateKey } from "@/utils/settlement";

const DAY_MS = 24 * 60 * 60 * 1000;

type UsableLiquidityParams = {
  account: BankAccount;
  cashFlows: CashFlow[];
  asOfDate: Date;
  settlementRules: SettlementRule[];
  calendar: BankCalendar;
};

type DailyForecastParams = {
  accounts: BankAccount[];
  cashFlows: CashFlow[];
  startDate: Date;
  horizonDays: number;
  settlementRules: SettlementRule[];
  calendar: BankCalendar;
};

function isSameAccountFlow(account: BankAccount, cashFlow: CashFlow) {
  return cashFlow.accountId === account.id && cashFlow.currency === account.currency;
}

function getExpectedSettledInflows(params: UsableLiquidityParams) {
  return params.cashFlows
    .filter((cashFlow) => isSameAccountFlow(params.account, cashFlow))
    .filter((cashFlow) => cashFlow.status === "pending")
    .filter((cashFlow) => cashFlow.direction === "inflow")
    .filter((cashFlow) => {
      const settlementDate = calculateSettlementDate(
        cashFlow,
        params.settlementRules,
        params.calendar,
      );

      return settlementDate <= params.asOfDate;
    })
    .reduce((sum, cashFlow) => sum + cashFlow.amount, 0);
}

function getPlannedOutflows(params: UsableLiquidityParams) {
  return params.cashFlows
    .filter((cashFlow) => isSameAccountFlow(params.account, cashFlow))
    .filter((cashFlow) => cashFlow.status === "pending")
    .filter((cashFlow) => cashFlow.direction === "outflow")
    .filter((cashFlow) => new Date(cashFlow.expectedAt) <= params.asOfDate)
    .reduce((sum, cashFlow) => sum + cashFlow.amount, 0);
}

export function calculateUsableLiquidity(params: UsableLiquidityParams) {
  const expectedSettledInflows = getExpectedSettledInflows(params);
  const plannedOutflows = getPlannedOutflows(params);

  return (
    params.account.settledBalance +
    expectedSettledInflows -
    plannedOutflows -
    params.account.requiredBuffer
  );
}

function getRiskStatus(usableLiquidity: number, requiredBuffer: number): RiskStatus {
  if (usableLiquidity < 0) {
    return "Red";
  }

  if (usableLiquidity < requiredBuffer * 0.25) {
    return "Yellow";
  }

  return "Green";
}

function getForecastDate(startDate: Date, dayOffset: number) {
  const date = new Date(startDate.getTime() + dayOffset * DAY_MS);

  date.setUTCHours(23, 59, 59, 999);

  return date;
}

export function buildDailyForecast(params: DailyForecastParams): ForecastPoint[] {
  const forecast: ForecastPoint[] = [];

  for (let day = 0; day < params.horizonDays; day += 1) {
    const asOfDate = getForecastDate(params.startDate, day);

    params.accounts.forEach((account) => {
      const usableLiquidity = calculateUsableLiquidity({
        account,
        cashFlows: params.cashFlows,
        asOfDate,
        settlementRules: params.settlementRules,
        calendar: params.calendar,
      });

      forecast.push({
        date: toDateKey(asOfDate),
        currency: account.currency,
        accountId: account.id,
        usableLiquidity,
        requiredBuffer: account.requiredBuffer,
        riskStatus: getRiskStatus(usableLiquidity, account.requiredBuffer),
      });
    });
  }

  return forecast;
}

function getGapReason(point: ForecastPoint) {
  if (point.riskStatus === "Red") {
    return "Usable liquidity falls below zero after planned outflows and required buffer.";
  }

  return "Usable liquidity is positive, but the remaining buffer is too thin for safe treasury operations.";
}

function isRiskPoint(
  point: ForecastPoint,
): point is ForecastPoint & { riskStatus: "Yellow" | "Red" } {
  return point.riskStatus !== "Green";
}

export function detectCashGaps(forecast: ForecastPoint[]): CashGap[] {
  return forecast
    .filter(isRiskPoint)
    .map((point) => ({
      date: point.date,
      currency: point.currency,
      accountId: point.accountId,
      shortageAmount: Math.max(0, -point.usableLiquidity),
      riskStatus: point.riskStatus,
      reason: getGapReason(point),
    }));
}
