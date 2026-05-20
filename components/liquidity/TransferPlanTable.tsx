import { formatCurrencyAmount } from "@/lib/backend/formatters";
import { transferCost } from "@/lib/backend/mappers";
import type { TransferPlanItem } from "@/lib/backend/types";
import { EmptyState } from "./EmptyState";

type TransferPlanTableProps = {
  transfers?: TransferPlanItem[];
};

export function TransferPlanTable({ transfers }: TransferPlanTableProps) {
  const rows = transfers ?? [];

  if (!rows.length) {
    return (
      <EmptyState
        title="No transfer routes"
        message="The optimizer did not return transfers. Approval remains blocked when there are no verified transfer rows."
        fieldName="optimizer.transfers"
      />
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>From account</th>
            <th>To account</th>
            <th>From bank</th>
            <th>To bank</th>
            <th>Currency</th>
            <th className="num">Amount</th>
            <th>Rail</th>
            <th className="num">Cost</th>
            <th>Settlement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((transfer, index) => (
            <tr key={`${transfer.source_account_id ?? transfer.from_account_id}-${transfer.destination_account_id ?? transfer.to_account_id}-${index}`}>
              <td>{transfer.source_account_id ?? transfer.from_account_id ?? "N/A"}</td>
              <td>{transfer.destination_account_id ?? transfer.to_account_id ?? "N/A"}</td>
              <td>{transfer.source_bank_id ?? transfer.from_bank_id ?? "N/A"}</td>
              <td>{transfer.destination_bank_id ?? transfer.to_bank_id ?? "N/A"}</td>
              <td>{transfer.currency ?? "N/A"}</td>
              <td className="num">{formatCurrencyAmount(transfer.amount, transfer.currency)}</td>
              <td>{transfer.rail ?? "N/A"}</td>
              <td className="num">{formatCurrencyAmount(transferCost(transfer), transfer.currency)}</td>
              <td>{transfer.settlement_time ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
