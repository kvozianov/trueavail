"use client";

import type { ReactNode } from "react";
import type {
  AnalysisStepState,
  DeepAnalyticsFunction,
  DeepAnalyticsGroup,
  EnsembleAnalysisResult,
  IncidentLifecycle,
  LiquidityIncident,
} from "@/lib/liquidity-ml-ensemble";
import { functionGroups } from "@/lib/liquidity-ml-ensemble";

type IncidentAnalysisPanelProps = {
  incident: LiquidityIncident;
  lifecycle: IncidentLifecycle;
  steps: AnalysisStepState[];
  progress: number;
  result: EnsembleAnalysisResult | null;
  error: string;
  ticketId: string;
  onAnalyze: () => void;
  onRetry: () => void;
  onSimulateFailure: () => void;
  onOpenDetails: () => void;
  onDownloadReport: () => void;
  onCreateTicket: () => void;
  onAcceptRecommendation: () => void;
  onCloseIncident: () => void;
  onViewModels: () => void;
};

type DeepAnalyticsMatrixProps = {
  activeGroup: DeepAnalyticsGroup;
  functions: DeepAnalyticsFunction[];
  result: EnsembleAnalysisResult | null;
  onGroupChange: (group: DeepAnalyticsGroup) => void;
  onOpenFunction: (item: DeepAnalyticsFunction) => void;
};

type DialogFrameProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  narrow?: boolean;
};

export function IncidentAnalysisPanel({
  incident,
  lifecycle,
  steps,
  progress,
  result,
  error,
  ticketId,
  onAnalyze,
  onRetry,
  onSimulateFailure,
  onOpenDetails,
  onDownloadReport,
  onCreateTicket,
  onAcceptRecommendation,
  onCloseIncident,
  onViewModels,
}: IncidentAnalysisPanelProps) {
  const running = lifecycle === "analysisRunning";
  const closed = lifecycle === "incidentClosed";
  const completed = Boolean(result);

  return (
    <section className={`incident-console incident-console--${lifecycle}`} aria-label="Incident analytics console">
      <div className="incident-console__header">
        <div>
          <p className="eyebrow">Map Error Detected</p>
          <h2>{incident.title}</h2>
          <p>{incident.description}</p>
        </div>
        <span className={`incident-status-badge incident-status-badge--${lifecycle}`}>
          {statusLabel(lifecycle)}
        </span>
      </div>

      <dl className="incident-facts" aria-label="Incident facts">
        <div>
          <dt>Type</dt>
          <dd>{incident.type}</dd>
        </div>
        <div>
          <dt>Zone</dt>
          <dd>{incident.mapZone}</dd>
        </div>
        <div>
          <dt>Detected</dt>
          <dd>{formatDateTime(incident.detectedAt)}</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{incident.severity.toUpperCase()}</dd>
        </div>
      </dl>

      <div className="incident-action-row">
        <button
          className="command-button command-button--primary"
          disabled={running || closed}
          onClick={onAnalyze}
          type="button"
        >
          {running ? "Analyzing..." : completed ? "Run ML analysis again" : "Run ML analysis"}
        </button>
        <button className="command-button" disabled={running} onClick={onOpenDetails} type="button">
          Open details
        </button>
        <button className="command-button command-button--ghost" disabled={running || closed} onClick={onSimulateFailure} type="button">
          Simulate failed run
        </button>
      </div>

      {running || error || completed ? (
        <div className="analysis-progress-card">
          <div className="analysis-progress-card__top">
            <div>
              <span>ML ensemble pipeline</span>
              <strong>{error ? "Run needs attention" : completed ? "Analysis completed" : "Models are running"}</strong>
            </div>
            <b>{Math.round(progress)}%</b>
          </div>
          <div className="analysis-progress-bar" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className="analysis-step-list">
            {steps.map((step) => (
              <li className={`analysis-step analysis-step--${step.status}`} key={step.id}>
                <span>{step.status}</span>
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          {error ? (
            <div className="analysis-error" role="alert">
              <strong>Analysis failed</strong>
              <p>{error}</p>
              <button className="command-button command-button--primary" onClick={onRetry} type="button">
                Retry analysis
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="ensemble-result-card">
          <div className="ensemble-result-card__score">
            <span>Risk score</span>
            <strong>{result.riskScore}</strong>
            <small>{result.confidence}% confidence</small>
          </div>
          <div>
            <p className="eyebrow">Final Verdict</p>
            <h3>{result.finalVerdict}</h3>
            <p>{result.explanation}</p>
            <ul>
              {result.recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation}>{recommendation}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="incident-action-grid" aria-label="Post-analysis actions">
          <button className="command-button" onClick={onViewModels} type="button">View models</button>
          <button className="command-button" onClick={onDownloadReport} type="button">Download report</button>
          <button className="command-button" onClick={onCreateTicket} type="button">
            {ticketId ? `Ticket ${ticketId}` : "Create ticket"}
          </button>
          <button
            className="command-button"
            disabled={lifecycle === "recommendationAccepted" || closed}
            onClick={onAcceptRecommendation}
            type="button"
          >
            {lifecycle === "recommendationAccepted" ? "Recommendation accepted" : "Accept recommendation"}
          </button>
          <button
            className="command-button command-button--danger"
            disabled={closed}
            onClick={onCloseIncident}
            type="button"
          >
            {closed ? "Incident closed" : "Close incident"}
          </button>
        </div>
      ) : null}

      {ticketId || lifecycle === "recommendationAccepted" || closed ? (
        <div className="incident-lifecycle-note" role="status">
          <strong>Demo lifecycle updated</strong>
          <span>{lifecycleSummary(lifecycle, ticketId)}</span>
        </div>
      ) : null}
    </section>
  );
}

export function DeepAnalyticsMatrix({
  activeGroup,
  functions,
  result,
  onGroupChange,
  onOpenFunction,
}: DeepAnalyticsMatrixProps) {
  const groups = functionGroups();
  const visibleFunctions = functions.filter((item) => item.group === activeGroup);

  return (
    <section className="deep-analytics" aria-label="Deep analytics functions from the MVP document">
      <div className="section-heading">
        <p className="eyebrow">Deep Analytics For Jury</p>
        <h2>Every MVP function is visible and clickable</h2>
        <p>
          These cards turn the document functions into a live demo layer: each function has a signal, proof point,
          endpoint, and jury narrative.
        </p>
      </div>
      <div className="deep-analytics__tabs" role="tablist" aria-label="Analytics groups">
        {groups.map((group) => (
          <button
            aria-selected={group === activeGroup}
            className={group === activeGroup ? "deep-analytics__tab deep-analytics__tab--active" : "deep-analytics__tab"}
            key={group}
            onClick={() => onGroupChange(group)}
            role="tab"
            type="button"
          >
            {group}
          </button>
        ))}
      </div>
      <div className="deep-analytics__grid">
        {visibleFunctions.map((item) => (
          <button className="deep-function-card" key={item.id} onClick={() => onOpenFunction(item)} type="button">
            <span>{result ? "verified in demo" : "queued for analysis"}</span>
            <strong>{item.title}</strong>
            <small>{item.metric}</small>
            <p>{item.signal}</p>
            <em>{item.endpoint}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

export function IncidentDetailsDialog({
  incident,
  result,
  lifecycle,
  onClose,
}: {
  incident: LiquidityIncident;
  result: EnsembleAnalysisResult | null;
  lifecycle: IncidentLifecycle;
  onClose: () => void;
}) {
  return (
    <DialogFrame title="Incident details" onClose={onClose}>
      <div className="incident-dialog-grid">
        <section>
          <p className="eyebrow">Incident</p>
          <h3>{incident.title}</h3>
          <p>{incident.description}</p>
          <dl className="incident-dialog-facts">
            <div><dt>ID</dt><dd>{incident.id}</dd></div>
            <div><dt>Status</dt><dd>{statusLabel(lifecycle)}</dd></div>
            <div><dt>Coordinates</dt><dd>{incident.coordinates.latitude.toFixed(4)}, {incident.coordinates.longitude.toFixed(4)}</dd></div>
            <div><dt>Source</dt><dd>{incident.source}</dd></div>
          </dl>
        </section>
        <section>
          <p className="eyebrow">Expected vs observed</p>
          <h3>Why the marker is red</h3>
          <p><strong>Expected:</strong> {incident.expectedBehavior}</p>
          <p><strong>Observed:</strong> {incident.observedBehavior}</p>
          <ul>
            {incident.riskFactors.map((factor) => <li key={factor}>{factor}</li>)}
          </ul>
        </section>
      </div>
      {result ? (
        <section className="dialog-callout">
          <p className="eyebrow">Root cause</p>
          <h3>{result.rootCause}</h3>
          <ul>
            {result.evidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}
    </DialogFrame>
  );
}

export function ModelReportDialog({
  result,
  onClose,
}: {
  result: EnsembleAnalysisResult;
  onClose: () => void;
}) {
  return (
    <DialogFrame title="ML ensemble model report" onClose={onClose}>
      <div className="model-report-summary">
        <div><span>Verdict</span><strong>{result.finalVerdict}</strong></div>
        <div><span>Confidence</span><strong>{result.confidence}%</strong></div>
        <div><span>Risk score</span><strong>{result.riskScore}/100</strong></div>
      </div>
      <div className="model-vote-grid">
        {result.modelVotes.map((model) => (
          <article className={`model-vote-card model-vote-card--${model.status}`} key={model.modelName}>
            <div>
              <span>{model.vote}</span>
              <strong>{model.modelName}</strong>
            </div>
            <b>{model.confidence}%</b>
            <p>{model.explanation}</p>
            <ul>
              {model.detectedFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </DialogFrame>
  );
}

export function TicketDialog({
  submitting,
  ticketId,
  title,
  owner,
  note,
  error,
  onTitleChange,
  onOwnerChange,
  onNoteChange,
  onSubmit,
  onClose,
}: {
  submitting: boolean;
  ticketId: string;
  title: string;
  owner: string;
  note: string;
  error: string;
  onTitleChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFrame title="Create treasury ticket" onClose={onClose} narrow>
      {ticketId ? (
        <div className="demo-form__success" role="status">
          <strong>Ticket created</strong>
          <p>{ticketId} is linked to the incident and visible in the lifecycle state.</p>
        </div>
      ) : (
        <form
          className="demo-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            <span>Ticket title</span>
            <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
          </label>
          <label>
            <span>Owner</span>
            <input value={owner} onChange={(event) => onOwnerChange(event.target.value)} />
          </label>
          <label>
            <span>Action note</span>
            <textarea rows={4} value={note} onChange={(event) => onNoteChange(event.target.value)} />
          </label>
          {error ? <p className="demo-form__error">{error}</p> : null}
          <div className="demo-form__actions">
            <button className="button button--secondary" type="button" onClick={onClose}>Cancel</button>
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? "Creating..." : "Create ticket"}
            </button>
          </div>
        </form>
      )}
    </DialogFrame>
  );
}

export function CloseIncidentDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFrame title="Close incident" onClose={onClose} narrow>
      <div className="dialog-callout">
        <p className="eyebrow">Confirmation</p>
        <h3>Close the incident after recommendation acceptance?</h3>
        <p>This is a demo-safe state change. It does not touch real banking systems.</p>
      </div>
      <div className="demo-form__actions">
        <button className="button button--secondary" type="button" onClick={onClose}>Cancel</button>
        <button className="button button--primary" type="button" onClick={onConfirm}>Close incident</button>
      </div>
    </DialogFrame>
  );
}

export function FunctionProofDialog({
  item,
  result,
  onClose,
}: {
  item: DeepAnalyticsFunction;
  result: EnsembleAnalysisResult | null;
  onClose: () => void;
}) {
  return (
    <DialogFrame title={item.title} onClose={onClose}>
      <div className="function-proof-dialog">
        <div>
          <p className="eyebrow">{item.group}</p>
          <h3>{item.simpleName}</h3>
          <p>{item.juryNarrative}</p>
        </div>
        <dl className="incident-dialog-facts">
          <div><dt>Endpoint / artifact</dt><dd>{item.endpoint}</dd></div>
          <div><dt>Demo metric</dt><dd>{item.metric}</dd></div>
          <div><dt>Status</dt><dd>{result ? "Verified by current ensemble run" : "Queued until ML analysis runs"}</dd></div>
        </dl>
        <section className="dialog-callout">
          <p className="eyebrow">How it works in the demo</p>
          <h3>{item.signal}</h3>
          <p>{item.demoBehavior}</p>
        </section>
      </div>
    </DialogFrame>
  );
}

function DialogFrame({ children, onClose, title, narrow }: DialogFrameProps) {
  return (
    <div className="demo-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className={narrow ? "demo-modal demo-modal--narrow" : "demo-modal"}
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="demo-modal__header">
          <h2>{title}</h2>
          <button className="button button--secondary" type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function statusLabel(lifecycle: IncidentLifecycle) {
  switch (lifecycle) {
    case "analysisRunning":
      return "ML analysis running";
    case "analysisCompleted":
      return "Analysis completed";
    case "recommendationAccepted":
      return "Recommendation accepted";
    case "ticketCreated":
      return "Ticket created";
    case "incidentClosed":
      return "Incident closed";
    case "analysisFailed":
      return "Analysis failed";
    case "incidentSelected":
      return "Incident selected";
    case "detected":
    default:
      return "Anomaly detected";
  }
}

function lifecycleSummary(lifecycle: IncidentLifecycle, ticketId: string) {
  if (lifecycle === "incidentClosed") return "The incident is closed in local demo state and the map marker is muted.";
  if (lifecycle === "recommendationAccepted") return "The recommended hold/prefund action is accepted for this session.";
  if (ticketId) return `${ticketId} has been created and linked to the New York incident.`;
  return "The incident state changed locally.";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}
