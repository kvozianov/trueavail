import type { ObservedCashMovement, OnlineCorrectionAlert } from "@/types/finance";

const WATCH_THRESHOLD = 0.05;
const ALERT_THRESHOLD = 0.15;

function getDifferencePercent(movement: ObservedCashMovement) {
  if (movement.expectedAmount === 0) {
    return 0;
  }

  return Math.abs(movement.actualAmount - movement.expectedAmount) / movement.expectedAmount;
}

function getSeverity(differencePercent: number): OnlineCorrectionAlert["severity"] {
  if (differencePercent >= ALERT_THRESHOLD) {
    return "alert";
  }

  return "watch";
}

export function checkOnlineCorrections(
  movements: ObservedCashMovement[],
): OnlineCorrectionAlert[] {
  return movements
    .map((movement) => {
      const difference = movement.actualAmount - movement.expectedAmount;
      const differencePercent = getDifferencePercent(movement);
      const severity = getSeverity(differencePercent);

      return {
        id: `online-correction-${movement.id}`,
        cashFlowId: movement.cashFlowId,
        accountId: movement.accountId,
        currency: movement.currency,
        observedAt: movement.observedAt,
        expectedAmount: movement.expectedAmount,
        actualAmount: movement.actualAmount,
        difference,
        differencePercent,
        severity,
        message: `${movement.source} observed ${movement.currency} ${movement.actualAmount.toLocaleString()} instead of expected ${movement.currency} ${movement.expectedAmount.toLocaleString()}.`,
      };
    })
    .filter((alert) => alert.differencePercent >= WATCH_THRESHOLD);
}
