import { LoadingSkeleton } from "./LoadingSkeleton";
import type { MetricTone } from "@/lib/backend/types";

type MetricCardProps = {
  title: string;
  value?: string;
  subtitle?: string;
  status?: MetricTone;
  trend?: string;
  tooltip?: string;
  loading?: boolean;
  error?: string;
};

export function MetricCard({ title, value, subtitle, status, trend, tooltip, loading, error }: MetricCardProps) {
  if (loading) {
    return (
      <article className="metric-card">
        <LoadingSkeleton />
      </article>
    );
  }

  return (
    <article className={`metric-card ${status ? `metric-card--${status}` : ""}`} title={tooltip}>
      <div className="metric-card__topline">
        <span>{title}</span>
        <span className="metric-card__icon" aria-hidden="true">{iconForStatus(status)}</span>
      </div>
      <div className="metric-card__value">{error ? "N/A" : value ?? "N/A"}</div>
      <div className="metric-card__footer">
        <span>{error ?? subtitle ?? "Verified backend field"}</span>
        {trend ? <strong>{trend}</strong> : null}
      </div>
    </article>
  );
}

function iconForStatus(status?: MetricTone) {
  if (status === "danger") return "△";
  if (status === "warning") return "◷";
  if (status === "positive") return "✓";
  if (status === "info") return "⌁";
  return "▣";
}
