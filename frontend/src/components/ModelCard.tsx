import { num } from "@/lib/format";
import type { ForecastResponse } from "@/lib/types";
import { Card, Stat } from "./ui";

export function ModelCard({ forecast }: { forecast: ForecastResponse }) {
  const { model, feature_quality: fq } = forecast;
  const weights = Object.entries(model.weights).sort((a, b) => b[1] - a[1]);
  return (
    <Card title="Model" subtitle={`Quantiles ${forecast.quantiles.map((q) => `P${Math.round(q * 100)}`).join(" / ")}`}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-ink">{model.type}</code>
          <span className={`text-xs font-medium ${model.available ? "text-good" : "text-warn"}`}>
            {model.available ? "✓ trained model in use" : "▲ fallback in use"}
          </span>
        </div>
        {model.fallback_reason && (
          <p className="rounded-md bg-[var(--warning-bg)] p-2 text-xs text-ink-2">
            <span className="font-medium text-warn">Fallback reason:</span> {model.fallback_reason}
          </p>
        )}
        {weights.length > 0 && (
          <div>
            <div className="mb-1 text-xs text-ink-muted">Ensemble weights</div>
            <ul className="space-y-1.5">
              {weights.map(([name, w]) => (
                <li key={name} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs text-ink-2">{name}</div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-surface-2">
                      <div className="h-1.5 rounded-full bg-series-1" style={{ width: `${Math.max(2, w * 100)}%` }} />
                    </div>
                  </div>
                  <span className="tabular text-right text-xs text-ink">{num(w, 2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {model.components.some((c) => !(c in model.weights)) && (
          <div className="text-xs text-ink-muted">Components: {model.components.join(", ")}</div>
        )}
        <div className="grid grid-cols-3 gap-2 border-t border-line pt-3">
          <Stat label="Trainable rows" value={num(fq.rows_trainable)} />
          <Stat label="Anomaly rows" value={num(fq.anomaly_rows)} />
          <Stat label="Known-event rows" value={num(fq.known_event_rows)} />
        </div>
      </div>
    </Card>
  );
}
