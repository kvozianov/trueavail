import { formatCompactNumber, formatCurrencyAmount, titleize } from "@/lib/backend/formatters";
import { mapRoiToExecutiveMetrics } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { RoiResponse } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";

type RoiSummaryPanelProps = {
  roi?: RoiResponse;
  loading?: boolean;
  error?: BackendError;
  onRetry?: () => void;
};

export function RoiSummaryPanel({ roi, loading, error, onRetry }: RoiSummaryPanelProps) {
  const view = mapRoiToExecutiveMetrics(roi);

  return (
    <section className="panel workflow-panel" id="roi" aria-labelledby="roi-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">CFO economics</p>
          <h2 id="roi-title">ROI summary</h2>
        </div>
        <StatusBadge value={view.gate.decision} context="gate" />
      </div>

      {error ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {loading && !roi ? <LoadingSkeleton variant="card" /> : null}

      {roi ? (
        <>
          <p className="executive-copy">{view.summary ?? "No executive summary returned."}</p>
          <div className="metric-grid metric-grid--four">
            <div className="mini-metric">
              <span>Optimizer cost</span>
              <strong>{formatCompactNumber(view.optimizerCost)}</strong>
            </div>
            <div className="mini-metric">
              <span>ES99</span>
              <strong>{formatCompactNumber(view.expectedShortfall99)}</strong>
            </div>
            <div className="mini-metric">
              <span>Avoided gap</span>
              <strong>{formatCompactNumber(view.avoidedGap)}</strong>
            </div>
            <div className="mini-metric">
              <span>Released reserve</span>
              <strong>{formatCompactNumber(view.releasedReserve)}</strong>
            </div>
          </div>

          <h3 className="section-title">Before / after metrics</h3>
          {view.metrics.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="num">Before</th>
                    <th className="num">After</th>
                    <th>Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {view.metrics.map((metric, index) => {
                    const record = typeof metric === "object" && metric !== null ? metric as Record<string, unknown> : {};
                    const unit = typeof record.unit === "string" ? record.unit : undefined;
                    return (
                      <tr key={`${record.label ?? "metric"}-${index}`}>
                        <td>{String(record.label ?? "N/A")}</td>
                        <td className="num">{formatMetricValue(record.before, unit)}</td>
                        <td className="num">{formatMetricValue(record.after, unit)}</td>
                        <td>{String(record.explanation ?? "N/A")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No ROI metrics" fieldName="roi.metrics" />
          )}

          <h3 className="section-title">Formula basis</h3>
          {view.formulas.length ? (
            <div className="formula-grid">
              {view.formulas.map((formula) => (
                <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
              ))}
            </div>
          ) : (
            <EmptyState title="No ROI formulas" fieldName="roi.formulas" />
          )}
        </>
      ) : null}
    </section>
  );
}

function formatMetricValue(value: unknown, unit?: string) {
  if (typeof value === "number") {
    if (unit === "currency") return formatCurrencyAmount(value);
    if (unit === "percent") return `${value}%`;
    return formatCompactNumber(value);
  }

  if (typeof value === "string" && value.trim()) {
    return titleize(value);
  }

  return "N/A";
}
