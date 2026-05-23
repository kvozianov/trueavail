import type {
  BlockchainRoute,
  SwiftRoute,
  TransferAccount,
  TransferIntent,
  TransferRequirements,
} from "@/lib/transfers/transfer-rail-types";
import { findTreasuryAccount, listTreasuryAccounts, TREASURY_ACCOUNT_SEED, type TreasuryAccount } from "@/lib/treasury-ledger";

export const DEMO_REGULATOR_VIEW_KEY = "demo-regulator-view-key";

export const TRANSFER_POLICY_VERSION = "treasury-mobility-v1.0";

export const DEMO_SIGNER = "CFO delegate + Treasury ops";

export function toTransferAccount(account: TreasuryAccount): TransferAccount {
  return {
    id: account.id,
    accountCode: account.accountCode,
    balance: account.balance,
    bank: account.bank,
    bankIban: account.bankIban,
    city: account.city,
    companyId: account.companyId,
    condition: account.condition.en,
    currency: account.currency,
    jurisdiction: account.jurisdiction,
    kybStatus: account.kybStatus,
    label: account.label,
    legalEntity: account.legalEntity,
    primaryRail: account.primaryRail,
    survivalFloor: account.survivalFloor,
    taxId: account.taxId,
    usableBalance: account.usableBalance,
    walletAddress: account.walletAddress,
  };
}

export const transferAccounts: TransferAccount[] = TREASURY_ACCOUNT_SEED.map(toTransferAccount);

export const blockchainRoutes: BlockchainRoute[] = [
  {
    id: "zksync-era-sepolia",
    label: "zkSync Era Sepolia",
    network: "zkSync Era Sepolia",
    asset: "USDC_TEST",
    finalitySeconds: 12,
    feeEstimate: "$0.03 testnet gas",
    privacyMode: "encrypted_memo",
  },
  {
    id: "internal-permissioned-rail",
    label: "Internal Permissioned Rail",
    network: "Internal Permissioned Rail",
    asset: "USDC_TEST",
    finalitySeconds: 90,
    feeEstimate: "internal ledger fee",
    privacyMode: "encrypted_memo",
  },
  {
    id: "native-eth-mock",
    label: "Native ETH Mock",
    network: "zkSync Era Sepolia",
    asset: "ETH_MOCK",
    finalitySeconds: 18,
    feeEstimate: "$0.01 testnet gas",
    privacyMode: "hash_only",
  },
];

export const swiftRoutes: SwiftRoute[] = [
  {
    id: "swift-standard",
    label: "SWIFT MT101 treasury command",
    eta: "T+2 bank days",
    treasuryOwner: "treasury.ops@trueavail.local",
    cutOffRisk: "high",
  },
  {
    id: "swift-priority",
    label: "Priority correspondent bank instruction",
    eta: "T+1 bank day",
    treasuryOwner: "regional.treasury@trueavail.local",
    cutOffRisk: "medium",
  },
];

export const defaultRequirements: TransferRequirements = {
  regulatorReadable: true,
  privateMarketMemo: true,
  signerQuorum: "2-of-2",
  requiredBefore: "16:00 CET",
  complianceLanguage: "en",
};

export const defaultTransferIntent: TransferIntent = {
  rail: "blockchain",
  fromAccountId: "dubai",
  toAccountId: "almaty",
  amount: 50_000,
  currency: "USD",
  purpose: "Intercompany liquidity bridge for payroll reserve",
  routeId: "zksync-era-sepolia",
  requirements: defaultRequirements,
};

export function findTransferAccount(accountId: string) {
  const liveAccount = findTreasuryAccount(accountId);
  if (liveAccount) return toTransferAccount(liveAccount);
  return transferAccounts.find((account) => account.id === accountId) ?? transferAccounts[0];
}

export function listTransferAccounts() {
  return listTreasuryAccounts().map(toTransferAccount);
}

export function findBlockchainRoute(routeId?: string) {
  return blockchainRoutes.find((route) => route.id === routeId) ?? blockchainRoutes[0];
}

export function findSwiftRoute(routeId?: string) {
  return swiftRoutes.find((route) => route.id === routeId) ?? swiftRoutes[0];
}

export function normalizeTransferIntent(input: Partial<TransferIntent>): TransferIntent {
  return {
    ...defaultTransferIntent,
    ...input,
    amount: Number.isFinite(Number(input.amount)) ? Number(input.amount) : defaultTransferIntent.amount,
    requirements: {
      ...defaultRequirements,
      ...(input.requirements ?? {}),
    },
  };
}
