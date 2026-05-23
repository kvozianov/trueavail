export type TransferRail = "swift" | "blockchain";

export type TransferCurrency = "USD" | "EUR" | "KZT" | "AED";

export type TransferAccount = {
  id: string;
  label: string;
  legalEntity: string;
  companyId: string;
  taxId: string;
  jurisdiction: string;
  city: string;
  bank: string;
  accountCode: string;
  currency: TransferCurrency;
  balance: number;
  usableBalance: number;
  survivalFloor: number;
  condition: string;
  primaryRail: string;
  walletAddress: `0x${string}`;
  bankIban: string;
  kybStatus: "approved" | "pending" | "blocked";
};

export type BlockchainRoute = {
  id: string;
  label: string;
  network: "zkSync Era Sepolia" | "Internal Permissioned Rail";
  asset: "USDC_TEST" | "ETH_MOCK";
  finalitySeconds: number;
  feeEstimate: string;
  privacyMode: "encrypted_memo" | "hash_only";
};

export type SwiftRoute = {
  id: string;
  label: string;
  eta: string;
  treasuryOwner: string;
  cutOffRisk: "low" | "medium" | "high";
};

export type TransferRequirements = {
  regulatorReadable: boolean;
  privateMarketMemo: boolean;
  signerQuorum: "1-of-1" | "2-of-2";
  requiredBefore: string;
  complianceLanguage: "en" | "ru";
};

export type TransferIntent = {
  rail: TransferRail;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TransferCurrency;
  purpose: string;
  routeId?: string;
  requirements: TransferRequirements;
};

export type PolicyCheckState = "pass" | "warning" | "blocked";

export type PolicyCheck = {
  label: string;
  value: string;
  state: PolicyCheckState;
};

export type SwiftCommandReceipt = {
  commandId: string;
  rail: "swift";
  status: "created";
  assignedOwner: string;
  eta: string;
  cutOffRisk: SwiftRoute["cutOffRisk"];
  requiredDocuments: string[];
  timeline: Array<{
    label: string;
    detail: string;
    state: "done" | "active" | "pending";
  }>;
  policyChecks: PolicyCheck[];
  createdAt: string;
};

export type ComplianceMemo = {
  invoiceId: string;
  companyBin: string;
  fromLegalEntity: string;
  toLegalEntity: string;
  amount: number;
  currency: TransferCurrency;
  fxRate: number;
  date: string;
  purpose: string;
  route: string;
  signer: string;
  policyVersion: string;
};

export type BlockchainTransferReceipt = {
  txId: string;
  txHash: `0x${string}`;
  rail: "blockchain";
  status: "finalized";
  network: BlockchainRoute["network"];
  asset: BlockchainRoute["asset"];
  fromWallet: `0x${string}`;
  toWallet: `0x${string}`;
  encryptedMemo: string;
  memoHash: `0x${string}`;
  contractCall: {
    contract: "CorporateLiquidity";
    method: "transferLiquidity";
    to: `0x${string}`;
    amount: string;
    encryptedMemo: `0x${string}`;
  };
  finalitySeconds: number;
  feeEstimate: string;
  signer: string;
  policyVersion: string;
  policyChecks: PolicyCheck[];
  complianceMemo: ComplianceMemo;
  ledgerMovement?: {
    id: string;
    status: "settled" | "pending";
    fromBalanceAfter: number;
    toBalanceAfter: number;
  };
  createdAt: string;
};

export type PublicTransactionPreview = {
  txId: string;
  txHash: `0x${string}`;
  fromWallet: `0x${string}`;
  toWallet: `0x${string}`;
  amount: number;
  currency: TransferCurrency;
  network: BlockchainRoute["network"];
  encryptedMemo: string;
  memoHash: `0x${string}`;
};

export type ComplianceLookupResponse = {
  publicPreview: PublicTransactionPreview;
  decryptedReport: ComplianceMemo | null;
  viewKeyAccepted: boolean;
  message: string;
};
