import { NextRequest } from "next/server";
import { addTreasuryAccountToStore, listTreasuryAccountsFromStore, listTreasuryMovementsFromStore } from "@/lib/treasury-ledger-store";
import type { TreasuryCountry } from "@/lib/treasury-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  return Response.json(
    {
      accounts: listTreasuryAccountsFromStore(),
      movements: listTreasuryMovementsFromStore(),
      source: "unified-treasury-ledger",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const body = await readBody(request);
  const account = addTreasuryAccountToStore({
    accountCode: String(body.accountCode ?? ""),
    balance: Number(body.balance ?? 0),
    bank: String(body.bank ?? ""),
    city: typeof body.city === "string" ? body.city : undefined,
    conditionText: typeof body.conditionText === "string" ? body.conditionText : undefined,
    country: String(body.country ?? "United States") as TreasuryCountry,
  });

  return Response.json(
    {
      account,
      accounts: listTreasuryAccountsFromStore(),
      source: "unified-treasury-ledger",
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
