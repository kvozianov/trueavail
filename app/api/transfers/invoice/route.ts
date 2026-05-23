import { NextRequest } from "next/server";
import { DEMO_REGULATOR_VIEW_KEY, normalizeTransferIntent } from "@/lib/transfers/transfer-rail-fixtures";
import { buildComplianceMemo } from "@/lib/transfers/demo-ledger";
import { encryptComplianceMemo } from "@/lib/transfers/encryption-demo";
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
  const intent = normalizeTransferIntent(await readIntent(request));
  const complianceMemo = buildComplianceMemo(intent);
  const encrypted = encryptComplianceMemo(complianceMemo, DEMO_REGULATOR_VIEW_KEY);

  return Response.json(
    {
      invoice: complianceMemo,
      encryptedMemo: encrypted.encryptedMemo,
      memoHash: encrypted.memoHash,
      note: "MVP demo only: memo is encrypted for the regulator view key, not a production ZK proof.",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
