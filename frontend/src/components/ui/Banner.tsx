"use client";

import { AlertTriangle, OctagonAlert } from "lucide-react";
import { API_URL, DEMO, isApiError } from "@/lib/api";

/** Error banner (red rule on gap tint). Shown whenever a request fails; never replaced by fallback data. */
export function ErrorBanner({ error, onRetry, retrying }: { error: unknown; onRetry?: () => void; retrying?: boolean }) {
  if (!error) return null;
  const e = isApiError(error) ? error : null;
  const unreachable = e?.kind === "network";
  const host = (() => {
    try {
      return new URL(e?.url ?? API_URL).host;
    } catch {
      return API_URL;
    }
  })();
  const title = DEMO
    ? "Could not load the precomputed demo data."
    : unreachable
      ? "Backend unreachable."
      : e?.kind === "validation"
        ? "The backend rejected the request."
        : e?.kind === "http"
          ? `Backend error (${e.status}).`
          : "Request failed.";
  return (
    <div role="alert" className="my-4 flex gap-3 rounded-2 border-l-[3px] border-gap-fill bg-gap-tint px-4 py-3 text-[14px] text-ink-2">
      <OctagonAlert aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-gap" />
      <div className="min-w-0 flex-1">
        <p>
          <strong className="font-semibold text-gap">{title}</strong>{" "}
          {unreachable && !DEMO ? (
            <>
              Could not reach <code className="mono text-[12.5px] text-ink">{host}</code>. Nothing is shown in its place: no fake data
              fallback. Start it with <code className="mono text-[12.5px] text-ink">docker compose up</code> or{" "}
              <code className="mono text-[12.5px] text-ink">make dev</code>.
            </>
          ) : (
            <span className="break-all">
              Tried <code className="mono text-[12.5px] text-ink">{e ? `${e.method} ${e.url}` : API_URL}</code>.
            </span>
          )}{" "}
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={retrying} className="link font-medium disabled:opacity-50">
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </p>
        {e && e.details.length > 0 && <DetailList lines={e.details} />}
        {!e && <p className="mt-1">{error instanceof Error ? error.message : String(error)}</p>}
      </div>
    </div>
  );
}

function DetailList({ lines }: { lines: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px]">
      {lines.slice(0, 20).map((d, i) => (
        <li key={i} className="break-words">
          {d}
        </li>
      ))}
      {lines.length > 20 && <li>…and {lines.length - 20} more</li>}
    </ul>
  );
}

/** Warning banner (amber rule on warn tint). */
export function WarningBanner({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div role="status" className="my-4 flex gap-3 rounded-2 border-l-[3px] border-warn-fill bg-warn-tint px-4 py-3 text-[14px] text-ink-2">
      <AlertTriangle aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-warn" />
      <div className="min-w-0">
        <strong className="font-semibold text-warn">{title}</strong>
        {lines.length > 0 && <DetailList lines={lines} />}
      </div>
    </div>
  );
}
