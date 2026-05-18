import type {
  BankAccount,
  BankCalendar,
  CashGap,
  LiquidityRecommendation,
} from "@/types/finance";

type GenerateRecommendationParams = {
  gaps: CashGap[];
  accounts: BankAccount[];
  calendar: BankCalendar;
};

function getIdleFunds(account: BankAccount) {
  return Math.max(0, account.settledBalance - account.requiredBuffer);
}

function getEarliestGap(gaps: CashGap[]) {
  return [...gaps].sort((left, right) => {
    const leftTime = new Date(`${left.date}T00:00:00.000Z`).getTime();
    const rightTime = new Date(`${right.date}T00:00:00.000Z`).getTime();

    return leftTime - rightTime;
  })[0];
}

function getDestinationAccount(gap: CashGap, accounts: BankAccount[]) {
  return accounts.find((account) => account.id === gap.accountId);
}

function getSourceAccount(gap: CashGap, accounts: BankAccount[]) {
  return accounts
    .filter((account) => account.id !== gap.accountId)
    .filter((account) => account.currency === gap.currency)
    .filter((account) => getIdleFunds(account) > 0)
    .sort((left, right) => getIdleFunds(right) - getIdleFunds(left))[0];
}

function getRecommendedAmount(gap: CashGap, sourceAccount: BankAccount) {
  const cushion = sourceAccount.currency === "EUR" ? 500_000 : 250_000;
  const neededAmount = gap.shortageAmount + cushion;

  return Math.min(neededAmount, getIdleFunds(sourceAccount));
}

function getDeadline(gap: CashGap, calendar: BankCalendar) {
  return `${gap.date}T${String(calendar.cutoffHour).padStart(2, "0")}:00:00.000Z`;
}

export function generateRecommendation(
  params: GenerateRecommendationParams,
): LiquidityRecommendation | null {
  const gap = getEarliestGap(params.gaps);

  if (!gap) {
    return null;
  }

  const destinationAccount = getDestinationAccount(gap, params.accounts);
  const sourceAccount = getSourceAccount(gap, params.accounts);

  if (!destinationAccount || !sourceAccount) {
    console.warn("Recommendation skipped, matching treasury account not found", {
      gapAccountId: gap.accountId,
      currency: gap.currency,
    });

    return null;
  }

  const amount = getRecommendedAmount(gap, sourceAccount);

  if (amount <= 0) {
    console.warn("Recommendation skipped, no idle funds available", {
      sourceAccountId: sourceAccount.id,
      currency: sourceAccount.currency,
    });

    return null;
  }

  return {
    id: `rec-${gap.currency.toLowerCase()}-${gap.date}`,
    currency: gap.currency,
    amount,
    sourceAccountId: sourceAccount.id,
    destinationAccountId: destinationAccount.id,
    deadline: getDeadline(gap, params.calendar),
    expectedImpact: `Transfer ${gap.currency} ${amount.toLocaleString()} from ${sourceAccount.label} to ${destinationAccount.label} before cut-off to remove the ${gap.riskStatus} liquidity risk.`,
  };
}
