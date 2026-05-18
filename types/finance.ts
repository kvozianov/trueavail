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

export type ObservedCashMovement = {
  id: string;
  cashFlowId: string;
  accountId: string;
  currency: Currency;
  observedAt: string;
  expectedAmount: number;
  actualAmount: number;
  source: string;
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

export type PortfolioForecastPoint = {
  date: string;
  currency: Currency;
  usableLiquidity: number;
  requiredBuffer: number;
  riskStatus: RiskStatus;
  accountCount: number;
};

export type ForecastReconciliationPoint = {
  date: string;
  currency: Currency;
  accountLevelUsableLiquidity: number;
  portfolioLevelUsableLiquidity: number;
  difference: number;
  matched: boolean;
};

export type OnlineCorrectionAlert = {
  id: string;
  cashFlowId: string;
  accountId: string;
  currency: Currency;
  observedAt: string;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  differencePercent: number;
  severity: "watch" | "alert";
  message: string;
};

export type CashGap = {
  date: string;
  currency: Currency;
  accountId: string;
  shortageAmount: number;
  riskStatus: Extract<RiskStatus, "Yellow" | "Red">;
  reason: string;
};

export type GapRootCause = {
  type: "large_outflow" | "delayed_inflow" | "required_buffer";
  title: string;
  detail: string;
  amount?: number;
  cashFlowId?: string;
};

export type GapTimelineEvent = {
  date: string;
  label: string;
  detail: string;
};

export type GapExplanation = {
  gap: CashGap;
  accountLabel: string;
  summary: string;
  rootCauses: GapRootCause[];
  timeline: GapTimelineEvent[];
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
  portfolioForecast: PortfolioForecastPoint[];
  reconciliation: ForecastReconciliationPoint[];
  onlineCorrections: OnlineCorrectionAlert[];
  gaps: CashGap[];
  explanations: GapExplanation[];
  recommendation: LiquidityRecommendation | null;
};
