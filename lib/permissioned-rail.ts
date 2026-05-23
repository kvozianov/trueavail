import type { GoldenIncident } from "@/lib/golden-incident";

export type RailOptionKey = "legacy" | "permissioned";

export type RailOutcomeKey =
  | "clear"
  | "limit-exceeded"
  | "signer-missing"
  | "entity-ineligible"
  | "counterparty-risk"
  | "governance-reject";

export type RailState =
  | "pending"
  | "breached"
  | "proposed"
  | "endorsed"
  | "committed"
  | "governed";

export type RailPolicyCheck = {
  id: string;
  label: string;
  description: string;
  pass: boolean;
  metric: string;
  failOutcome?: Exclude<RailOutcomeKey, "clear">;
};

export type RailRoute = {
  key: RailOptionKey;
  label: string;
  route: string;
  sourceAccount: string;
  destinationAccount: string;
  amount: number;
  currency: "EUR";
  finalitySla: string;
  availability: string;
  p05GapAfter: number;
  timeToLiquidityMinutes: number;
  contingency: string;
  governance: string;
};

export type RailFailureScenario = {
  key: RailOutcomeKey;
  label: string;
  state: RailState;
  reason: string;
  failedCheckId?: string;
  governance: string;
};

export type PermissionedRailScenario = {
  title: string;
  framing: string;
  railName: string;
  oldWay: RailRoute;
  permissioned: RailRoute;
  before: {
    p05Gap: number;
    timeToLiquidityMinutes: number;
    contingency: string;
  };
  after: {
    p05Gap: number;
    timeToLiquidityMinutes: number;
    contingency: string;
    residualRisk: string;
  };
  policyChecks: RailPolicyCheck[];
  signer: {
    role: string;
    name: string;
    approvalState: string;
    approvalTime: string;
  };
  certificate: {
    id: string;
    auditHash: string;
    policyVersion: string;
    evidence: string;
    residualRisk: string;
  };
  states: Array<{
    state: RailState;
    label: string;
    detail: string;
  }>;
  failureScenarios: RailFailureScenario[];
};

export function buildPermissionedRailScenario(incident: GoldenIncident): PermissionedRailScenario {
  const residualGap = 186_774;
  const moveAmount = incident.p05Gap - residualGap;

  return {
    title: "Legacy rail versus permissioned liquidity mobility overlay",
    framing:
      "The overlay does not create liquidity. It makes already-approved intragroup EUR liquidity usable before cut-off, then leaves residual risk under governance.",
    railName: "Permissioned Liquidity Mobility Overlay",
    oldWay: {
      key: "legacy",
      label: "Legacy SWIFT / correspondent rail",
      route: "Atlas EUR Reserve -> correspondent bank -> atlas-eur-operating",
      sourceAccount: "atlas-eur-reserve",
      destinationAccount: incident.accountId,
      amount: moveAmount,
      currency: "EUR",
      finalitySla: "T+1 bank day",
      availability: "after 18:00 UTC cut-off",
      p05GapAfter: incident.p05Gap,
      timeToLiquidityMinutes: 1_260,
      contingency: "prefund / throttle",
      governance: "reject until funds are confirmed usable",
    },
    permissioned: {
      key: "permissioned",
      label: "Permissioned corporate ledger rail",
      route: "Atlas EUR Reserve -> permissioned ledger instruction -> atlas-eur-operating",
      sourceAccount: "atlas-eur-reserve",
      destinationAccount: incident.accountId,
      amount: moveAmount,
      currency: "EUR",
      finalitySla: "12 minutes",
      availability: "before 18:00 UTC cut-off",
      p05GapAfter: residualGap,
      timeToLiquidityMinutes: 12,
      contingency: "ledger move + residual throttle",
      governance: "conditional release after policy endorsement",
    },
    before: {
      p05Gap: incident.p05Gap,
      timeToLiquidityMinutes: 1_260,
      contingency: "prefund / throttle",
    },
    after: {
      p05Gap: residualGap,
      timeToLiquidityMinutes: 12,
      contingency: "ledger move + residual throttle",
      residualRisk: "EUR 0.187M remains throttled until the survival floor is restored.",
    },
    policyChecks: [
      {
        id: "entity",
        label: "Entity eligible",
        description: "Both accounts belong to the same approved treasury group.",
        pass: true,
        metric: "Atlas Treasury Group / EUR",
        failOutcome: "entity-ineligible",
      },
      {
        id: "limit",
        label: "Mobility limit",
        description: "Move stays inside the EUR intragroup liquidity mobility limit.",
        pass: true,
        metric: "EUR 1.950M <= EUR 2.500M",
        failOutcome: "limit-exceeded",
      },
      {
        id: "risk",
        label: "Counterparty risk ceiling",
        description: "Overlay path does not increase stressed bank concentration above policy ceiling.",
        pass: true,
        metric: "HHI 0.248 after ledger move",
        failOutcome: "counterparty-risk",
      },
      {
        id: "signer",
        label: "Signer approval",
        description: "Treasury signer must endorse the instruction before commitment.",
        pass: true,
        metric: "CFO delegate endorsed",
        failOutcome: "signer-missing",
      },
      {
        id: "governance",
        label: "Governance gate",
        description: "Original payout approval remains rejected until the movement receipt is committed.",
        pass: true,
        metric: "conditional release, residual throttle",
        failOutcome: "governance-reject",
      },
    ],
    signer: {
      role: "CFO delegate",
      name: "Elena Kovacs",
      approvalState: "endorsed",
      approvalTime: "2026-05-19 17:41 UTC",
    },
    certificate: {
      id: "plmo-atlas-eur-20260519-01",
      auditHash: "sha256:8f1c2d7a4b0e6f29c91a6d3e5b74a221",
      policyVersion: "treasury-mobility-v0.8",
      evidence: "snapshot:golden-incident / rail:permissioned-overlay / mode:replay",
      residualRisk: "EUR 0.187M p05 gap remains governed.",
    },
    states: [
      {
        state: "pending",
        label: "Pending",
        detail: "Treasury sees the payout before downside evidence is revealed.",
      },
      {
        state: "breached",
        label: "Breached",
        detail: "p05 liquidity gap and TARGET2 stress prove the legacy route misses cut-off.",
      },
      {
        state: "proposed",
        label: "Proposed",
        detail: "The overlay proposes moving approved intragroup EUR liquidity before cut-off.",
      },
      {
        state: "endorsed",
        label: "Endorsed",
        detail: "Policy checks pass and the CFO delegate signs the instruction.",
      },
      {
        state: "committed",
        label: "Committed",
        detail: "Finality receipt is recorded with audit hash and residual risk.",
      },
      {
        state: "governed",
        label: "Governed",
        detail: "Contingency changes to ledger move plus residual throttle.",
      },
    ],
    failureScenarios: [
      {
        key: "clear",
        label: "Clear path",
        state: "committed",
        reason: "All policy checks pass and the movement receipt is ready for audit.",
        governance: "conditional release with residual throttle",
      },
      {
        key: "limit-exceeded",
        label: "Limit exceeded",
        state: "governed",
        reason: "Requested mobility instruction is above the approved EUR intragroup limit.",
        failedCheckId: "limit",
        governance: "reject overlay, keep prefund / throttle",
      },
      {
        key: "signer-missing",
        label: "Signer missing",
        state: "proposed",
        reason: "CFO delegate endorsement is absent before the commitment deadline.",
        failedCheckId: "signer",
        governance: "reject overlay, escalate signer workflow",
      },
      {
        key: "entity-ineligible",
        label: "Entity not eligible",
        state: "governed",
        reason: "Source entity is outside the approved treasury mobility policy.",
        failedCheckId: "entity",
        governance: "reject overlay, require manual treasury review",
      },
      {
        key: "counterparty-risk",
        label: "Counterparty risk too high",
        state: "governed",
        reason: "The proposed movement would keep HHI above the risk ceiling after stress.",
        failedCheckId: "risk",
        governance: "reject overlay, preserve original contingency",
      },
      {
        key: "governance-reject",
        label: "Governance still rejects",
        state: "governed",
        reason: "Policy endorsement passes, but residual p05 gap stays too large for release.",
        failedCheckId: "governance",
        governance: "reject payout, ledger move remains contingency only",
      },
    ],
  };
}
