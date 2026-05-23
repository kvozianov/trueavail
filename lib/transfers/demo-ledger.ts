import { createHash } from "crypto";
import {
  DEMO_REGULATOR_VIEW_KEY,
  DEMO_SIGNER,
  TRANSFER_POLICY_VERSION,
  defaultTransferIntent,
  findBlockchainRoute,
  normalizeTransferIntent,
} from "@/lib/transfers/transfer-rail-fixtures";
import { encryptComplianceMemo } from "@/lib/transfers/encryption-demo";
import { findTreasuryAccountFromStore } from "@/lib/treasury-ledger-store";
import type {
  BlockchainTransferReceipt,
  ComplianceMemo,
  PolicyCheck,
  PublicTransactionPreview,
  TransferIntent,
} from "@/lib/transfers/transfer-rail-types";

type LedgerGlobal = typeof globalThis & {
  __trueAvailTransferLedger?: Map<string, BlockchainTransferReceipt>;
};

const ledger = ((globalThis as LedgerGlobal).__trueAvailTransferLedger ??= new Map());

function stableHex(input: string, length = 64) {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}

export function buildComplianceMemo(intentInput: Partial<TransferIntent>): ComplianceMemo {
  const intent = normalizeTransferIntent(intentInput);
  const from = findTreasuryAccountFromStore(intent.fromAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.fromAccountId);
  const to = findTreasuryAccountFromStore(intent.toAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.toAccountId);
  const route = findBlockchainRoute(intent.routeId);
  if (!from || !to) throw new Error("Compliance memo account not found");

  return {
    invoiceId: `INV-${stableHex(`${from.id}:${to.id}:${intent.amount}:${intent.purpose}`, 10).toUpperCase()}`,
    companyBin: to.taxId,
    fromLegalEntity: from.legalEntity,
    toLegalEntity: to.legalEntity,
    amount: intent.amount,
    currency: intent.currency,
    fxRate: intent.currency === "USD" ? 450 : 1,
    date: "2026-05-23",
    purpose: intent.purpose,
    route: route.label,
    signer: DEMO_SIGNER,
    policyVersion: TRANSFER_POLICY_VERSION,
  };
}

export function buildPolicyChecks(intentInput: Partial<TransferIntent>): PolicyCheck[] {
  const intent = normalizeTransferIntent(intentInput);
  const from = findTreasuryAccountFromStore(intent.fromAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.fromAccountId);
  const to = findTreasuryAccountFromStore(intent.toAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.toAccountId);
  if (!from || !to) throw new Error("Policy check account not found");
  const sameCompany = from.companyId === to.companyId;
  const kybApproved = from.kybStatus === "approved" && to.kybStatus === "approved";
  const signerOk = intent.requirements.signerQuorum === "2-of-2" || intent.requirements.signerQuorum === "1-of-1";

  return [
    {
      label: "Same company group",
      value: sameCompany ? "TrueAvail Treasury Group" : "Entity mismatch",
      state: sameCompany ? "pass" : "blocked",
    },
    {
      label: "KYB allowlist",
      value: kybApproved ? `${from.label} -> ${to.label}` : "KYB rejected",
      state: kybApproved ? "pass" : "blocked",
    },
    {
      label: "Signer quorum",
      value: signerOk ? intent.requirements.signerQuorum : "missing",
      state: signerOk ? "pass" : "blocked",
    },
    {
      label: "Regulator view key",
      value: intent.requirements.regulatorReadable ? "encrypted memo enabled" : "hash only",
      state: intent.requirements.regulatorReadable ? "pass" : "warning",
    },
  ];
}

export function buildBlockchainReceipt(intentInput: Partial<TransferIntent>, viewKey = DEMO_REGULATOR_VIEW_KEY): BlockchainTransferReceipt {
  const intent = normalizeTransferIntent({ ...intentInput, rail: "blockchain" });
  const from = findTreasuryAccountFromStore(intent.fromAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.fromAccountId);
  const to = findTreasuryAccountFromStore(intent.toAccountId) ?? findTreasuryAccountFromStore(defaultTransferIntent.toAccountId);
  const route = findBlockchainRoute(intent.routeId);
  if (!from || !to) throw new Error("Blockchain receipt account not found");
  const complianceMemo = buildComplianceMemo(intent);
  const encrypted = encryptComplianceMemo(complianceMemo, viewKey);
  const seed = `${from.walletAddress}:${to.walletAddress}:${intent.amount}:${encrypted.memoHash}:${route.id}`;
  const txHash = `0x${stableHex(seed)}` as const;

  return {
    txId: `zk-${stableHex(txHash, 12)}`,
    txHash,
    rail: "blockchain",
    status: "finalized",
    network: route.network,
    asset: route.asset,
    fromWallet: from.walletAddress,
    toWallet: to.walletAddress,
    encryptedMemo: encrypted.encryptedMemo,
    memoHash: encrypted.memoHash,
    contractCall: {
      contract: "CorporateLiquidity",
      method: "transferLiquidity",
      to: to.walletAddress,
      amount: String(intent.amount),
      encryptedMemo: encrypted.encryptedMemoBytes32,
    },
    finalitySeconds: route.finalitySeconds,
    feeEstimate: route.feeEstimate,
    signer: DEMO_SIGNER,
    policyVersion: TRANSFER_POLICY_VERSION,
    policyChecks: buildPolicyChecks(intent),
    complianceMemo,
    createdAt: "2026-05-23T11:00:00.000Z",
  };
}

export function saveBlockchainReceipt(receipt: BlockchainTransferReceipt) {
  ledger.set(receipt.txId, receipt);
  ledger.set(receipt.txHash, receipt);
  return receipt;
}

export function getBlockchainReceipt(txId?: string) {
  if (txId && ledger.has(txId)) {
    return ledger.get(txId);
  }

  const fallback = saveBlockchainReceipt(buildBlockchainReceipt(defaultTransferIntent));
  if (!txId || txId === "latest" || txId === fallback.txId || txId === fallback.txHash) {
    return fallback;
  }

  return undefined;
}

export function publicPreviewFromReceipt(receipt: BlockchainTransferReceipt): PublicTransactionPreview {
  return {
    txId: receipt.txId,
    txHash: receipt.txHash,
    fromWallet: receipt.fromWallet,
    toWallet: receipt.toWallet,
    amount: receipt.complianceMemo.amount,
    currency: receipt.complianceMemo.currency,
    network: receipt.network,
    encryptedMemo: receipt.encryptedMemo,
    memoHash: receipt.memoHash,
  };
}
