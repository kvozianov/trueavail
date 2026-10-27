import { countAccounts, dayMonth, num, shortDate } from "@/lib/format";
import type { HealthResponse } from "@/lib/types";

/** Pass `asOf` (string or null while loading) to show the forecast as-of date. */
export function DatasetStrip({ health, asOf }: { health: HealthResponse; asOf?: string | null }) {
  const d = health.dataset;
  const items: [string, string][] = [
    [
      "Source",
      d.source
        ? d.source === "synthetic"
          ? `Synthetic${d.seed != null ? ` (seed ${d.seed})` : ""}`
          : "Uploaded CSV"
        : "n/a",
    ],
    ["Rows", num(d.rows)],
    ["Accounts", num(countAccounts(d.accounts))],
    ["History", d.start && d.end ? `${dayMonth(d.start)} – ${dayMonth(d.end)} ${d.end.slice(0, 4)}` : "—"],
    ...(asOf !== undefined ? ([["As of", asOf ? shortDate(asOf) : "—"]] as [string, string][]) : []),
    ["Model", health.model_available ? "available" : "fallback only"],
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-surface px-4 py-3 sm:grid-cols-3 lg:grid-cols-none lg:grid-flow-col lg:auto-cols-fr">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-ink-muted">{k}</dt>
          <dd className="tabular text-sm font-medium break-words text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
