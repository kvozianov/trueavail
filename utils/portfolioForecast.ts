import type { ForecastPoint, PortfolioForecastPoint, RiskStatus } from "@/types/finance";

type PortfolioBucket = {
  usableLiquidity: number;
  requiredBuffer: number;
  accountIds: Set<string>;
};

function getPortfolioRiskStatus(
  usableLiquidity: number,
  requiredBuffer: number,
): RiskStatus {
  if (usableLiquidity < 0) {
    return "Red";
  }

  if (usableLiquidity < requiredBuffer * 0.25) {
    return "Yellow";
  }

  return "Green";
}

function getBucketKey(point: ForecastPoint) {
  return `${point.date}:${point.currency}`;
}

export function buildPortfolioForecast(
  forecast: ForecastPoint[],
): PortfolioForecastPoint[] {
  const buckets = new Map<string, PortfolioBucket>();

  forecast.forEach((point) => {
    const key = getBucketKey(point);
    const currentBucket = buckets.get(key) ?? {
      usableLiquidity: 0,
      requiredBuffer: 0,
      accountIds: new Set<string>(),
    };

    currentBucket.usableLiquidity += point.usableLiquidity;
    currentBucket.requiredBuffer += point.requiredBuffer;
    currentBucket.accountIds.add(point.accountId);

    buckets.set(key, currentBucket);
  });

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    const [date, currency] = key.split(":") as [string, PortfolioForecastPoint["currency"]];

    return {
      date,
      currency,
      usableLiquidity: bucket.usableLiquidity,
      requiredBuffer: bucket.requiredBuffer,
      riskStatus: getPortfolioRiskStatus(bucket.usableLiquidity, bucket.requiredBuffer),
      accountCount: bucket.accountIds.size,
    };
  });
}
