"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import type { Language } from "@/lib/i18n";
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
  surface?: "demo" | "map";
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
  const { language, t, translate } = useLanguage();
  const running = lifecycle === "analysisRunning";
  const closed = lifecycle === "incidentClosed";
  const completed = Boolean(result);

  return (
    <section className={`incident-console incident-console--${lifecycle}`} aria-label={t("Incident analytics console", "Консоль аналитики инцидента")}>
      <div className="incident-console__header">
        <div>
          <p className="eyebrow">{t("Map Error Detected")}</p>
          <h2>{translate(incident.title)}</h2>
          <p>{translate(incident.description)}</p>
        </div>
        <span className={`incident-status-badge incident-status-badge--${lifecycle}`}>
          {statusLabel(lifecycle, translate)}
        </span>
      </div>

      <dl className="incident-facts" aria-label={t("Incident facts", "Факты инцидента")}>
        <div>
          <dt>{t("Type")}</dt>
          <dd>{translate(incident.type)}</dd>
        </div>
        <div>
          <dt>{t("Zone")}</dt>
          <dd>{translate(incident.mapZone)}</dd>
        </div>
        <div>
          <dt>{t("Detected")}</dt>
          <dd>{formatDateTime(incident.detectedAt, language)}</dd>
        </div>
        <div>
          <dt>{t("Risk")}</dt>
          <dd>{translate(incident.severity.toUpperCase())}</dd>
        </div>
      </dl>

      <div className="incident-action-row">
        <button
          className="command-button command-button--primary"
          disabled={running || closed}
          onClick={onAnalyze}
          type="button"
        >
          {running ? t("Analyzing...") : completed ? t("Run ML analysis again") : t("Run ML analysis")}
        </button>
        <button className="command-button" disabled={running} onClick={onOpenDetails} type="button">
          {t("Open details")}
        </button>
        <button className="command-button command-button--ghost" disabled={running || closed} onClick={onSimulateFailure} type="button">
          {t("Simulate failed run")}
        </button>
      </div>

      {running || error || completed ? (
        <div className="analysis-progress-card">
          <div className="analysis-progress-card__top">
            <div>
              <span>{t("ML ensemble pipeline")}</span>
              <strong>{error ? t("Run needs attention") : completed ? t("Analysis completed") : t("Models are running")}</strong>
            </div>
            <b>{Math.round(progress)}%</b>
          </div>
          <div className="analysis-progress-bar" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className="analysis-step-list">
            {steps.map((step) => (
              <li className={`analysis-step analysis-step--${step.status}`} key={step.id}>
                <span>{translate(step.status)}</span>
                <div>
                  <strong>{translate(step.label)}</strong>
                  <p>{translate(step.detail)}</p>
                </div>
              </li>
            ))}
          </ol>
          {error ? (
            <div className="analysis-error" role="alert">
              <strong>{t("Analysis failed")}</strong>
              <p>{translate(error)}</p>
              <button className="command-button command-button--primary" onClick={onRetry} type="button">
                {t("Retry analysis")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="ensemble-result-card">
          <div className="ensemble-result-card__score">
            <span>{t("Risk score")}</span>
            <strong>{result.riskScore}</strong>
            <small>{result.confidence}% {t("confidence", "уверенность")}</small>
          </div>
          <div>
            <p className="eyebrow">{t("Final Verdict")}</p>
            <h3>{translate(result.finalVerdict)}</h3>
            <p>{translate(result.explanation)}</p>
            <ul>
              {result.recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation}>{translate(recommendation)}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="incident-action-grid" aria-label={t("Post-analysis actions", "Действия после анализа")}>
          <button className="command-button" onClick={onViewModels} type="button">{t("View models")}</button>
          <button className="command-button" onClick={onDownloadReport} type="button">{t("Download report")}</button>
          <button className="command-button" onClick={onCreateTicket} type="button">
            {ticketId ? `${t("Ticket", "Тикет")} ${ticketId}` : t("Create ticket")}
          </button>
          <button
            className="command-button"
            disabled={lifecycle === "recommendationAccepted" || closed}
            onClick={onAcceptRecommendation}
            type="button"
          >
            {lifecycle === "recommendationAccepted" ? t("Recommendation accepted") : t("Accept recommendation")}
          </button>
          <button
            className="command-button command-button--danger"
            disabled={closed}
            onClick={onCloseIncident}
            type="button"
          >
            {closed ? t("Incident closed") : t("Close incident")}
          </button>
        </div>
      ) : null}

      {ticketId || lifecycle === "recommendationAccepted" || closed ? (
        <div className="incident-lifecycle-note" role="status">
          <strong>{t("Demo lifecycle updated")}</strong>
          <span>{lifecycleSummary(lifecycle, ticketId, translate)}</span>
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
  surface = "demo",
}: DeepAnalyticsMatrixProps) {
  const { t, translate } = useLanguage();
  const groups = functionGroups();
  const visibleFunctions = functions.filter((item) => item.group === activeGroup);
  const isMapSurface = surface === "map";
  const statusText = isMapSurface
    ? t("clickable map layer", "кликабельный слой карты")
    : result
      ? t("verified in demo")
      : t("queued for analysis");

  return (
    <section
      className={isMapSurface ? "deep-analytics deep-analytics--map anchor-target" : "deep-analytics anchor-target"}
      id="evidence"
      aria-label={isMapSurface ? t("Operational map layers", "Операционные слои карты") : t("Deep analytics functions from the MVP document", "Функции глубокой аналитики из MVP-документа")}
    >
      <div className="deep-analytics__header">
        <div className="section-heading">
          <p className="eyebrow">{isMapSurface ? t("Map Operations Layers", "Операционные слои карты") : t("Deep Analytics For Jury")}</p>
          <h2>{isMapSurface ? t("Every function becomes a map control", "Каждая функция становится управлением карты") : t("Every MVP function is visible and clickable")}</h2>
          <p>
            {isMapSurface
              ? t(
                  "This mode treats the same MVP functions as operational layers: forecast overlays, risk filters, route constraints, governance locks, and integration checks.",
                  "В этом режиме те же MVP-функции работают как операционные слои: forecast overlays, risk filters, route constraints, governance locks и integration checks.",
                )
              : t("These cards turn the document functions into a live demo layer: each function has a signal, proof point, endpoint, and jury narrative.")}
          </p>
        </div>
        <div className="deep-analytics__readout" aria-label={isMapSurface ? t("Active map layers", "Активные слои карты") : t("Evidence readiness", "Готовность evidence")}>
          <span>{isMapSurface ? t("active map layers", "активные слои карты") : result ? t("verified in demo") : t("queued for analysis")}</span>
          <strong>{visibleFunctions.length}/{functions.length}</strong>
          <p>{translate(activeGroup)}</p>
        </div>
      </div>
      <div className="deep-analytics__tabs" role="tablist" aria-label={t("Analytics groups", "Группы аналитики")}>
        {groups.map((group) => (
          <button
            aria-selected={group === activeGroup}
            className={group === activeGroup ? "deep-analytics__tab deep-analytics__tab--active" : "deep-analytics__tab"}
            key={group}
            onClick={() => onGroupChange(group)}
            role="tab"
            type="button"
          >
            {translate(group)}
          </button>
        ))}
      </div>
      <div className="deep-analytics__grid">
        {visibleFunctions.map((item, index) => (
          <button className="deep-function-card" key={item.id} onClick={() => onOpenFunction(item)} type="button">
            <span className="deep-function-card__index">0{index + 1}</span>
            <span className="deep-function-card__status">{statusText}</span>
            <strong>{translate(item.title)}</strong>
            <small>{translate(item.metric)}</small>
            <p>{translate(item.signal)}</p>
            <em>{item.endpoint}</em>
            <i aria-hidden="true" />
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
  const { translate, t } = useLanguage();
  return (
    <DialogFrame title={t("Incident details")} onClose={onClose}>
      <div className="incident-dialog-grid">
        <section>
          <p className="eyebrow">{t("Incident")}</p>
          <h3>{translate(incident.title)}</h3>
          <p>{translate(incident.description)}</p>
          <dl className="incident-dialog-facts">
            <div><dt>ID</dt><dd>{incident.id}</dd></div>
            <div><dt>{t("Status")}</dt><dd>{statusLabel(lifecycle, translate)}</dd></div>
            <div><dt>{t("Coordinates")}</dt><dd>{incident.coordinates.latitude.toFixed(4)}, {incident.coordinates.longitude.toFixed(4)}</dd></div>
            <div><dt>{t("Source")}</dt><dd>{translate(incident.source)}</dd></div>
          </dl>
        </section>
        <section>
          <p className="eyebrow">{t("Expected vs observed")}</p>
          <h3>{t("Why the marker is red")}</h3>
          <p><strong>{t("Expected")}:</strong> {translate(incident.expectedBehavior)}</p>
          <p><strong>{t("Observed")}:</strong> {translate(incident.observedBehavior)}</p>
          <ul>
            {incident.riskFactors.map((factor) => <li key={factor}>{translate(factor)}</li>)}
          </ul>
        </section>
      </div>
      {result ? (
        <section className="dialog-callout">
          <p className="eyebrow">{t("Root cause")}</p>
          <h3>{translate(result.rootCause)}</h3>
          <ul>
            {result.evidence.map((item) => <li key={item}>{translate(item)}</li>)}
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
  const { t, translate } = useLanguage();
  return (
    <DialogFrame title={t("ML ensemble model report")} onClose={onClose}>
      <div className="model-report-summary">
        <div><span>{t("Verdict")}</span><strong>{translate(result.finalVerdict)}</strong></div>
        <div><span>{t("Confidence")}</span><strong>{result.confidence}%</strong></div>
        <div><span>{t("Risk score")}</span><strong>{result.riskScore}/100</strong></div>
      </div>
      <div className="model-vote-grid">
        {result.modelVotes.map((model) => (
          <article className={`model-vote-card model-vote-card--${model.status}`} key={model.modelName}>
            <div>
              <span>{model.vote}</span>
              <strong>{model.modelName}</strong>
            </div>
            <b>{model.confidence}%</b>
            <p>{translate(model.explanation)}</p>
            <ul>
              {model.detectedFeatures.map((feature) => <li key={feature}>{translate(feature)}</li>)}
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
  const { t } = useLanguage();
  return (
    <DialogFrame title={t("Create treasury ticket")} onClose={onClose} narrow>
      {ticketId ? (
        <div className="demo-form__success" role="status">
          <strong>{t("Ticket created")}</strong>
          <p>{ticketId} {t("is linked to the incident and visible in the lifecycle state.")}</p>
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
            <span>{t("Ticket title")}</span>
            <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
          </label>
          <label>
            <span>{t("Owner")}</span>
            <input value={owner} onChange={(event) => onOwnerChange(event.target.value)} />
          </label>
          <label>
            <span>{t("Action note")}</span>
            <textarea rows={4} value={note} onChange={(event) => onNoteChange(event.target.value)} />
          </label>
          {error ? <p className="demo-form__error">{error}</p> : null}
          <div className="demo-form__actions">
            <button className="button button--secondary" type="button" onClick={onClose}>{t("Cancel")}</button>
            <button className="button button--primary" disabled={submitting} type="submit">
              {submitting ? t("Creating...", "Создаётся...") : t("Create ticket")}
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
  const { t } = useLanguage();
  return (
    <DialogFrame title={t("Close incident")} onClose={onClose} narrow>
      <div className="dialog-callout">
        <p className="eyebrow">{t("Confirmation")}</p>
        <h3>{t("Close the incident after recommendation acceptance?")}</h3>
        <p>{t("This is a demo-safe state change. It does not touch real banking systems.")}</p>
      </div>
      <div className="demo-form__actions">
        <button className="button button--secondary" type="button" onClick={onClose}>{t("Cancel")}</button>
        <button className="button button--primary" type="button" onClick={onConfirm}>{t("Close incident")}</button>
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
  const { t, translate } = useLanguage();
  return (
    <DialogFrame title={translate(item.title)} onClose={onClose}>
      <div className="function-proof-dialog">
        <div>
          <p className="eyebrow">{translate(item.group)}</p>
          <h3>{translate(item.simpleName)}</h3>
          <p>{translate(item.juryNarrative)}</p>
        </div>
        <dl className="incident-dialog-facts">
          <div><dt>{t("Endpoint / artifact")}</dt><dd>{item.endpoint}</dd></div>
          <div><dt>{t("Demo metric")}</dt><dd>{translate(item.metric)}</dd></div>
          <div><dt>{t("Status")}</dt><dd>{result ? t("Verified by current ensemble run") : t("Queued until ML analysis runs")}</dd></div>
        </dl>
        <section className="dialog-callout">
          <p className="eyebrow">{t("How it works in the demo")}</p>
          <h3>{translate(item.signal)}</h3>
          <p>{translate(item.demoBehavior)}</p>
        </section>
      </div>
    </DialogFrame>
  );
}

function DialogFrame({ children, onClose, title, narrow }: DialogFrameProps) {
  const { t } = useLanguage();

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
          <button className="button button--secondary" type="button" onClick={onClose}>{t("Close", "Закрыть")}</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function statusLabel(lifecycle: IncidentLifecycle, translate: (text: string) => string) {
  switch (lifecycle) {
    case "analysisRunning":
      return translate("ML analysis running");
    case "analysisCompleted":
      return translate("Analysis completed");
    case "recommendationAccepted":
      return translate("Recommendation accepted");
    case "ticketCreated":
      return translate("Ticket created");
    case "incidentClosed":
      return translate("Incident closed");
    case "analysisFailed":
      return translate("Analysis failed");
    case "incidentSelected":
      return translate("Incident selected");
    case "detected":
    default:
      return translate("Anomaly detected");
  }
}

function lifecycleSummary(lifecycle: IncidentLifecycle, ticketId: string, translate: (text: string) => string) {
  if (lifecycle === "incidentClosed") return translate("The incident is closed in local demo state and the map marker is muted.");
  if (lifecycle === "recommendationAccepted") return translate("The recommended hold/prefund action is accepted for this session.");
  if (ticketId) return `${ticketId} ${translate("has been created and linked to the New York incident.")}`;
  return translate("The incident state changed locally.");
}

function formatDateTime(value: string, language: Language) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ruMonths = ["янв.", "фев.", "мар.", "апр.", "мая", "июн.", "июл.", "авг.", "сен.", "окт.", "ноя.", "дек."];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const month = language === "ru" ? ruMonths[date.getUTCMonth()] : enMonths[date.getUTCMonth()];

  return language === "ru" ? `${day} ${month}, ${hour}:${minute} UTC` : `${month} ${day}, ${hour}:${minute} UTC`;
}
