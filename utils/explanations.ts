import type {
  BankAccount,
  BankCalendar,
  CashFlow,
  CashGap,
  GapExplanation,
  GapRootCause,
  GapTimelineEvent,
  SettlementRule,
} from "@/types/finance";
import { calculateSettlementDate, toDateKey } from "@/utils/settlement";

type ExplainGapParams = {
  gap: CashGap;
  accounts: BankAccount[];
  cashFlows: CashFlow[];
  settlementRules: SettlementRule[];
  calendar: BankCalendar;
};

function getGapEndDate(gap: CashGap) {
  return new Date(`${gap.date}T23:59:59.999Z`);
}

function isSameAccountGapFlow(gap: CashGap, cashFlow: CashFlow) {
  return cashFlow.accountId === gap.accountId && cashFlow.currency === gap.currency;
}

function getLargestOutflow(gap: CashGap, cashFlows: CashFlow[]) {
  const gapEndDate = getGapEndDate(gap);

  return cashFlows
    .filter((cashFlow) => isSameAccountGapFlow(gap, cashFlow))
    .filter((cashFlow) => cashFlow.direction === "outflow")
    .filter((cashFlow) => new Date(cashFlow.expectedAt) <= gapEndDate)
    .sort((left, right) => right.amount - left.amount)[0];
}

function getDelayedInflow(
  gap: CashGap,
  cashFlows: CashFlow[],
  settlementRules: SettlementRule[],
  calendar: BankCalendar,
) {
  const gapEndDate = getGapEndDate(gap);

  return cashFlows
    .filter((cashFlow) => isSameAccountGapFlow(gap, cashFlow))
    .filter((cashFlow) => cashFlow.direction === "inflow")
    .filter((cashFlow) => {
      const settlementDate = calculateSettlementDate(cashFlow, settlementRules, calendar);

      return settlementDate > gapEndDate;
    })
    .sort((left, right) => {
      const leftDate = calculateSettlementDate(left, settlementRules, calendar);
      const rightDate = calculateSettlementDate(right, settlementRules, calendar);

      return leftDate.getTime() - rightDate.getTime();
    })[0];
}

function buildOutflowCause(cashFlow: CashFlow): GapRootCause {
  return {
    type: "large_outflow",
    title: "Large payout before the gap",
    detail: `${cashFlow.businessReason} sends ${cashFlow.currency} ${cashFlow.amount.toLocaleString()} to ${cashFlow.counterparty}.`,
    amount: cashFlow.amount,
    cashFlowId: cashFlow.id,
  };
}

function buildDelayedInflowCause(
  cashFlow: CashFlow,
  settlementRules: SettlementRule[],
  calendar: BankCalendar,
): GapRootCause {
  const settlementDate = calculateSettlementDate(cashFlow, settlementRules, calendar);

  return {
    type: "delayed_inflow",
    title: "Incoming money settles too late",
    detail: `${cashFlow.businessReason} is expected via ${cashFlow.rail}, but becomes usable on ${toDateKey(settlementDate)}.`,
    amount: cashFlow.amount,
    cashFlowId: cashFlow.id,
  };
}

function buildBufferCause(account: BankAccount): GapRootCause {
  return {
    type: "required_buffer",
    title: "Required buffer still has to be protected",
    detail: `${account.label} must keep ${account.currency} ${account.requiredBuffer.toLocaleString()} as a minimum safe balance.`,
    amount: account.requiredBuffer,
  };
}

function buildTimeline(
  gap: CashGap,
  outflow: CashFlow | undefined,
  delayedInflow: CashFlow | undefined,
  settlementRules: SettlementRule[],
  calendar: BankCalendar,
): GapTimelineEvent[] {
  const events: GapTimelineEvent[] = [];

  if (outflow) {
    events.push({
      date: toDateKey(new Date(outflow.expectedAt)),
      label: "Payout due",
      detail: `${outflow.currency} ${outflow.amount.toLocaleString()} for ${outflow.businessReason}.`,
    });
  }

  events.push({
    date: gap.date,
    label: "Risk date",
    detail: `${gap.riskStatus} liquidity status detected for ${gap.currency}.`,
  });

  if (delayedInflow) {
    const settlementDate = calculateSettlementDate(delayedInflow, settlementRules, calendar);

    events.push({
      date: toDateKey(settlementDate),
      label: "Inflow becomes usable",
      detail: `${delayedInflow.currency} ${delayedInflow.amount.toLocaleString()} settles from ${delayedInflow.counterparty}.`,
    });
  }

  return events;
}

export function explainGap(params: ExplainGapParams): GapExplanation {
  const account = params.accounts.find((item) => item.id === params.gap.accountId);

  if (!account) {
    console.warn("Gap account missing, using account id in explanation", {
      accountId: params.gap.accountId,
    });
  }

  const accountLabel = account?.label ?? params.gap.accountId;
  const largestOutflow = getLargestOutflow(params.gap, params.cashFlows);
  const delayedInflow = getDelayedInflow(
    params.gap,
    params.cashFlows,
    params.settlementRules,
    params.calendar,
  );

  const rootCauses: GapRootCause[] = [];

  if (largestOutflow) {
    rootCauses.push(buildOutflowCause(largestOutflow));
  }

  if (delayedInflow) {
    rootCauses.push(
      buildDelayedInflowCause(delayedInflow, params.settlementRules, params.calendar),
    );
  }

  if (account) {
    rootCauses.push(buildBufferCause(account));
  }

  return {
    gap: params.gap,
    accountLabel,
    summary: `${params.gap.currency} risk on ${params.gap.date}: ${accountLabel} drops to ${params.gap.riskStatus} because planned payouts and settlement timing reduce usable liquidity before the account is safely funded.`,
    rootCauses: rootCauses.slice(0, 3),
    timeline: buildTimeline(
      params.gap,
      largestOutflow,
      delayedInflow,
      params.settlementRules,
      params.calendar,
    ),
  };
}
