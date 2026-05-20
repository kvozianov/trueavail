import { formatCompactNumber, formatCurrencyAmount, formatPercent } from "@/lib/backend/formatters";
import { getHhiValue, hhiContributionRows, mapStressToScenarioView } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { ScenarioId, StressScenarioResponse } from "@/lib/backend/types";
import { ApprovalGateCard } from "./ApprovalGateCard";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";

type StressScenarioPanelProps = {
  selectedScenario: ScenarioId;
  onScenarioChange: (scenario: ScenarioId) => void;
  runOptimizer: boolean;
  onRunOptimizerChange: (value: boolean) => void;
  downgradeBankId?: string;
  onDowngradeBankChange: (value: string) => void;
  bankOptions?: string[];
  stressResponse?: StressScenarioResponse;
  onRun: () => void;
  loading?: boolean;
  error?: BackendError;
};

export function StressScenarioPanel({
  selectedScenario,
  onScenarioChange,
  runOptimizer,
  onRunOptimizerChange,
  downgradeBankId,
  onDowngradeBankChange,
  bankOptions = [],
  stressResponse,
  onRun,
  loading,
  error,
}: StressScenarioPanelProps) {
  const view = mapStressToScenarioView(stressResponse);

  return (
    <section className="panel workflow-panel" id="stress" aria-labelledby="stress-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Stress Lab</p>
          <h2 id="stress-title">{view.scenarioName}</h2>
        </div>
        <StatusBadge value={view.gate.decision} context="gate" />
      </div>

      <div className="control-strip">
        <label>
          Scenario
          <select value={selectedScenario} onChange={(event) => onScenarioChange(event.target.value as ScenarioId)}>
            <option value="bank_run">Bank run</option>
            <option value="target2_outage">TARGET2 outage</option>
          </select>
        </label>
        <label>
          Downgrade bank
          <select value={downgradeBankId ?? ""} onChange={(event) => onDowngradeBankChange(event.target.value)}>
            <option value="">Backend default</option>
            {bankOptions.map((bank) => (
              <option value={bank} key={bank}>{bank}</option>
            ))}
          </select>
        </label>
        <label className="toggle-field">
          <input
            checked={runOptimizer}
            type="checkbox"
            onChange={(event) => onRunOptimizerChange(event.target.checked)}
          />
          Run optimizer
        </label>
        <button className="button button--primary" type="button" onClick={onRun} disabled={loading}>
          {loading ? "Running" : "Run stress"}
        </button>
      </div>

      {error ? <ErrorState error={error} onRetry={onRun} /> : null}
      {loading && !stressResponse ? <LoadingSkeleton variant="table" /> : null}

      {stressResponse ? (
        <>
          <div className="metric-grid metric-grid--four">
            <div className="mini-metric">
              <span>Total loss</span>
              <strong>{formatCompactNumber(view.totalLoss)}</strong>
            </div>
            <div className="mini-metric">
              <span>ES99</span>
              <strong>{formatCompactNumber(view.es99)}</strong>
            </div>
            <div className="mini-metric">
              <span>HHI before</span>
              <strong>{formatHhi(view.hhiBefore)}</strong>
            </div>
            <div className="mini-metric">
              <span>HHI after</span>
              <strong>{formatHhi(view.hhiAfter)}</strong>
            </div>
          </div>

          <div className="split-grid">
            <div>
              <h3 className="section-title">Stressed balances</h3>
              {view.balances.length ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Bank</th>
                        <th>Currency</th>
                        <th className="num">Before</th>
                        <th className="num">After</th>
                        <th className="num">Loss</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.balances.map((row, index) => (
                        <tr key={`${row.account_id}-${index}`}>
                          <td>{row.account_id ?? "N/A"}</td>
                          <td>{row.bank_name ?? row.bank_id ?? "N/A"}</td>
                          <td>{row.currency ?? "N/A"}</td>
                          <td className="num">{formatCurrencyAmount(row.balance_before, row.currency)}</td>
                          <td className="num">{formatCurrencyAmount(row.balance_after, row.currency)}</td>
                          <td className="num">{formatCurrencyAmount(row.loss_amount, row.currency)}</td>
                          <td><StatusBadge value={row.below_buffer ? "breach" : "safe"} context="risk" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No stressed balances" fieldName="stress.balances" />
              )}
            </div>
            <div>
              <h3 className="section-title">Concentration after stress</h3>
              <HhiBars hhi={view.hhiAfter} />
              <ApprovalGateCard approvalGate={stressResponse.approval_gate} />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatHhi(hhi: StressScenarioResponse["hhi_after"]) {
  const value = getHhiValue(hhi);
  return typeof value === "number" ? value.toFixed(3) : "N/A";
}

function HhiBars({ hhi }: { hhi?: StressScenarioResponse["hhi_after"] }) {
  const rows = hhiContributionRows(hhi);

  if (!rows.length) {
    return <EmptyState title="No HHI contributions" fieldName="hhi_after.contributions" />;
  }

  return (
    <div className="hhi-bars">
      {rows.map((row) => (
        <div className="hhi-bars__row" key={row.label}>
          <div>
            <span>{row.label}</span>
            <strong>{row.displayValue}</strong>
          </div>
          <div className="hhi-bars__track">
            <span style={{ width: `${Math.min(row.value * 100, 100)}%` }} />
          </div>
        </div>
      ))}
      {hhi?.threshold ? <p className="muted">Policy threshold {formatPercent(hhi.threshold)}</p> : null}
    </div>
  );
}
