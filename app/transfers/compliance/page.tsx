import { TransferComplianceView } from "@/components/liquidity/TransferComplianceView";
import { getBlockchainReceipt, publicPreviewFromReceipt } from "@/lib/transfers/demo-ledger";
import { DEMO_REGULATOR_VIEW_KEY } from "@/lib/transfers/transfer-rail-fixtures";

export default async function TransferCompliancePage({ searchParams }: { searchParams: Promise<{ txId?: string }> }) {
  const { txId } = await searchParams;
  const initialTxId = txId ?? "latest";
  const receipt = getBlockchainReceipt(initialTxId) ?? getBlockchainReceipt("latest");

  return (
    <TransferComplianceView
      initialResponse={
        receipt
          ? {
              publicPreview: publicPreviewFromReceipt(receipt),
              decryptedReport: null,
              viewKeyAccepted: false,
              message: `Enter the demo view key (${DEMO_REGULATOR_VIEW_KEY}) to reveal the compliance report.`,
            }
          : null
      }
      initialTxId={initialTxId}
    />
  );
}
