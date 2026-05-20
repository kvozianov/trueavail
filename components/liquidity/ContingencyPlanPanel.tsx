import { formatCompactNumber, formatCurrencyAmount, formatDate, titleize } from "@/lib/backend/formatters";
import { mapContingencyToActionList } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { ContingencyPlanResponse } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";

type ContingencyPlanPanelProps = {
  plan?: ContingencyPlanResponse;
  loading?: boolean;
  error?: BackendError;
  onRetry?: () => void;
};

export function ContingencyPlanPanel({ plan, loading, error, onRetry }: ContingencyPlanPanelProps) {
  const view = mapContingencyToActionList(plan);

  return (
    <section className="panel workflow-panel" id="contingency" aria-labelledby="contingency-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Emergency playbook</p>
          <h2 id="contingency-title">Contingency plan</h2>
        </div>
        <StatusBadge value={view.planStatus} />
      </div>

      {error ? <ErrorState error={error} onRetry={onRetry} /> : null}
      {loading && !plan ? <LoadingSkeleton variant="table" /> : null}

      {plan ? (
        <>
          <div className="metric-grid metric-grid--four">
            <div className="mini-metric">
              <span>p05 gap</span>
              <strong>{formatCompactNumber(view.p05Gap)}</strong>
            </div>
            <div className="mini-metric">
              <span>Deferrable coverage</span>
              <strong>{formatCompactNumber(view.deferrableCoverage)}</strong>
            </div>
            <div className="mini-metric">
              <span>Intraday credit need</span>
              <strong>{formatCompactNumber(view.intradayCreditNeed)}</strong>
            </div>
            <div className="mini-metric">
              <span>Gate decision</span>
              <strong>{titleize(view.gateDecision)}</strong>
            </div>
          </div>

          {view.optimizerReason ? (
            <div className="alert alert--warning">
              <strong>Optimizer blocker</strong>
              <span>{view.optimizerReason}</span>
            </div>
          ) : null}

          <h3 className="section-title">Action checklist</h3>
          {view.actions.length ? (
            <ol className="action-list">
              {view.actions.map((action, index) => {
                const record = typeof action === "object" && action !== null ? action as Record<string, unknown> : {};
                return (
                  <li key={`${record.action_type ?? "action"}-${index}`}>
                    <div className="action-list__marker">{index + 1}</div>
                    <div className="action-list__body">
                      <div>
                        <h4>{titleize(record.action_type)}</h4>
                        <StatusBadge value={record.priority} />
                      </div>
                      <p>{String(record.description ?? "No description returned.")}</p>
                      <dl>
                        <div><dt>Amount</dt><dd>{formatCurrencyAmount(record.amount, record.currency)}</dd></div>
                        <div><dt>Deadline</dt><dd>{formatDate(record.deadline)}</dd></div>
                        <div><dt>Account</dt><dd>{String(record.account_id ?? "N/A")}</dd></div>
                        <div><dt>Rails</dt><dd>{Array.isArray(record.candidate_rails) ? record.candidate_rails.join(", ") : "N/A"}</dd></div>
                      </dl>
                      {record.formula ? <code>{String(record.formula)}</code> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState title="No contingency actions" fieldName="contingency.actions" />
          )}

          <h3 className="section-title">Formula basis</h3>
          {view.formulas.length ? (
            <div className="formula-grid">
              {view.formulas.map((formula) => (
                <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
              ))}
            </div>
          ) : (
            <EmptyState title="No contingency formulas" fieldName="contingency.formulas" />
          )}
        </>
      ) : null}
    </section>
  );
}
