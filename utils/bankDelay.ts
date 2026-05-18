import type {
  BankCalendar,
  BankDelayCheck,
  CashFlow,
  ObservedCashMovement,
  SettlementRule,
} from "@/types/finance";
import { calculateSettlementDate, toDateKey } from "@/utils/settlement";

function findObservedMovement(
  movements: ObservedCashMovement[],
  cashFlowId: string,
) {
  return movements.find((movement) => movement.cashFlowId === cashFlowId);
}

function getDelayReason(cashFlow: CashFlow, slaBreached: boolean) {
  if (!slaBreached) {
    return "Settlement is within expected timing.";
  }

  if (cashFlow.rail === "Card Clearing") {
    return "Card clearing batch settled later than planned.";
  }

  if (cashFlow.rail === "SWIFT") {
    return "Correspondent bank settlement window was missed.";
  }

  return "Bank settlement moved past the expected date.";
}

export function checkBankDelays(params: {
  cashFlows: CashFlow[];
  observedMovements: ObservedCashMovement[];
  settlementRules: SettlementRule[];
  calendar: BankCalendar;
}): BankDelayCheck[] {
  return params.cashFlows
    .filter((cashFlow) => cashFlow.direction === "inflow")
    .map((cashFlow) => {
      const expectedSettlement = calculateSettlementDate(
        cashFlow,
        params.settlementRules,
        params.calendar,
      );
      const observedMovement = findObservedMovement(
        params.observedMovements,
        cashFlow.id,
      );
      const actualSettlement = observedMovement?.settledAt
        ? new Date(observedMovement.settledAt)
        : null;
      const slaBreached = actualSettlement
        ? actualSettlement > expectedSettlement
        : false;

      return {
        id: `bank-delay-${cashFlow.id}`,
        cashFlowId: cashFlow.id,
        accountId: cashFlow.accountId,
        currency: cashFlow.currency,
        rail: cashFlow.rail,
        expectedSettlementDate: toDateKey(expectedSettlement),
        actualSettlementDate: actualSettlement ? toDateKey(actualSettlement) : null,
        slaBreached,
        status: actualSettlement ? "settled" : "pending",
        probableDelayReason: getDelayReason(cashFlow, slaBreached),
      };
    });
}
