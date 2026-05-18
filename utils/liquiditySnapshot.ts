import type { Currency, LiquiditySnapshot, MoneyAmount } from "@/types/finance";
import { detectCashFlowAnomalies } from "@/utils/anomalyDetection";
import { checkBankDelays } from "@/utils/bankDelay";
import { explainGap } from "@/utils/explanations";
import { reconcileForecasts } from "@/utils/forecastReconciler";
import {
  buildDailyForecast,
  calculateUsableLiquidity,
  detectCashGaps,
} from "@/utils/liquidityCalc";
import {
  DEMO_BANK_ACCOUNTS,
  DEMO_BANK_CALENDAR,
  DEMO_CASH_FLOWS,
  DEMO_NOW,
  DEMO_OBSERVED_MOVEMENTS,
  DEMO_SETTLEMENT_RULES,
} from "@/utils/mockBankData";
import { checkOnlineCorrections } from "@/utils/onlineCorrector";
import { buildPortfolioForecast } from "@/utils/portfolioForecast";
import { generateRecommendation } from "@/utils/recommendations";

const FORECAST_HORIZON_DAYS = 7;

function sumByCurrency(
  currencies: Currency[],
  getAmount: (currency: Currency) => number,
): MoneyAmount[] {
  return currencies.map((currency) => ({
    currency,
    amount: getAmount(currency),
  }));
}

function getCurrencies() {
  return Array.from(new Set(DEMO_BANK_ACCOUNTS.map((account) => account.currency)));
}

function getTotalCash(): MoneyAmount[] {
  const currencies = getCurrencies();

  return sumByCurrency(currencies, (currency) =>
    DEMO_BANK_ACCOUNTS.filter((account) => account.currency === currency).reduce(
      (sum, account) => sum + account.bookBalance,
      0,
    ),
  );
}

function getCurrentUsableLiquidity(asOfDate: Date): MoneyAmount[] {
  const currencies = getCurrencies();

  return sumByCurrency(currencies, (currency) =>
    DEMO_BANK_ACCOUNTS.filter((account) => account.currency === currency).reduce(
      (sum, account) =>
        sum +
        calculateUsableLiquidity({
          account,
          cashFlows: DEMO_CASH_FLOWS,
          asOfDate,
          settlementRules: DEMO_SETTLEMENT_RULES,
          calendar: DEMO_BANK_CALENDAR,
        }),
      0,
    ),
  );
}

function getAtRiskAmount(gaps: LiquiditySnapshot["gaps"]): MoneyAmount[] {
  const currencies = getCurrencies();

  return sumByCurrency(currencies, (currency) =>
    gaps
      .filter((gap) => gap.currency === currency)
      .reduce((sum, gap) => sum + gap.shortageAmount, 0),
  );
}

function getIdleReserve(): MoneyAmount[] {
  const currencies = getCurrencies();

  return sumByCurrency(currencies, (currency) =>
    DEMO_BANK_ACCOUNTS.filter((account) => account.currency === currency).reduce(
      (sum, account) => sum + Math.max(0, account.settledBalance - account.requiredBuffer),
      0,
    ),
  );
}

export function getLiquiditySnapshot(): LiquiditySnapshot {
  console.time("liquidity-snapshot");

  const generatedAt = DEMO_NOW;
  const asOfDate = new Date(generatedAt);
  const forecast = buildDailyForecast({
    accounts: DEMO_BANK_ACCOUNTS,
    cashFlows: DEMO_CASH_FLOWS,
    startDate: asOfDate,
    horizonDays: FORECAST_HORIZON_DAYS,
    settlementRules: DEMO_SETTLEMENT_RULES,
    calendar: DEMO_BANK_CALENDAR,
  });
  const portfolioForecast = buildPortfolioForecast(forecast);
  const reconciliation = reconcileForecasts(forecast, portfolioForecast);
  const onlineCorrections = checkOnlineCorrections(DEMO_OBSERVED_MOVEMENTS);
  const anomalies = detectCashFlowAnomalies({
    cashFlows: DEMO_CASH_FLOWS,
    observedMovements: DEMO_OBSERVED_MOVEMENTS,
  });
  const bankDelayChecks = checkBankDelays({
    cashFlows: DEMO_CASH_FLOWS,
    observedMovements: DEMO_OBSERVED_MOVEMENTS,
    settlementRules: DEMO_SETTLEMENT_RULES,
    calendar: DEMO_BANK_CALENDAR,
  });
  const gaps = detectCashGaps(forecast);
  const explanations = gaps.map((gap) =>
    explainGap({
      gap,
      accounts: DEMO_BANK_ACCOUNTS,
      cashFlows: DEMO_CASH_FLOWS,
      settlementRules: DEMO_SETTLEMENT_RULES,
      calendar: DEMO_BANK_CALENDAR,
    }),
  );
  const recommendation = generateRecommendation({
    gaps,
    accounts: DEMO_BANK_ACCOUNTS,
    calendar: DEMO_BANK_CALENDAR,
  });

  console.timeEnd("liquidity-snapshot");

  return {
    generatedAt,
    totalCash: getTotalCash(),
    usableLiquidity: getCurrentUsableLiquidity(asOfDate),
    atRiskAmount: getAtRiskAmount(gaps),
    idleReserve: getIdleReserve(),
    forecast,
    portfolioForecast,
    reconciliation,
    onlineCorrections,
    anomalies,
    bankDelayChecks,
    gaps,
    explanations,
    recommendation,
  };
}

export function runForecast() {
  return getLiquiditySnapshot();
}
