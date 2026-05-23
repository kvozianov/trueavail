import { NextRequest } from "next/server";
import { decryptComplianceMemo } from "@/lib/transfers/encryption-demo";
import { DEMO_REGULATOR_VIEW_KEY } from "@/lib/transfers/transfer-rail-fixtures";
import { getBlockchainReceipt, publicPreviewFromReceipt } from "@/lib/transfers/demo-ledger";
import type { ComplianceLookupResponse } from "@/lib/transfers/transfer-rail-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ txId: string }> }) {
  const { txId } = await context.params;
  const viewKey = request.nextUrl.searchParams.get("viewKey") ?? "";
  const receipt = getBlockchainReceipt(txId);

  if (!receipt) {
    return Response.json(
      {
        error: "Transaction not found in deterministic demo ledger.",
      },
      { status: 404 },
    );
  }

  const decryptedReport = decryptComplianceMemo(receipt.encryptedMemo, viewKey);
  const response: ComplianceLookupResponse = {
    publicPreview: publicPreviewFromReceipt(receipt),
    decryptedReport,
    viewKeyAccepted: Boolean(decryptedReport),
    message: decryptedReport
      ? "View key accepted. Regulator report decrypted."
      : `Enter the demo view key (${DEMO_REGULATOR_VIEW_KEY}) to reveal the compliance report.`,
  };

  return Response.json(response, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
