import { NextRequest } from "next/server";
import { buildBlockchainReceipt, saveBlockchainReceipt } from "@/lib/transfers/demo-ledger";
import { DEMO_REGULATOR_VIEW_KEY, normalizeTransferIntent } from "@/lib/transfers/transfer-rail-fixtures";
import { applyLedgerTransferInStore } from "@/lib/treasury-ledger-store";
import type { TransferIntent } from "@/lib/transfers/transfer-rail-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readIntent(request: NextRequest): Promise<Partial<TransferIntent>> {
  try {
    return (await request.json()) as Partial<TransferIntent>;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const intent = normalizeTransferIntent({ ...(await readIntent(request)), rail: "blockchain" });
  const draftReceipt = buildBlockchainReceipt(intent, DEMO_REGULATOR_VIEW_KEY);

  try {
    const movement = applyLedgerTransferInStore({
      amount: intent.amount,
      currency: intent.currency,
      fromAccountId: intent.fromAccountId,
      rail: "blockchain",
      reference: draftReceipt.txId,
      toAccountId: intent.toAccountId,
    });
    const receipt = saveBlockchainReceipt({
      ...draftReceipt,
      ledgerMovement: {
        id: movement.id,
        fromBalanceAfter: movement.fromBalanceAfter,
        status: movement.status,
        toBalanceAfter: movement.toBalanceAfter,
      },
    });

    return Response.json(
      {
        ...receipt,
        explorerUrl: `https://sepolia.explorer.zksync.io/tx/${receipt.txHash}`,
        note: "MVP mock mode: this prepares the same fields the CorporateLiquidity contract would receive and settles the shared treasury ledger.",
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : "Could not settle blockchain transfer",
      },
      { status: 409 },
    );
  }
}
