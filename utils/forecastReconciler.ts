import type {
  ForecastPoint,
  ForecastReconciliationPoint,
  PortfolioForecastPoint,
} from "@/types/finance";

const RECONCILIATION_TOLERANCE = 1;

function getForecastKey(date: string, currency: string) {
  return `${date}:${currency}`;
}

function sumAccountForecast(forecast: ForecastPoint[]) {
  const totals = new Map<string, number>();

  forecast.forEach((point) => {
    const key = getForecastKey(point.date, point.currency);
    const currentTotal = totals.get(key) ?? 0;

    totals.set(key, currentTotal + point.usableLiquidity);
  });

  return totals;
}

export function reconcileForecasts(
  accountForecast: ForecastPoint[],
  portfolioForecast: PortfolioForecastPoint[],
): ForecastReconciliationPoint[] {
  const accountTotals = sumAccountForecast(accountForecast);

  return portfolioForecast.map((point) => {
    const key = getForecastKey(point.date, point.currency);
    const accountLevelUsableLiquidity = accountTotals.get(key) ?? 0;
    const difference = accountLevelUsableLiquidity - point.usableLiquidity;

    return {
      date: point.date,
      currency: point.currency,
      accountLevelUsableLiquidity,
      portfolioLevelUsableLiquidity: point.usableLiquidity,
      difference,
      matched: Math.abs(difference) <= RECONCILIATION_TOLERANCE,
    };
  });
}
