"use client";

import { API_URL, isApiError } from "@/lib/api";
import { Button } from "./ui";

/** Shown whenever a request fails. Never replaced by fallback data. */
export function ErrorBanner({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  if (!error) return null;
  const e = isApiError(error) ? error : null;
  const unreachable = e?.kind === "network";
  const title = unreachable
    ? "Backend unreachable"
    : e?.kind === "validation"
      ? "The backend rejected the request"
      : e?.kind === "http"
        ? `Backend error (${e.status})`
        : "Request failed";

  return (
    <div role="alert" className="mb-4 rounded-lg border border-[var(--critical)] bg-[var(--critical-bg)] p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-crit">{title}</p>
          <p className="mt-1 break-all text-ink-2">
            Tried: <code className="font-mono text-xs">{e ? `${e.method} ${e.url}` : API_URL}</code>
          </p>
          {unreachable && (
            <p className="mt-1 text-ink-2">
              Start the API (<code className="font-mono text-xs">make dev</code> or{" "}
              <code className="font-mono text-xs">docker compose up</code>) or point{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_API_URL</code> at it. No data is shown until it responds.
            </p>
          )}
          {e && e.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-2">
              {e.details.slice(0, 20).map((d, i) => (
                <li key={i} className="break-words">
                  {d}
                </li>
              ))}
              {e.details.length > 20 && <li>…and {e.details.length - 20} more</li>}
            </ul>
          )}
          {!e && <p className="mt-1 text-ink-2">{error instanceof Error ? error.message : String(error)}</p>}
        </div>
        {onRetry && (
          <Button onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
    </div>
  );
}
