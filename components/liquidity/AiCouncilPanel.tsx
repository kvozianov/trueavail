import { titleize } from "@/lib/backend/formatters";
import { mapCouncilToAdvisorCards } from "@/lib/backend/mappers";
import type { BackendError } from "@/lib/backend/client";
import type { AICouncilResponse, CouncilMode } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { StatusBadge } from "./StatusBadge";

type AiCouncilPanelProps = {
  councilResponse?: AICouncilResponse;
  selectedMode: CouncilMode;
  peerReview: boolean;
  onModeChange: (mode: CouncilMode) => void;
  onPeerReviewChange: (enabled: boolean) => void;
  onRun: () => void;
  loading?: boolean;
  error?: BackendError;
};

const modes: CouncilMode[] = ["mock", "auto", "live", "openai", "anthropic", "mixed"];

export function AiCouncilPanel({
  councilResponse,
  selectedMode,
  peerReview,
  onModeChange,
  onPeerReviewChange,
  onRun,
  loading,
  error,
}: AiCouncilPanelProps) {
  const view = mapCouncilToAdvisorCards(councilResponse);

  return (
    <section className="panel workflow-panel" id="ai-council" aria-labelledby="ai-council-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">AI Council</p>
          <h2 id="ai-council-title">Advisor review</h2>
        </div>
        <StatusBadge value={view.mode ?? selectedMode} context="provider" />
      </div>

      <div className="control-strip">
        <label>
          Mode
          <select value={selectedMode} onChange={(event) => onModeChange(event.target.value as CouncilMode)}>
            {modes.map((mode) => (
              <option value={mode} key={mode}>{titleize(mode)}</option>
            ))}
          </select>
        </label>
        <label className="toggle-field">
          <input
            checked={peerReview}
            type="checkbox"
            onChange={(event) => onPeerReviewChange(event.target.checked)}
          />
          Peer review
        </label>
        <button className="button button--primary" type="button" onClick={onRun} disabled={loading}>
          {loading ? "Running" : "Run council"}
        </button>
      </div>

      {error ? <ErrorState error={error} onRetry={onRun} /> : null}
      {loading && !councilResponse ? <LoadingSkeleton variant="table" /> : null}

      {councilResponse ? (
        <>
          <div className="provider-strip">
            <span>Provider mode <strong>{titleize(view.providerMode ?? view.mode)}</strong></span>
            <span>Fallback <strong>{view.fallbackReason ?? "N/A"}</strong></span>
            {typeof councilResponse.live_available === "boolean" ? (
              <span>Live providers <StatusBadge value={councilResponse.live_available} context="provider" compact /></span>
            ) : null}
          </div>

          {view.framedQuestion ? (
            <details className="details-panel">
              <summary>Framed question</summary>
              <p>{view.framedQuestion}</p>
            </details>
          ) : null}

          <h3 className="section-title">Advisor responses</h3>
          {view.advisors.length ? (
            <div className="advisor-grid">
              {view.advisors.map((advisor, index) => {
                const record = typeof advisor === "object" && advisor !== null ? advisor as Record<string, unknown> : {};
                return (
                  <article className="advisor-card" key={`${record.advisor ?? "advisor"}-${index}`}>
                    <div>
                      <h4>{String(record.advisor ?? "Advisor")}</h4>
                      <StatusBadge value={record.provider ?? view.mode} context="provider" compact />
                    </div>
                    <p className="muted">{String(record.lens ?? "No lens returned.")}</p>
                    <p>{String(record.response ?? "No response returned.")}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No advisor responses" fieldName="ai_council.advisor_responses" />
          )}

          <h3 className="section-title">Chairman verdict</h3>
          {view.verdict ? (
            <div className="verdict-card">
              {renderVerdict(view.verdict)}
            </div>
          ) : (
            <EmptyState title="No chairman verdict" fieldName="ai_council.verdict" />
          )}

          {peerReview ? (
            <>
              <h3 className="section-title">Peer reviews</h3>
              {view.peerReviews.length ? (
                <div className="review-list">
                  {view.peerReviews.map((review, index) => {
                    const record = typeof review === "object" && review !== null ? review as Record<string, unknown> : {};
                    return (
                      <article key={`${record.reviewer ?? "review"}-${index}`}>
                        <h4>{String(record.reviewer ?? "Reviewer")}</h4>
                        <p>{String(record.response ?? "No response returned.")}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState title="No peer reviews" fieldName="ai_council.peer_reviews" />
              )}
            </>
          ) : null}

          <h3 className="section-title">Formulas used</h3>
          {view.formulas.length ? (
            <div className="formula-grid">
              {view.formulas.map((formula) => (
                <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
              ))}
            </div>
          ) : (
            <EmptyState title="No council formulas" fieldName="ai_council.formulas_used" />
          )}
        </>
      ) : null}
    </section>
  );
}

function renderVerdict(verdict: unknown) {
  if (typeof verdict !== "string") {
    return <p>{JSON.stringify(verdict)}</p>;
  }

  return verdict
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block, index) => {
      if (block.startsWith("## ")) {
        return <h4 key={index}>{block.replace(/^## /, "")}</h4>;
      }
      return <p key={index}>{block}</p>;
    });
}
