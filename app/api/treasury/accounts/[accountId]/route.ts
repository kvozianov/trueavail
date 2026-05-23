import { NextRequest } from "next/server";
import { findTreasuryAccountFromStore, updateTreasuryAccountInStore } from "@/lib/treasury-ledger-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const account = findTreasuryAccountFromStore(accountId);

  if (!account) {
    return Response.json({ message: "Treasury account not found" }, { status: 404 });
  }

  return Response.json(
    {
      account,
      source: "unified-treasury-ledger",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const body = await readBody(request);

  try {
    const account = updateTreasuryAccountInStore(accountId, {
      balance: typeof body.balance === "number" ? body.balance : undefined,
      conditionText: typeof body.conditionText === "string" ? body.conditionText : undefined,
      usableBalance: typeof body.usableBalance === "number" ? body.usableBalance : undefined,
    });

    return Response.json(
      {
        account,
        source: "unified-treasury-ledger",
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
        message: error instanceof Error ? error.message : "Could not update treasury account",
      },
      { status: 404 },
    );
  }
}
