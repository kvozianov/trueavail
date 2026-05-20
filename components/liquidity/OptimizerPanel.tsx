"use client";

import { useState } from "react";
import { formatCompactNumber, formatCurrencyAmount, formatSolverStatus, titleize } from "@/lib/backend/formatters";
import { canApproveRecommendation, getHhiValue, mapGateToStatus, mapOptimizerToRecommendationView } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { ApprovalResponse, OptimizerResponse } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";
import { TransferPlanTable } from "./TransferPlanTable";

type OptimizerPanelProps = {
  optimizerResponse?: OptimizerResponse | null;
  approvalGate?: unknown;
  approvalResponse?: ApprovalResponse;
  approvalError?: BackendError;
  approvalLoading?: boolean;
  onApprove: (approvedBy: string, reason: string) => void;
  onExplain: () => void;
  onOpenContingency: () => void;
  loading?: boolean;
  error?: BackendError;
};

export function OptimizerPanel({
  optimizerResponse,
  approvalGate,
  approvalResponse,
  approvalError,
  approvalLoading,
  onApprove,
  onExplain,
  onOpenContingency,
  loading,
  error,
}: OptimizerPanelProps) {
  const [approvedBy, setApprovedBy] = useState("demo.treasury@fintech.local");
  const [reason, setReason] = useState("Approved optimizer recommendation");
  const [blockedApprovalNotice, setBlockedApprovalNotice] = useState("");
  const view = mapOptimizerToRecommendationView(optimizerResponse);
  const gate = mapGateToStatus(approvalGate);
  const approvalEnabled = canApproveRecommendation(optimizerResponse, approvalGate);

  return (
    <section className="panel workflow-panel" id="optimizer" aria-labelledby="optimizer-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Optimizer</p>
          <h2 id="optimizer-title">Transfer recommendation</h2>
        </div>
        <StatusBadge value={view.status} context="optimizer" />
      </div>

      {error ? <ErrorState error={error} /> : null}
      {loading && !optimizerResponse ? <LoadingSkeleton variant="table" /> : null}

      {optimizerResponse ? (
        <>
          <div className="metric-grid metric-grid--four">
            <div className="mini-metric">
              <span>Status</span>
              <strong>{formatSolverStatus(view.status)}</strong>
            </div>
            <div className="mini-metric">
              <span>Solver engine</span>
              <strong>{view.solverEngine ?? "N/A"}</strong>
            </div>
            <div className="mini-metric">
              <span>Objective value</span>
              <strong>{formatCompactNumber(view.objectiveValue)}</strong>
            </div>
            <div className="mini-metric">
              <span>Total transfer cost</span>
              <strong>{formatCompactNumber(view.totalTransferCost)}</strong>
            </div>
          </div>

          {view.infeasibleReason ? (
            <div className="alert alert--danger">
              <strong>Approval blocked</strong>
              <span>{view.infeasibleReason}</span>
            </div>
          ) : null}

          <div className="split-grid split-grid--tight">
            <div className="mini-metric mini-metric--inline">
              <span>HHI before</span>
              <strong>{formatHhi(view.hhiBefore)}</strong>
            </div>
            <div className="mini-metric mini-metric--inline">
              <span>HHI after</span>
              <strong>{formatHhi(view.hhiAfter)}</strong>
            </div>
          </div>

          <h3 className="section-title">Transfer routes</h3>
          <TransferPlanTable transfers={view.transfers} />

          <div className="optimizer-actions">
            <div className="approval-form" aria-label="Mock approval form">
              <label>
                Approved by
                <input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} />
              </label>
              <label>
                Reason
                <input value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <button
                className="button button--primary"
                type="button"
                disabled={approvalLoading}
                onClick={() => {
                  if (!approvalEnabled) {
                    setBlockedApprovalNotice(
                      `Mock gate blocked this approval. ${gate.decision ? `Gate decision: ${titleize(gate.decision)}.` : "The current recommendation is not feasible."}`,
                    );
                    return;
                  }
                  setBlockedApprovalNotice("");
                  onApprove(approvedBy, reason);
                }}
                title={!approvalEnabled ? "Approval requires transfers, balances, feasible optimizer status, and a permissive gate." : undefined}
              >
                {approvalLoading ? "Approving" : "Approve recommendation"}
              </button>
            </div>
            <button className="button button--secondary" type="button" onClick={onExplain}>View explanation</button>
            <button className="button button--secondary" type="button" onClick={onOpenContingency}>View contingency plan</button>
          </div>

          {!approvalEnabled ? (
            <p className="muted">
              Approval is guarded because the current recommendation is not both feasible and governance-approved.
              {gate.decision ? ` Gate decision: ${titleize(gate.decision)}.` : ""}
            </p>
          ) : null}

          {blockedApprovalNotice ? <p className="demo-form__error" role="status">{blockedApprovalNotice}</p> : null}

          {approvalError ? <ErrorState title="Approval failed" error={approvalError} /> : null}
          {approvalResponse ? (
            <div className="approval-result">
              <StatusBadge value={approvalResponse.approved ? "approved" : "rejected"} context="gate" />
              <span>
                Mock approval recorded by {approvalResponse.approved_by ?? "N/A"}.
                Total amount {formatCompactNumber(approvalResponse.total_transfer_amount)}.
              </span>
            </div>
          ) : null}

          <div className="split-grid">
            <KeyValueTable title="Exposure limits" values={view.exposureLimits} formatter={formatExposureLimit} emptyField="optimizer.bank_exposure_limits" />
            <KeyValueTable title="Survival floors" values={view.survivalMinBalances} formatter={(value) => formatCurrencyAmount(value)} emptyField="optimizer.survival_min_balances" />
          </div>

          <div className="split-grid">
            <div>
              <h3 className="section-title">Audit events</h3>
              {view.auditEvents.length ? (
                <ul className="event-list">
                  {view.auditEvents.map((event, index) => (
                    <li key={`${event.event_type}-${index}`}>
                      <strong>{titleize(event.event_type)}</strong>
                      <span>{event.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No audit events" fieldName="optimizer.audit_events" />
              )}
            </div>
            <div>
              <h3 className="section-title">Formula basis</h3>
              {view.formulas.length ? (
                <div className="formula-stack">
                  {view.formulas.slice(0, 3).map((formula) => (
                    <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No optimizer formulas" fieldName="optimizer.formulas" />
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function formatHhi(hhi: OptimizerResponse["hhi_after"]) {
  const value = getHhiValue(hhi);
  return typeof value === "number" ? value.toFixed(3) : "N/A";
}

function formatExposureLimit(value: number, key: string) {
  const [, currency] = key.split(":");
  return formatCurrencyAmount(value, currency);
}

function KeyValueTable({
  title,
  values,
  formatter,
  emptyField,
}: {
  title: string;
  values: Record<string, number>;
  formatter: (value: number, key: string) => string;
  emptyField: string;
}) {
  const rows = Object.entries(values);

  return (
    <div>
      <h3 className="section-title">{title}</h3>
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Key</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td className="num">{formatter(value, key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={`No ${title.toLowerCase()}`} fieldName={emptyField} />
      )}
    </div>
  );
}
