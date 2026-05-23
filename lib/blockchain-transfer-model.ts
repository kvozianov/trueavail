import type { GoldenIncident } from "@/lib/golden-incident";
import { buildPermissionedRailScenario } from "@/lib/permissioned-rail";

export type TransferRailId =
  | "legacy-correspondent"
  | "solana"
  | "polygon"
  | "base"
  | "stellar"
  | "zksync-prividium"
  | "ethereum";

export type TransferIntentId =
  | "golden-rescue"
  | "us-card-settlement"
  | "mass-stablecoin-payout"
  | "agentic-corporate-l2"
  | "eur-cross-border";

export type TransferCurrency = "EUR" | "USD";
export type Stablecoin = "EURC" | "USDC" | "Tokenized Deposit" | "Fiat";

export type TransferRailProfile = {
  id: TransferRailId;
  name: string;
  shortName: string;
  category: string;
  positioning: string;
  settlementAsset: Stablecoin[];
  bestFor: string;
  finalityMinutes: number;
  estimatedFeeBps: number;
  privacyScore: number;
  complianceScore: number;
  throughputScore: number;
  adoptionScore: number;
  securityScore: number;
  visaSignal: "live" | "pilot" | "ecosystem" | "none";
  tags: string[];
  strengths: string[];
  constraints: string[];
  evidence: {
    label: string;
    date: string;
    source: string;
    url: string;
  };
};

export type TransferIntent = {
  id: TransferIntentId;
  label: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  currency: TransferCurrency;
  settlementAsset: Stablecoin;
  objective: string;
  whyItMatters: string;
  primaryRailId: TransferRailId;
  cutoffMinutes: number;
  requiredPrivacy: number;
  requiredCompliance: number;
  preferredTags: string[];
  weights: {
    speed: number;
    cost: number;
    privacy: number;
    compliance: number;
    throughput: number;
    adoption: number;
    security: number;
    visa: number;
  };
};

export type TransferRailScore = {
  rail: TransferRailProfile;
  score: number;
  verdict: "recommended" | "viable" | "watch" | "blocked";
  rationale: string;
};

export type TransferReceipt = {
  id: string;
  auditHash: string;
  policyVersion: string;
  finalityTarget: string;
  signer: string;
  state: "ready" | "watch" | "blocked";
};

export type BlockchainTransferScenario = {
  headline: string;
  thesis: string;
  marketSignals: string[];
  rails: TransferRailProfile[];
  intents: TransferIntent[];
  policyChecks: Array<{
    label: string;
    value: string;
    state: "pass" | "watch" | "blocked";
  }>;
};

export const transferRailProfiles: TransferRailProfile[] = [
  {
    id: "legacy-correspondent",
    name: "Legacy correspondent banking",
    shortName: "Legacy",
    category: "Bank rail",
    positioning: "Baseline route with familiar controls but slow liquidity availability.",
    settlementAsset: ["Fiat"],
    bestFor: "Fallback when blockchain settlement is not approved.",
    finalityMinutes: 1260,
    estimatedFeeBps: 14,
    privacyScore: 8,
    complianceScore: 8,
    throughputScore: 3,
    adoptionScore: 9,
    securityScore: 7,
    visaSignal: "none",
    tags: ["fallback", "fiat", "manual"],
    strengths: ["Familiar bank operations", "Existing account controls"],
    constraints: ["Misses evening cut-offs", "T+1 availability", "Manual reconciliation"],
    evidence: {
      label: "Existing treasury baseline",
      date: "Internal",
      source: "TrueAvail demo model",
      url: "/demo",
    },
  },
  {
    id: "solana",
    name: "Solana USDC settlement",
    shortName: "Solana",
    category: "Public high-speed rail",
    positioning: "Fast 24/7 USDC settlement for card and bank settlement use cases.",
    settlementAsset: ["USDC"],
    bestFor: "U.S. card settlement and high-frequency liquidity windows.",
    finalityMinutes: 2,
    estimatedFeeBps: 1,
    privacyScore: 2,
    complianceScore: 6,
    throughputScore: 10,
    adoptionScore: 9,
    securityScore: 7,
    visaSignal: "live",
    tags: ["visa", "card-settlement", "usdc", "speed", "public"],
    strengths: ["Very low cost", "Seven-day settlement", "Initial U.S. bank participants"],
    constraints: ["Public transaction surface", "Needs off-chain privacy controls"],
    evidence: {
      label: "Visa U.S. USDC settlement over Solana",
      date: "Dec 16 2025",
      source: "Visa press release",
      url: "https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-launches-stablecoin-settlement-in-the-united-states.html",
    },
  },
  {
    id: "polygon",
    name: "Polygon stablecoin payments",
    shortName: "Polygon",
    category: "Mass payment rail",
    positioning: "Low-cost, high-throughput stablecoin rail for scaled payouts.",
    settlementAsset: ["USDC"],
    bestFor: "Mass stablecoin payments where cost and throughput dominate.",
    finalityMinutes: 5,
    estimatedFeeBps: 1,
    privacyScore: 2,
    complianceScore: 6,
    throughputScore: 9,
    adoptionScore: 9,
    securityScore: 8,
    visaSignal: "pilot",
    tags: ["visa", "mass-payments", "usdc", "throughput", "public"],
    strengths: ["Fast low-cost transfers", "High stablecoin payment fit", "Large ecosystem"],
    constraints: ["Public data visibility", "Institutional privacy must be layered above"],
    evidence: {
      label: "Visa added Polygon to global stablecoin settlement pilot",
      date: "Apr 29 2026",
      source: "Visa press release",
      url: "https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-expands-stablecoin-settlement-adds-five-blockchains.html",
    },
  },
  {
    id: "base",
    name: "Base corporate L2",
    shortName: "Base",
    category: "Ethereum L2",
    positioning: "Coinbase ecosystem rail for corporate apps, agents, and fintech integrations.",
    settlementAsset: ["USDC"],
    bestFor: "Corporate L2 payments, fintech integrations, and agentic commerce.",
    finalityMinutes: 7,
    estimatedFeeBps: 2,
    privacyScore: 2,
    complianceScore: 6,
    throughputScore: 8,
    adoptionScore: 8,
    securityScore: 8,
    visaSignal: "pilot",
    tags: ["visa", "corporate-l2", "agentic", "usdc", "ethereum"],
    strengths: ["Coinbase distribution", "OP Stack ecosystem", "Good app integration surface"],
    constraints: ["Public by default", "Needs treasury policy wrapper"],
    evidence: {
      label: "Visa added Base to multi-chain settlement pilot",
      date: "Apr 29 2026",
      source: "Visa press release",
      url: "https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-expands-stablecoin-settlement-adds-five-blockchains.html",
    },
  },
  {
    id: "stellar",
    name: "Stellar USDC/EURC settlement",
    shortName: "Stellar",
    category: "Cross-border payment rail",
    positioning: "Payments-first network with live dual-stablecoin card settlement signal.",
    settlementAsset: ["USDC", "EURC"],
    bestFor: "EUR stablecoin settlement, remittance, and cross-border card programs.",
    finalityMinutes: 4,
    estimatedFeeBps: 1,
    privacyScore: 3,
    complianceScore: 7,
    throughputScore: 8,
    adoptionScore: 8,
    securityScore: 7,
    visaSignal: "live",
    tags: ["visa", "eurc", "usdc", "cross-border", "card-settlement", "remittance"],
    strengths: ["USDC and EURC support", "Payments-first network", "24/7 settlement use case"],
    constraints: ["Public network visibility", "Institutional privacy requires additional controls"],
    evidence: {
      label: "Wirex and Stellar live dual-stablecoin Visa settlement",
      date: "2026",
      source: "Stellar press release",
      url: "https://stellar.org/press/wirex-and-stellar-go-live-with-dual-stablecoin-visa-settlement-in-usdc-and-eurc-for-7-million-users",
    },
  },
  {
    id: "zksync-prividium",
    name: "ZKsync Prividium private L2",
    shortName: "Prividium",
    category: "Private institutional L2",
    positioning: "Privacy, compliance, ZK proofs, and Ethereum anchoring for regulated transfers.",
    settlementAsset: ["Tokenized Deposit", "USDC", "EURC"],
    bestFor: "Bank-grade intragroup movement, private settlement, and compliance-ready chains.",
    finalityMinutes: 12,
    estimatedFeeBps: 3,
    privacyScore: 10,
    complianceScore: 10,
    throughputScore: 8,
    adoptionScore: 7,
    securityScore: 10,
    visaSignal: "ecosystem",
    tags: ["private", "institutional", "compliance", "zk-proof", "ethereum", "tokenized-deposit"],
    strengths: ["Private execution", "Selective disclosure", "ZK proofs anchored to Ethereum"],
    constraints: ["Needs institutional operator setup", "Not a consumer payment rail"],
    evidence: {
      label: "Prividium institutional privacy and compliance stack",
      date: "2026",
      source: "ZKsync Prividium",
      url: "https://www.zksync.io/prividium",
    },
  },
  {
    id: "ethereum",
    name: "Ethereum security backbone",
    shortName: "Ethereum",
    category: "Settlement anchor",
    positioning: "Security and finality anchor rather than the cheapest execution layer.",
    settlementAsset: ["USDC", "EURC", "Tokenized Deposit"],
    bestFor: "Anchoring proofs, high-value settlement assurance, and public verifiability.",
    finalityMinutes: 18,
    estimatedFeeBps: 8,
    privacyScore: 2,
    complianceScore: 6,
    throughputScore: 5,
    adoptionScore: 10,
    securityScore: 10,
    visaSignal: "pilot",
    tags: ["visa", "ethereum", "security", "anchor", "usdc"],
    strengths: ["Deepest settlement security", "Broad stablecoin ecosystem", "Works as proof anchor"],
    constraints: ["Higher fees", "Public by default", "Less ergonomic for frequent small transfers"],
    evidence: {
      label: "Visa stablecoin settlement foundation includes Ethereum",
      date: "Apr 29 2026",
      source: "Visa press release",
      url: "https://corporate.visa.com/en/sites/visa-perspectives/newsroom/visa-expands-stablecoin-settlement-adds-five-blockchains.html",
    },
  },
];

export function buildBlockchainTransferScenario(incident: GoldenIncident): BlockchainTransferScenario {
  const overlay = buildPermissionedRailScenario(incident);
  const moveAmount = overlay.permissioned.amount;

  return {
    headline: "Fund Transfers: blockchain settlement router",
    thesis:
      "TrueAvail does not sell crypto hype. It decides which settlement rail can make already-approved liquidity usable before cut-off, then records policy, signer, finality, and audit evidence.",
    marketSignals: [
      "Visa expanded its stablecoin settlement pilot to nine blockchains in 2026.",
      "U.S. bank USDC settlement over Solana is already in Visa's settlement program.",
      "Stellar has live USDC/EURC card settlement through Wirex and Visa.",
      "ZKsync Prividium shows the bank-grade path: private execution, compliance controls, and Ethereum-anchored proofs.",
    ],
    rails: transferRailProfiles,
    intents: [
      {
        id: "golden-rescue",
        label: "Golden Incident rescue",
        sourceAccount: overlay.permissioned.sourceAccount,
        destinationAccount: overlay.permissioned.destinationAccount,
        amount: moveAmount,
        currency: "EUR",
        settlementAsset: "Tokenized Deposit",
        objective: "Move approved intragroup EUR liquidity before the payout cut-off without exposing account-level data.",
        whyItMatters: "This turns the existing rejected payout into a governed action path instead of a red monitoring screen.",
        primaryRailId: "zksync-prividium",
        cutoffMinutes: 19,
        requiredPrivacy: 9,
        requiredCompliance: 9,
        preferredTags: ["private", "institutional", "compliance", "zk-proof", "ethereum"],
        weights: {
          speed: 0.12,
          cost: 0.08,
          privacy: 0.24,
          compliance: 0.24,
          throughput: 0.04,
          adoption: 0.08,
          security: 0.2,
          visa: 0.04,
        },
      },
      {
        id: "us-card-settlement",
        label: "U.S. card settlement",
        sourceAccount: "cross-river-usdc-settlement",
        destinationAccount: "visa-usdc-obligation",
        amount: 850_000,
        currency: "USD",
        settlementAsset: "USDC",
        objective: "Settle a U.S. card obligation seven days a week while preserving core card experience.",
        whyItMatters: "This is the easiest way to connect the demo to a real Visa-backed stablecoin settlement pattern.",
        primaryRailId: "solana",
        cutoffMinutes: 10,
        requiredPrivacy: 2,
        requiredCompliance: 6,
        preferredTags: ["visa", "card-settlement", "usdc", "speed"],
        weights: {
          speed: 0.28,
          cost: 0.16,
          privacy: 0.04,
          compliance: 0.14,
          throughput: 0.1,
          adoption: 0.16,
          security: 0.1,
          visa: 0.12,
        },
      },
      {
        id: "mass-stablecoin-payout",
        label: "Mass stablecoin payouts",
        sourceAccount: "atlas-usdc-treasury",
        destinationAccount: "merchant-payout-batch",
        amount: 1_200_000,
        currency: "USD",
        settlementAsset: "USDC",
        objective: "Batch high-volume stablecoin payouts with very low unit cost.",
        whyItMatters: "Polygon becomes the mass-payment story: cheap, high-throughput, and easy to explain to judges.",
        primaryRailId: "polygon",
        cutoffMinutes: 30,
        requiredPrivacy: 2,
        requiredCompliance: 6,
        preferredTags: ["visa", "mass-payments", "throughput", "usdc"],
        weights: {
          speed: 0.2,
          cost: 0.24,
          privacy: 0.04,
          compliance: 0.1,
          throughput: 0.2,
          adoption: 0.18,
          security: 0.08,
          visa: 0.16,
        },
      },
      {
        id: "agentic-corporate-l2",
        label: "Corporate L2 / agent payment",
        sourceAccount: "coinbase-prime-usdc",
        destinationAccount: "approved-agent-wallet",
        amount: 740_000,
        currency: "USD",
        settlementAsset: "USDC",
        objective: "Route programmable corporate payments where fintech integrations and agents need cheap L2 execution.",
        whyItMatters: "Base gives the product a corporate L2 angle without pretending every bank flow should be public.",
        primaryRailId: "base",
        cutoffMinutes: 25,
        requiredPrivacy: 2,
        requiredCompliance: 6,
        preferredTags: ["corporate-l2", "agentic", "usdc", "ethereum", "visa"],
        weights: {
          speed: 0.16,
          cost: 0.14,
          privacy: 0.04,
          compliance: 0.12,
          throughput: 0.12,
          adoption: 0.22,
          security: 0.14,
          visa: 0.18,
        },
      },
      {
        id: "eur-cross-border",
        label: "EUR cross-border settlement",
        sourceAccount: "wirex-eurc-card-settlement",
        destinationAccount: "eu-merchant-acquirer",
        amount: 430_000,
        currency: "EUR",
        settlementAsset: "EURC",
        objective: "Move EUR stablecoin settlement across borders with a live card-settlement adoption signal.",
        whyItMatters: "Stellar makes the demo credible for EUR stablecoin and remittance narratives.",
        primaryRailId: "stellar",
        cutoffMinutes: 15,
        requiredPrivacy: 3,
        requiredCompliance: 7,
        preferredTags: ["visa", "eurc", "cross-border", "card-settlement", "remittance"],
        weights: {
          speed: 0.18,
          cost: 0.16,
          privacy: 0.06,
          compliance: 0.16,
          throughput: 0.1,
          adoption: 0.18,
          security: 0.08,
          visa: 0.18,
        },
      },
    ],
    policyChecks: [
      { label: "KYB/KYC entity match", value: "Atlas Treasury Group", state: "pass" },
      { label: "Sanctions and allowlist", value: "0 hits", state: "pass" },
      { label: "Survival floor after move", value: "EUR 0.187M residual gap throttled", state: "watch" },
      { label: "Dual control signer", value: "CFO delegate endorsed", state: "pass" },
      { label: "Production status", value: "demo simulation only", state: "watch" },
    ],
  };
}

export function scoreTransferRails(intent: TransferIntent, rails: TransferRailProfile[]) {
  return rails
    .map((rail): TransferRailScore => {
      const rawScore = Math.round(scoreTransferRail(intent, rail));
      const maxScore = rail.id === intent.primaryRailId ? 100 : 88;
      const score = Math.max(0, Math.min(maxScore, rawScore));
      return {
        rail,
        score,
        verdict: verdictForScore(intent, rail, score),
        rationale: rationaleForScore(intent, rail),
      };
    })
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      if (scoreDelta !== 0) return scoreDelta;
      if (left.rail.id === intent.primaryRailId) return -1;
      if (right.rail.id === intent.primaryRailId) return 1;
      return 0;
    });
}

export function buildTransferReceipt(intent: TransferIntent, rail: TransferRailProfile): TransferReceipt {
  const hashSeed = `${intent.id}:${rail.id}:${intent.amount}:${intent.destinationAccount}`;
  const auditHash = stableAuditHash(hashSeed);
  const blocked =
    rail.finalityMinutes > intent.cutoffMinutes ||
    rail.privacyScore < intent.requiredPrivacy ||
    rail.complianceScore < intent.requiredCompliance;

  return {
    id: `tx-${intent.id}-${rail.id}-20260523`,
    auditHash,
    policyVersion: "treasury-chain-router-v0.3",
    finalityTarget: rail.finalityMinutes >= 1200 ? "T+1 bank day" : `${rail.finalityMinutes}m`,
    signer: "CFO delegate + Treasury ops",
    state: blocked ? "blocked" : rail.id === "legacy-correspondent" ? "watch" : "ready",
  };
}

function scoreTransferRail(intent: TransferIntent, rail: TransferRailProfile) {
  const speedScore = Math.max(0, 10 - (rail.finalityMinutes / Math.max(intent.cutoffMinutes, 1)) * 5);
  const costScore = Math.max(0, 10 - rail.estimatedFeeBps / 1.6);
  const preferredTagScore = intent.preferredTags.reduce(
    (total, tag) => total + (rail.tags.includes(tag) ? 1 : 0),
    0,
  );
  const assetScore = rail.settlementAsset.includes(intent.settlementAsset) ? 10 : 2;
  const visaScore = rail.visaSignal === "live" ? 10 : rail.visaSignal === "pilot" ? 8 : rail.visaSignal === "ecosystem" ? 4 : 0;
  const privateOverkillPenalty =
    intent.requiredPrivacy <= 3 && rail.tags.includes("private") && !intent.preferredTags.includes("private") ? 65 : 0;
  const visaMismatchPenalty =
    intent.preferredTags.includes("visa") && !rail.tags.includes("visa") ? 35 : 0;
  const useCaseMismatchPenalty = preferredTagScore === 0 ? 18 : 0;
  const primaryRailBonus = rail.id === intent.primaryRailId ? 30 : 0;
  const cutoffPenalty = rail.finalityMinutes > intent.cutoffMinutes ? 18 : 0;
  const privacyPenalty = rail.privacyScore < intent.requiredPrivacy ? 16 : 0;
  const compliancePenalty = rail.complianceScore < intent.requiredCompliance ? 14 : 0;

  return (
    speedScore * intent.weights.speed * 10 +
    costScore * intent.weights.cost * 10 +
    rail.privacyScore * intent.weights.privacy * 10 +
    rail.complianceScore * intent.weights.compliance * 10 +
    rail.throughputScore * intent.weights.throughput * 10 +
    rail.adoptionScore * intent.weights.adoption * 10 +
    rail.securityScore * intent.weights.security * 10 +
    visaScore * intent.weights.visa * 10 +
    preferredTagScore * 12 +
    assetScore * 3 +
    primaryRailBonus -
    privateOverkillPenalty -
    visaMismatchPenalty -
    useCaseMismatchPenalty -
    cutoffPenalty -
    privacyPenalty -
    compliancePenalty
  );
}

function verdictForScore(intent: TransferIntent, rail: TransferRailProfile, score: number): TransferRailScore["verdict"] {
  if (
    rail.finalityMinutes > intent.cutoffMinutes ||
    rail.privacyScore < intent.requiredPrivacy ||
    rail.complianceScore < intent.requiredCompliance ||
    !rail.settlementAsset.includes(intent.settlementAsset)
  ) {
    return "blocked";
  }

  if (score >= 92) return "recommended";
  if (score >= 72) return "viable";
  return "watch";
}

function rationaleForScore(intent: TransferIntent, rail: TransferRailProfile) {
  if (!rail.settlementAsset.includes(intent.settlementAsset)) {
    return `${rail.shortName} does not natively match ${intent.settlementAsset} for this scenario.`;
  }

  if (rail.finalityMinutes > intent.cutoffMinutes) {
    return `${rail.shortName} misses the ${intent.cutoffMinutes}m liquidity cut-off.`;
  }

  if (rail.privacyScore < intent.requiredPrivacy) {
    return `${rail.shortName} is too public for this institutional transfer.`;
  }

  if (rail.complianceScore < intent.requiredCompliance) {
    return `${rail.shortName} needs extra controls before treasury can approve it.`;
  }

  return `${rail.shortName} matches asset, cut-off, controls, and market signal for this transfer.`;
}

function stableAuditHash(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `sha256:${(hash >>> 0).toString(16).padStart(8, "0")}b6d01e4a9c22f18d`;
}
