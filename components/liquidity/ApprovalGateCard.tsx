import { formatGateDecision } from "@/lib/backend/formatters";
import { mapGateToStatus } from "@/lib/backend/mappers";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

type ApprovalGateCardProps = {
  approvalGate?: unknown;
};

export function ApprovalGateCard({ approvalGate }: ApprovalGateCardProps) {
  const gate = mapGateToStatus(approvalGate);

  if (!gate.decision && !gate.blockers.length && !gate.warnings.length) {
    return (
      <EmptyState
        title="No governance gate"
        message="The backend did not return approval_gate for this scenario."
        fieldName="stress.approval_gate"
      />
    );
  }

  return (
    <section className="panel gate-card" aria-labelledby="gate-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Governance gate</p>
          <h3 id="gate-title">{formatGateDecision(gate.decision)}</h3>
        </div>
        <StatusBadge value={gate.decision} context="gate" />
      </div>
      {gate.reason ? <p className="muted">{gate.reason}</p> : null}
      {gate.canAutoApprove !== undefined ? (
        <p className="gate-card__flag">
          Auto approval: <strong>{gate.canAutoApprove ? "Permitted" : "Blocked"}</strong>
        </p>
      ) : null}
      <GateList title="Blockers" rows={gate.blockers} />
      <GateList title="Warnings" rows={gate.warnings} />
      <GateList title="Required next actions" rows={gate.requiredNextActions} />
    </section>
  );
}

function GateList({ title, rows }: { title: string; rows: unknown[] }) {
  if (!rows.length) {
    return null;
  }

  return (
    <div className="gate-card__list">
      <h4>{title}</h4>
      <ul>
        {rows.map((row, index) => (
          <li key={`${title}-${index}`}>{String(row)}</li>
        ))}
      </ul>
    </div>
  );
}
