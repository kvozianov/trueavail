import type { BackendError } from "@/lib/backend/client";

type ErrorStateProps = {
  title?: string;
  message?: string;
  endpoint?: string;
  error?: BackendError;
  onRetry?: () => void;
};

export function ErrorState({ title = "Backend request failed", message, endpoint, error, onRetry }: ErrorStateProps) {
  const safeMessage = message ?? error?.message ?? "The dashboard could not load this backend payload.";
  const safeEndpoint = endpoint ?? error?.endpoint;

  return (
    <div className="state state--error" role="alert">
      <p className="state__eyebrow">Error</p>
      <h3>{title}</h3>
      <p>{safeMessage}</p>
      {safeEndpoint ? <code>{safeEndpoint}</code> : null}
      {onRetry ? (
        <button className="button button--secondary" type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
