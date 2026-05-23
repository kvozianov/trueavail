import { NextRequest } from "next/server";
import { findSwiftRoute, normalizeTransferIntent } from "@/lib/transfers/transfer-rail-fixtures";
import type { PolicyCheck, SwiftCommandReceipt, TransferIntent } from "@/lib/transfers/transfer-rail-types";
import { findTreasuryAccountFromStore, queueSwiftTreasuryCommandInStore } from "@/lib/treasury-ledger-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readIntent(request: NextRequest): Promise<Partial<TransferIntent>> {
  try {
    return (await request.json()) as Partial<TransferIntent>;
  } catch {
    return {};
  }
}

function buildSwiftPolicyChecks(intent: TransferIntent): PolicyCheck[] {
  const from = findTreasuryAccountFromStore(intent.fromAccountId);
  const to = findTreasuryAccountFromStore(intent.toAccountId);
  if (!from || !to) {
    return [
      {
        label: "Treasury ledger",
        value: "account not found",
        state: "blocked",
      },
    ];
  }
  const sameCompany = from.companyId === to.companyId;

  return [
    {
      label: "Treasury command",
      value: "manual bank instruction required",
      state: "warning",
    },
    {
      label: "Legal entities",
      value: sameCompany ? "same TrueAvail treasury group" : "external review required",
      state: sameCompany ? "pass" : "blocked",
    },
    {
      label: "Document package",
      value: "invoice, FX control support, approval memo",
      state: "warning",
    },
    {
      label: "Cut-off exposure",
      value: "settlement may miss same-day liquidity window",
      state: "warning",
    },
  ];
}

export async function POST(request: NextRequest) {
  const intent = normalizeTransferIntent({ ...(await readIntent(request)), rail: "swift" });
  const route = findSwiftRoute(intent.routeId);
  const commandIdSeed = `${intent.fromAccountId}:${intent.toAccountId}:${intent.amount}:${route.id}`;
  const commandId = `SWIFT-${Buffer.from(commandIdSeed).toString("base64url").slice(0, 10).toUpperCase()}`;
  let ledgerMovementId = "";

  try {
    const movement = queueSwiftTreasuryCommandInStore({
      amount: intent.amount,
      currency: intent.currency,
      fromAccountId: intent.fromAccountId,
      reference: commandId,
      toAccountId: intent.toAccountId,
    });
    ledgerMovementId = movement.id;
  } catch {
    ledgerMovementId = "PENDING-REVIEW";
  }

  const receipt: SwiftCommandReceipt = {
    commandId,
    rail: "swift",
    status: "created",
    assignedOwner: route.treasuryOwner,
    eta: route.eta,
    cutOffRisk: route.cutOffRisk,
    requiredDocuments: [
      "Commercial invoice",
      "Intercompany treasury memo",
      "FX control support pack",
      "Maker-checker approval evidence",
    ],
    timeline: [
      {
        label: "Command created",
        detail: `TrueAvail opened treasury task ${ledgerMovementId}; balances stay unchanged until bank settlement.`,
        state: "done",
      },
      {
        label: "Documents queued",
        detail: "Invoice and FX-control package are attached for treasury review.",
        state: "active",
      },
      {
        label: "Bank instruction pending",
        detail: "Treasury team sends the instruction through the correspondent bank.",
        state: "pending",
      },
      {
        label: "Settlement expected",
        detail: `${route.eta}; cut-off risk is ${route.cutOffRisk}.`,
        state: "pending",
      },
    ],
    policyChecks: buildSwiftPolicyChecks(intent),
    createdAt: "2026-05-23T11:10:00.000Z",
  };

  return Response.json(receipt, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
