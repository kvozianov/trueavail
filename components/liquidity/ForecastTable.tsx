import { formatCurrencyAmount, formatDate } from "@/lib/backend/formatters";
import { mapForecastToTableRows } from "@/lib/backend/mappers";
import type { ForecastPoint } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";

type ForecastTableProps = {
  forecast?: ForecastPoint[];
};

export function ForecastTable({ forecast }: ForecastTableProps) {
  const rows = mapForecastToTableRows(forecast);

  if (!rows.length) {
    return (
      <EmptyState
        title="No forecast rows"
        message="The backend returned an empty forecast array."
        fieldName="forecast.forecast"
      />
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Bank</th>
            <th>Currency</th>
            <th className="num">p05</th>
            <th className="num">p50</th>
            <th className="num">p95</th>
            <th className="num">Required buffer</th>
            <th className="num">Scheduled flow</th>
            <th>Risk</th>
            <th>Breach</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.date}-${row.account_id}-${row.currency}-${index}`}>
              <td>{formatDate(row.date)}</td>
              <td>{row.account_id ?? "N/A"}</td>
              <td>{row.bank_name ?? row.bank_id ?? "N/A"}</td>
              <td>{row.currency ?? "N/A"}</td>
              <td className="num">{formatCurrencyAmount(row.p05, row.currency)}</td>
              <td className="num">{formatCurrencyAmount(row.p50, row.currency)}</td>
              <td className="num">{formatCurrencyAmount(row.p95, row.currency)}</td>
              <td className="num">{formatCurrencyAmount(row.required_buffer, row.currency)}</td>
              <td className="num">{formatCurrencyAmount(row.scheduled_net_flow, row.currency)}</td>
              <td><StatusBadge value={row.risk_status} context="risk" /></td>
              <td>{row.breach ? <StatusBadge value="breach" context="risk" /> : <StatusBadge value="safe" context="risk" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
