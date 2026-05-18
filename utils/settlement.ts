import type { BankCalendar, CashFlow, SettlementRule } from "@/types/finance";

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date) {
  const day = date.getUTCDay();

  return day === 0 || day === 6;
}

export function isHoliday(date: Date, calendar: BankCalendar) {
  return calendar.holidays.includes(toDateKey(date));
}

export function isBusinessDay(date: Date, calendar: BankCalendar) {
  return !isWeekend(date) && !isHoliday(date, calendar);
}

export function moveToNextBusinessDay(date: Date, calendar: BankCalendar) {
  let nextDate = new Date(date);

  while (!isBusinessDay(nextDate, calendar)) {
    nextDate = new Date(nextDate.getTime() + DAY_MS);
  }

  return nextDate;
}

export function addBusinessDays(date: Date, days: number, calendar: BankCalendar) {
  let result = moveToNextBusinessDay(date, calendar);
  let addedDays = 0;

  while (addedDays < days) {
    result = new Date(result.getTime() + DAY_MS);

    if (isBusinessDay(result, calendar)) {
      addedDays += 1;
    }
  }

  return result;
}

export function isAfterCutoff(date: Date, calendar: BankCalendar) {
  return date.getUTCHours() >= calendar.cutoffHour;
}

export function getSettlementStartDate(expectedAt: string, calendar: BankCalendar) {
  const expectedDate = new Date(expectedAt);

  if (isAfterCutoff(expectedDate, calendar)) {
    return moveToNextBusinessDay(new Date(expectedDate.getTime() + DAY_MS), calendar);
  }

  return moveToNextBusinessDay(expectedDate, calendar);
}

export function calculateSettlementDate(
  cashFlow: CashFlow,
  rules: SettlementRule[],
  calendar: BankCalendar,
) {
  const rule = rules.find((item) => item.rail === cashFlow.rail);

  if (!rule) {
    console.warn("Settlement rule missing, using T+1 fallback", {
      cashFlowId: cashFlow.id,
      rail: cashFlow.rail,
    });
  }

  const startDate = getSettlementStartDate(cashFlow.expectedAt, calendar);
  const delayBusinessDays = rule?.delayBusinessDays ?? 1;

  return addBusinessDays(startDate, delayBusinessDays, calendar);
}
