import { daysToFirstGap, money } from "@/lib/format";
import type { Account, ForecastResponse } from "@/lib/types";

export function AccountCards({
  accounts,
  forecast,
  selected,
  onSelect,
}: {
  accounts: Account[];
  forecast: ForecastResponse | null;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="radiogroup" aria-label="Account">
      {accounts.map((a) => {
        const days = forecast ? daysToFirstGap(forecast.points, a.account_id, forecast.as_of) : undefined;
        const minP05 = forecast?.points
          .filter((p) => p.account_id === a.account_id)
          .reduce((m, p) => Math.min(m, p.balance_p05), Infinity);
        const active = selected === a.account_id;
        const status =
          days === undefined ? null : days === null ? (
            <span className="text-good">No gap in {forecast!.horizon_days} d</span>
          ) : (
            <span className="font-semibold text-crit">
              ● First gap in {days} {days === 1 ? "day" : "days"}
            </span>
          );
        return (
          <button
            key={a.account_id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(a.account_id)}
            className={`min-w-0 rounded-lg border bg-surface p-3 text-left transition hover:border-[var(--series-1)] ${
              active ? "border-[var(--series-1)] ring-1 ring-[var(--series-1)]" : "border-line"
            }`}
          >
            <div className="truncate text-xs text-ink-muted">{a.bank_name}</div>
            <div className="truncate text-sm font-medium text-ink">{a.label}</div>
            <div className="tabular mt-2 text-lg font-semibold text-ink">{money(a.settled_balance, a.currency)}</div>
            <div className="tabular text-xs text-ink-muted">
              settled · buffer {money(a.required_buffer, a.currency)}
            </div>
            <div className="mt-2 text-xs">{status}</div>
            {minP05 != null && Number.isFinite(minP05) && (
              <div className="tabular text-xs text-ink-muted">min P5 {money(minP05, a.currency)}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
