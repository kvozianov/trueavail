export type Currency = "EUR" | "USD" | "GBP";

export type MoneyAmount = {
  amount: number;
  currency: Currency;
};

export type BankRail = "SEPA" | "SWIFT" | "Card Clearing" | "Local Bank Transfer";

export type FlowDirection = "inflow" | "outflow";

export type CashFlowStatus = "pending" | "settled";

export type BankAccount = {
  id: string;
  bankName: string;
  label: string;
  currency: Currency;
  bookBalance: number;
  settledBalance: number;
  requiredBuffer: number;
};

export type CashFlow = {
  id: string;
  accountId: string;
  amount: number;
  currency: Currency;
  direction: FlowDirection;
  rail: BankRail;
  status: CashFlowStatus;
  expectedAt: string;
  counterparty: string;
  businessReason: string;
};

export type SettlementRule = {
  rail: BankRail;
  delayBusinessDays: number;
};

export type BankCalendar = {
  holidays: string[];
  cutoffHour: number;
};

export type RiskStatus = "Green" | "Yellow" | "Red";

export type ForecastPoint = {
  date: string;
  currency: Currency;
  accountId: string;
  usableLiquidity: number;
  requiredBuffer: number;
  riskStatus: RiskStatus;
};

export type CashGap = {
  date: string;
  currency: Currency;
  accountId: string;
  shortageAmount: number;
  riskStatus: Extract<RiskStatus, "Yellow" | "Red">;
  reason: string;
};

export type LiquidityRecommendation = {
  id: string;
  currency: Currency;
  amount: number;
  sourceAccountId: string;
  destinationAccountId: string;
  deadline: string;
  expectedImpact: string;
};

export type LiquiditySnapshot = {
  generatedAt: string;
  totalCash: MoneyAmount[];
  usableLiquidity: MoneyAmount[];
  atRiskAmount: MoneyAmount[];
  idleReserve: MoneyAmount[];
  forecast: ForecastPoint[];
  gaps: CashGap[];
  recommendation: LiquidityRecommendation | null;
};
