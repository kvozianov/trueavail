import { formatCurrencyAmount, formatDate, titleize } from "@/lib/backend/formatters";
import { mapExplanationToDrawer } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { ExplanationResponse } from "@/lib/backend/types";
import { DataQualityPanel } from "./DataQualityPanel";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";

type ExplainabilityDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explanation?: ExplanationResponse;
  loading?: boolean;
  error?: BackendError;
};

export function ExplainabilityDrawer({ open, onOpenChange, explanation, loading, error }: ExplainabilityDrawerProps) {
  if (!open) {
    return null;
  }

  const view = mapExplanationToDrawer(explanation);

  return (
    <div className="drawer-backdrop" role="presentation" onClick={() => onOpenChange(false)}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explainability-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer__header">
          <div>
            <p className="eyebrow">Explainability</p>
            <h2 id="explainability-title">Why this recommendation?</h2>
          </div>
          <button className="button button--secondary" type="button" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>

        {error ? <ErrorState error={error} /> : null}
        {loading && !explanation ? <LoadingSkeleton variant="drawer" /> : null}

        {explanation ? (
          <div className="drawer__body">
            <div className="explanation-summary">
              <StatusBadge value={view.riskStatus} context="risk" />
              <p>{view.summary ?? "No summary returned."}</p>
              <div className="meta-grid">
                <span>Affected account <strong>{view.affectedAccount ?? "N/A"}</strong></span>
                <span>Currency <strong>{view.affectedCurrency ?? "N/A"}</strong></span>
              </div>
            </div>

            <section>
              <h3 className="section-title">Root causes</h3>
              {view.rootCauses.length ? (
                <div className="cause-list">
                  {view.rootCauses.map((cause, index) => {
                    const record = typeof cause === "object" && cause !== null ? cause as Record<string, unknown> : {};
                    return (
                      <article className="cause-card" key={`${record.title ?? "cause"}-${index}`}>
                        <div>
                          <h4>{String(record.title ?? titleize(record.type))}</h4>
                          <p>{String(record.detail ?? "No detail returned.")}</p>
                        </div>
                        {typeof record.amount === "number" ? <strong>{formatCurrencyAmount(record.amount, view.affectedCurrency)}</strong> : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No root causes" fieldName="explanation.root_causes" />
              )}
            </section>

            <section>
              <h3 className="section-title">Timeline</h3>
              {view.timeline.length ? (
                <ol className="timeline">
                  {view.timeline.map((item, index) => {
                    const record = typeof item === "object" && item !== null ? item as Record<string, unknown> : {};
                    return (
                      <li key={`${record.date ?? "timeline"}-${record.label ?? "event"}-${index}`}>
                        <time>{formatDate(record.date)}</time>
                        <strong>{String(record.label ?? "Event")}</strong>
                        <span>{String(record.detail ?? "No detail returned.")}</span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState title="No timeline" fieldName="explanation.timeline" />
              )}
            </section>

            <section>
              <h3 className="section-title">Formula cards</h3>
              {view.formulas.length ? (
                <div className="formula-stack">
                  {view.formulas.map((formula) => (
                    <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No formula cards" fieldName="explanation.formula_cards" />
              )}
            </section>

            <section>
              <h3 className="section-title">Data quality notes</h3>
              <DataQualityPanel notes={view.dataQualityNotes} />
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
