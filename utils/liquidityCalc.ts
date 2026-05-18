import type {
  BankAccount,
  BankCalendar,
  CashFlow,
  SettlementRule,
} from "@/types/finance";
import { calculateSettlementDate } from "@/utils/settlement";

type UsableLiquidityParams = {
  account: BankAccount;
  cashFlows: CashFlow[];
  asOfDate: Date;
  settlementRules: SettlementRule[];
  calendar: BankCalendar;
};

function isSameAccountFlow(account: BankAccount, cashFlow: CashFlow) {
  return cashFlow.accountId === account.id && cashFlow.currency === account.currency;
}

function getExpectedSettledInflows(params: UsableLiquidityParams) {
  return params.cashFlows
    .filter((cashFlow) => isSameAccountFlow(params.account, cashFlow))
    .filter((cashFlow) => cashFlow.status === "pending")
    .filter((cashFlow) => cashFlow.direction === "inflow")
    .filter((cashFlow) => {
      const settlementDate = calculateSettlementDate(
        cashFlow,
        params.settlementRules,
        params.calendar,
      );

      return settlementDate <= params.asOfDate;
    })
    .reduce((sum, cashFlow) => sum + cashFlow.amount, 0);
}

function getPlannedOutflows(params: UsableLiquidityParams) {
  return params.cashFlows
    .filter((cashFlow) => isSameAccountFlow(params.account, cashFlow))
    .filter((cashFlow) => cashFlow.status === "pending")
    .filter((cashFlow) => cashFlow.direction === "outflow")
    .filter((cashFlow) => new Date(cashFlow.expectedAt) <= params.asOfDate)
    .reduce((sum, cashFlow) => sum + cashFlow.amount, 0);
}

export function calculateUsableLiquidity(params: UsableLiquidityParams) {
  const expectedSettledInflows = getExpectedSettledInflows(params);
  const plannedOutflows = getPlannedOutflows(params);

  return (
    params.account.settledBalance +
    expectedSettledInflows -
    plannedOutflows -
    params.account.requiredBuffer
  );
}
