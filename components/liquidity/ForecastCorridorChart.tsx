"use client";

import { useMemo } from "react";
import { formatCurrencyAmount, formatDate } from "@/lib/backend/formatters";
import { mapForecastToChartSeries } from "@/lib/backend/mappers";
import type { ForecastPoint } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

type ForecastCorridorChartProps = {
  forecast?: ForecastPoint[];
  selectedAccount?: string;
  selectedCurrency?: string;
  showBuffer?: boolean;
  showKnownEvents?: boolean;
};

type ChartPoint = {
  date: string;
  account?: string;
  currency?: string;
  p05: number;
  p50: number;
  p95: number;
  buffer?: number;
  scheduledNetFlow?: number;
  breach?: boolean;
  riskStatus?: string;
  knownEvents?: unknown[];
};

export function ForecastCorridorChart({
  forecast,
  selectedAccount,
  selectedCurrency,
  showBuffer = true,
  showKnownEvents = true,
}: ForecastCorridorChartProps) {
  const chartData = useMemo(
    () => buildChartData(forecast, selectedAccount, selectedCurrency),
    [forecast, selectedAccount, selectedCurrency],
  );

  if (!chartData.length) {
    return (
      <EmptyState
        title="No forecast corridor"
        message="The backend did not return forecast rows for the active filter."
        fieldName="forecast.forecast"
      />
    );
  }

  const values = chartData.flatMap((point) => [point.p05, point.p50, point.p95, point.buffer ?? point.p50]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max((maxValue - minValue) * 0.12, 1);
  const domainMin = minValue - padding;
  const domainMax = maxValue + padding;

  const xFor = (index: number) => (chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100);
  const yFor = (value: number) => 92 - ((value - domainMin) / (domainMax - domainMin || 1)) * 84;
  const pathFor = (key: "p05" | "p50" | "p95" | "buffer") =>
    chartData
      .map((point, index) => {
        const value = key === "buffer" ? point.buffer : point[key];
        if (typeof value !== "number") return "";
        return `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(value).toFixed(2)}`;
      })
      .filter(Boolean)
      .join(" ");

  const corridorPath = [
    ...chartData.map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(point.p95).toFixed(2)}`),
    ...chartData
      .map((point, index) => `L ${xFor(chartData.length - index - 1).toFixed(2)} ${yFor(chartData[chartData.length - index - 1].p05).toFixed(2)}`)
      .filter(Boolean),
    "Z",
  ].join(" ");

  const start = chartData[0];
  const end = chartData[chartData.length - 1];
  const breachCount = chartData.filter((point) => point.breach).length;

  return (
    <div className="chart-card">
      <div className="chart-card__summary">
        <div>
          <p>Downside corridor</p>
          <strong>{formatCurrencyAmount(end.p05, end.currency)}</strong>
        </div>
        <div>
          <p>Median forecast</p>
          <strong>{formatCurrencyAmount(end.p50, end.currency)}</strong>
        </div>
        <div>
          <p>Breach markers</p>
          <strong>{breachCount}</strong>
        </div>
        <StatusBadge value={end.riskStatus} context="risk" />
      </div>

      <div className="forecast-chart" role="img" aria-label="p05 p50 p95 liquidity forecast corridor">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="corridor-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <path className="chart-grid" d="M 0 8 H 100 M 0 29 H 100 M 0 50 H 100 M 0 71 H 100 M 0 92 H 100" />
          <path className="chart-corridor" d={corridorPath} />
          <path className="chart-line chart-line--p95" d={pathFor("p95")} />
          <path className="chart-line chart-line--p50" d={pathFor("p50")} />
          <path className="chart-line chart-line--p05" d={pathFor("p05")} />
          {showBuffer ? <path className="chart-line chart-line--buffer" d={pathFor("buffer")} /> : null}
          {chartData.map((point, index) => {
            const x = xFor(index);
            const y = yFor(point.p50);
            const hasEvent = showKnownEvents && Boolean(point.knownEvents?.length);
            return (
              <g key={`${point.date}-${point.account}-${point.currency}`}>
                <circle
                  className={point.breach ? "chart-point chart-point--breach" : "chart-point"}
                  cx={x}
                  cy={y}
                  r={point.breach ? 1.5 : 0.9}
                >
                  <title>{tooltipForPoint(point)}</title>
                </circle>
                {hasEvent ? <rect className="chart-event" x={x - 0.8} y={4} width="1.6" height="88" rx="0.4" /> : null}
              </g>
            );
          })}
        </svg>
        <div className="chart-axis chart-axis--x">
          <span>{formatDate(start.date)}</span>
          <span>{formatDate(end.date)}</span>
        </div>
        <div className="chart-axis chart-axis--y">
          <span>{formatCurrencyAmount(domainMax, start.currency)}</span>
          <span>{formatCurrencyAmount(domainMin, start.currency)}</span>
        </div>
      </div>

      <div className="chart-legend">
        <span><i className="legend-line legend-line--p50" />p50</span>
        <span><i className="legend-line legend-line--p05" />p05</span>
        <span><i className="legend-line legend-line--p95" />p95</span>
        {showBuffer ? <span><i className="legend-line legend-line--buffer" />Required buffer</span> : null}
      </div>
    </div>
  );
}

function buildChartData(forecast: ForecastPoint[] | undefined, selectedAccount?: string, selectedCurrency?: string): ChartPoint[] {
  const rows = mapForecastToChartSeries(forecast).filter((point) => {
    if (selectedAccount && point.account_id !== selectedAccount) return false;
    if (selectedCurrency && point.currency !== selectedCurrency) return false;
    return typeof point.p05 === "number" && typeof point.p50 === "number" && typeof point.p95 === "number";
  });

  if (!rows.length) {
    return [];
  }

  const hasSingleAccount = new Set(rows.map((row) => row.account_id)).size <= 1;
  const hasSingleCurrency = new Set(rows.map((row) => row.currency)).size <= 1;

  if (hasSingleAccount && hasSingleCurrency) {
    return rows.map((row) => ({
      date: row.date ?? "",
      account: row.account_id,
      currency: row.currency,
      p05: row.p05 ?? 0,
      p50: row.p50 ?? 0,
      p95: row.p95 ?? 0,
      buffer: row.required_buffer,
      scheduledNetFlow: row.scheduled_net_flow,
      breach: row.breach,
      riskStatus: row.risk_status,
      knownEvents: row.known_events,
    }));
  }

  const grouped = new Map<string, ChartPoint>();
  for (const row of rows) {
    const date = row.date ?? "";
    const current = grouped.get(date) ?? {
      date,
      currency: row.currency,
      p05: 0,
      p50: 0,
      p95: 0,
      buffer: 0,
      scheduledNetFlow: 0,
      breach: false,
      riskStatus: "Green",
      knownEvents: [],
    };
    current.p05 += row.p05 ?? 0;
    current.p50 += row.p50 ?? 0;
    current.p95 += row.p95 ?? 0;
    current.buffer = (current.buffer ?? 0) + (row.required_buffer ?? 0);
    current.scheduledNetFlow = (current.scheduledNetFlow ?? 0) + (row.scheduled_net_flow ?? 0);
    current.breach = current.breach || Boolean(row.breach);
    current.riskStatus = current.breach ? "Red" : current.riskStatus;
    current.knownEvents = [...(current.knownEvents ?? []), ...asUnknownArray(row.known_events)];
    grouped.set(date, current);
  }

  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function asUnknownArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function tooltipForPoint(point: ChartPoint) {
  return [
    formatDate(point.date),
    point.account ? `Account: ${point.account}` : undefined,
    point.currency ? `Currency: ${point.currency}` : undefined,
    `p05: ${formatCurrencyAmount(point.p05, point.currency)}`,
    `p50: ${formatCurrencyAmount(point.p50, point.currency)}`,
    `p95: ${formatCurrencyAmount(point.p95, point.currency)}`,
    point.buffer !== undefined ? `Buffer: ${formatCurrencyAmount(point.buffer, point.currency)}` : undefined,
    point.scheduledNetFlow !== undefined ? `Scheduled net flow: ${formatCurrencyAmount(point.scheduledNetFlow, point.currency)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}
