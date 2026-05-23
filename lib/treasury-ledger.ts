import type { LocalizedMessage } from "@/lib/i18n";

export type TreasuryCurrency = "USD" | "EUR" | "KZT" | "AED";
export type TreasuryKybStatus = "approved" | "pending" | "blocked";
export type TreasuryRail = "SWIFT" | "Fedwire" | "TARGET2" | "SEPA" | "MEPS+" | "SARIE" | "KISC" | "Internal ledger";
export type TreasuryCountry =
  | "Germany"
  | "Japan"
  | "Kazakhstan"
  | "Saudi Arabia"
  | "Singapore"
  | "UAE"
  | "United Kingdom"
  | "United States";

export type LabelSide = "left" | "right" | "above" | "below";
export type TreasuryConditionStatus = "blocked" | "due" | "ready" | "watch";

export type TreasuryAccount = {
  id: string;
  label: string;
  legalEntity: string;
  companyId: string;
  taxId: string;
  jurisdiction: string;
  country: TreasuryCountry;
  city: string;
  bank: string;
  accountCode: string;
  bankIban: string;
  walletAddress: `0x${string}`;
  kybStatus: TreasuryKybStatus;
  currency: TreasuryCurrency;
  balance: number;
  usableBalance: number;
  survivalFloor: number;
  primaryRail: TreasuryRail;
  cutOff: LocalizedMessage;
  condition: LocalizedMessage;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  labelSide: LabelSide;
  stabilityScore: number;
  updatedAt: string;
};

export type TreasuryConditionEvent = {
  id: string;
  label: LocalizedMessage;
  due: LocalizedMessage;
  amount: number;
  currency: TreasuryCurrency;
  rail: TreasuryRail | "Tax portal";
  status: TreasuryConditionStatus;
  impact: LocalizedMessage;
  proof: LocalizedMessage;
};

export type TreasuryLedgerMovement = {
  id: string;
  rail: "blockchain" | "swift";
  status: "settled" | "pending";
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TreasuryCurrency;
  reference: string;
  fromBalanceAfter: number;
  toBalanceAfter: number;
  createdAt: string;
};

export const TREASURY_LEDGER_UPDATED_AT = "2026-05-23T12:00:00.000Z";

export const TREASURY_ACCOUNT_SEED: TreasuryAccount[] = [
  {
    id: "new-york",
    label: "New York Operating",
    legalEntity: "TrueAvail US Operating LLC",
    companyId: "trueavail-group",
    taxId: "US-EIN-88-1042001",
    jurisdiction: "United States",
    country: "United States",
    city: "New York",
    bank: "JPMorgan Chase",
    accountCode: "US-USD-1042",
    bankIban: "US0210000211042001",
    walletAddress: "0x1000000000000000000000000000000000001042",
    kybStatus: "approved",
    currency: "USD",
    balance: 4_800_000,
    usableBalance: 1_900_000,
    survivalFloor: 3_000_000,
    primaryRail: "Fedwire",
    cutOff: { en: "16:00 ET same-day cut-off", ru: "16:00 ET same-day cut-off" },
    condition: {
      en: "Credit repayment due from the New York account before 16:00 ET.",
      ru: "Погашение кредита со счета New York до 16:00 ET.",
    },
    latitude: 40.7128,
    longitude: -74.006,
    x: 28.6,
    y: 39.8,
    labelSide: "right",
    stabilityScore: 62,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "singapore",
    label: "Singapore APAC Pool",
    legalEntity: "TrueAvail Singapore Pte. Ltd.",
    companyId: "trueavail-group",
    taxId: "SG-UEN-202410778R",
    jurisdiction: "Singapore",
    country: "Singapore",
    city: "Singapore",
    bank: "DBS Bank",
    accountCode: "SG-USD-7781",
    bankIban: "SG1207177781001",
    walletAddress: "0x2000000000000000000000000000000000007781",
    kybStatus: "approved",
    currency: "USD",
    balance: 3_150_000,
    usableBalance: 1_780_000,
    survivalFloor: 1_500_000,
    primaryRail: "MEPS+",
    cutOff: { en: "17:30 SGT payout cut-off", ru: "17:30 SGT payout cut-off" },
    condition: {
      en: "Merchant settlement batch requires prefunding before APAC cut-off.",
      ru: "Merchant settlement batch требует prefunding до APAC cut-off.",
    },
    latitude: 1.3521,
    longitude: 103.8198,
    x: 75.4,
    y: 63.5,
    labelSide: "right",
    stabilityScore: 74,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "riyadh",
    label: "Riyadh USD Reserve",
    legalEntity: "TrueAvail Arabia Treasury LLC",
    companyId: "trueavail-group",
    taxId: "SA-CR-1010884408",
    jurisdiction: "Saudi Arabia",
    country: "Saudi Arabia",
    city: "Riyadh",
    bank: "Saudi National Bank",
    accountCode: "SA-USD-4408",
    bankIban: "SA0380000000608010167519",
    walletAddress: "0x3000000000000000000000000000000000004408",
    kybStatus: "approved",
    currency: "USD",
    balance: 2_400_000,
    usableBalance: 1_520_000,
    survivalFloor: 1_350_000,
    primaryRail: "SARIE",
    cutOff: { en: "18:00 AST liquidity window", ru: "18:00 AST liquidity window" },
    condition: {
      en: "Oil revenue sweep is delayed; keep reserve for dollar liquidity.",
      ru: "Oil revenue sweep задержан; сохранить резерв для долларовой ликвидности.",
    },
    latitude: 24.7136,
    longitude: 46.6753,
    x: 57.9,
    y: 53.8,
    labelSide: "left",
    stabilityScore: 71,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "frankfurt",
    label: "Frankfurt EUR Reserve",
    legalEntity: "TrueAvail EU Treasury GmbH",
    companyId: "trueavail-group",
    taxId: "DE-VAT-812345901",
    jurisdiction: "Germany",
    country: "Germany",
    city: "Frankfurt",
    bank: "Deutsche Bank",
    accountCode: "DE-EUR-2217",
    bankIban: "DE44500105175407324931",
    walletAddress: "0x4000000000000000000000000000000000002217",
    kybStatus: "approved",
    currency: "EUR",
    balance: 5_200_000,
    usableBalance: 3_060_000,
    survivalFloor: 2_200_000,
    primaryRail: "TARGET2",
    cutOff: { en: "17:00 CET TARGET2 close", ru: "17:00 CET TARGET2 close" },
    condition: {
      en: "TARGET2 clearing pressure: preserve EUR buffer through market close.",
      ru: "TARGET2 clearing pressure: сохранить EUR-buffer до закрытия рынка.",
    },
    latitude: 50.1109,
    longitude: 8.6821,
    x: 50.5,
    y: 39.2,
    labelSide: "right",
    stabilityScore: 69,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "london",
    label: "London FX Desk",
    legalEntity: "TrueAvail Markets UK Ltd.",
    companyId: "trueavail-group",
    taxId: "GB-VAT-930245901",
    jurisdiction: "United Kingdom",
    country: "United Kingdom",
    city: "London",
    bank: "HSBC UK",
    accountCode: "GB-USD-9302",
    bankIban: "GB29NWBK60161331926819",
    walletAddress: "0x5000000000000000000000000000000000009302",
    kybStatus: "approved",
    currency: "USD",
    balance: 2_850_000,
    usableBalance: 1_820_000,
    survivalFloor: 1_100_000,
    primaryRail: "SWIFT",
    cutOff: { en: "14:30 GMT FX margin window", ru: "14:30 GMT FX margin window" },
    condition: {
      en: "Sterling desk requests USD fallback rail while FX window is open.",
      ru: "Sterling desk запрашивает USD fallback rail, пока FX-window открыт.",
    },
    latitude: 51.5072,
    longitude: -0.1276,
    x: 47.8,
    y: 38.1,
    labelSide: "left",
    stabilityScore: 73,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "tokyo",
    label: "Tokyo Custody",
    legalEntity: "TrueAvail Japan GK",
    companyId: "trueavail-group",
    taxId: "JP-CN-55160001",
    jurisdiction: "Japan",
    country: "Japan",
    city: "Tokyo",
    bank: "MUFG Bank",
    accountCode: "JP-USD-5516",
    bankIban: "JP000005516001",
    walletAddress: "0x6000000000000000000000000000000000005516",
    kybStatus: "approved",
    currency: "USD",
    balance: 3_700_000,
    usableBalance: 2_260_000,
    survivalFloor: 1_700_000,
    primaryRail: "SWIFT",
    cutOff: { en: "18:00 JST custody settlement", ru: "18:00 JST custody settlement" },
    condition: {
      en: "Custody fee settlement collides with overnight liquidity hold.",
      ru: "Custody fee settlement конфликтует с overnight liquidity hold.",
    },
    latitude: 35.6895,
    longitude: 139.6917,
    x: 82.9,
    y: 43.7,
    labelSide: "left",
    stabilityScore: 76,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "dubai",
    label: "UAE Holding",
    legalEntity: "TrueAvail Holding FZ-LLC",
    companyId: "trueavail-group",
    taxId: "AE-TRN-100392845700003",
    jurisdiction: "UAE",
    country: "UAE",
    city: "Dubai",
    bank: "Emirates NBD",
    accountCode: "AE-USD-6209",
    bankIban: "AE070331234567890123456",
    walletAddress: "0x1111111111111111111111111111111111111111",
    kybStatus: "approved",
    currency: "USD",
    balance: 8_900_000,
    usableBalance: 7_240_000,
    survivalFloor: 1_250_000,
    primaryRail: "SWIFT",
    cutOff: { en: "15:00 GST correspondent window", ru: "15:00 GST correspondent window" },
    condition: {
      en: "Regional payout rail needs reserve after correspondent bank delay.",
      ru: "Regional payout rail требует резерв после задержки correspondent bank.",
    },
    latitude: 25.2048,
    longitude: 55.2708,
    x: 59.6,
    y: 52.4,
    labelSide: "right",
    stabilityScore: 83,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
  {
    id: "almaty",
    label: "Kazakhstan OpCo",
    legalEntity: "TOO TrueAvail Operations Kazakhstan",
    companyId: "trueavail-group",
    taxId: "KZ-BIN-240540019875",
    jurisdiction: "Kazakhstan",
    country: "Kazakhstan",
    city: "Almaty",
    bank: "Halyk Bank",
    accountCode: "KZ-USD-0198",
    bankIban: "KZ86125KZT5004100100",
    walletAddress: "0x2222222222222222222222222222222222222222",
    kybStatus: "approved",
    currency: "USD",
    balance: 1_200_000,
    usableBalance: 740_000,
    survivalFloor: 800_000,
    primaryRail: "KISC",
    cutOff: { en: "17:00 ALMT local clearing", ru: "17:00 ALMT local clearing" },
    condition: {
      en: "Payroll reserve must be funded before Kazakhstan local clearing cut-off.",
      ru: "Payroll reserve нужно пополнить до локального clearing cut-off в Казахстане.",
    },
    latitude: 43.222,
    longitude: 76.8512,
    x: 65.9,
    y: 45.8,
    labelSide: "right",
    stabilityScore: 58,
    updatedAt: TREASURY_LEDGER_UPDATED_AT,
  },
];

type LedgerGlobal = typeof globalThis & {
  __trueAvailTreasuryAccounts?: Map<string, TreasuryAccount>;
  __trueAvailTreasuryMovements?: TreasuryLedgerMovement[];
};

function cloneAccount(account: TreasuryAccount): TreasuryAccount {
  return {
    ...account,
    condition: { ...account.condition },
    cutOff: { ...account.cutOff },
  };
}

function stableId(input: string, length = 10) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex.repeat(Math.ceil(length / hex.length)).slice(0, length);
}

function ledgerMap() {
  const scope = globalThis as LedgerGlobal;
  if (!scope.__trueAvailTreasuryAccounts) {
    scope.__trueAvailTreasuryAccounts = new Map(TREASURY_ACCOUNT_SEED.map((account) => [account.id, cloneAccount(account)]));
  }
  return scope.__trueAvailTreasuryAccounts;
}

function movementLog() {
  const scope = globalThis as LedgerGlobal;
  scope.__trueAvailTreasuryMovements ??= [];
  return scope.__trueAvailTreasuryMovements;
}

export function listTreasuryAccounts() {
  return Array.from(ledgerMap().values()).map(cloneAccount);
}

export function findTreasuryAccount(accountId: string | undefined) {
  if (!accountId) return undefined;
  const account = ledgerMap().get(accountId);
  return account ? cloneAccount(account) : undefined;
}

export function listTreasuryMovements() {
  return movementLog().map((movement) => ({ ...movement }));
}

export function updateTreasuryAccount(accountId: string, patch: Partial<Pick<TreasuryAccount, "balance" | "condition" | "usableBalance">> & { conditionText?: string }) {
  const map = ledgerMap();
  const current = map.get(accountId);
  if (!current) {
    throw new Error(`Unknown treasury account: ${accountId}`);
  }

  const next: TreasuryAccount = {
    ...current,
    balance: Number.isFinite(Number(patch.balance)) ? Number(patch.balance) : current.balance,
    usableBalance: Number.isFinite(Number(patch.usableBalance)) ? Number(patch.usableBalance) : current.usableBalance,
    condition:
      patch.condition ??
      (patch.conditionText
        ? { en: patch.conditionText, ru: patch.conditionText }
        : current.condition),
    updatedAt: new Date().toISOString(),
  };
  map.set(accountId, next);
  return cloneAccount(next);
}

export function addTreasuryAccount(input: {
  country: TreasuryCountry;
  city?: string;
  bank: string;
  accountCode: string;
  balance: number;
  conditionText?: string;
}) {
  const template = TREASURY_ACCOUNT_SEED.find((account) => account.country === input.country) ?? TREASURY_ACCOUNT_SEED[0];
  const idSeed = `${input.country}:${input.bank}:${input.accountCode}:${input.balance}`;
  const account: TreasuryAccount = {
    ...cloneAccount(template),
    id: `${template.city.toLowerCase().replaceAll(" ", "-")}-${stableId(idSeed, 6)}`,
    label: `${input.city ?? template.city} Treasury Node`,
    legalEntity: `${input.city ?? template.city} Treasury Entity`,
    bank: input.bank.trim() || template.bank,
    accountCode: input.accountCode.trim() || `${template.country.slice(0, 2).toUpperCase()}-${template.currency}-${stableId(idSeed, 4)}`,
    balance: input.balance,
    usableBalance: Math.max(input.balance - template.survivalFloor * 0.22, 0),
    survivalFloor: Math.max(Math.round(input.balance * 0.32), 250_000),
    condition: {
      en: input.conditionText?.trim() || template.condition.en,
      ru: input.conditionText?.trim() || template.condition.ru,
    },
    walletAddress: `0x${stableId(idSeed, 40)}` as `0x${string}`,
    bankIban: `${template.country.slice(0, 2).toUpperCase()}${stableId(idSeed, 18).toUpperCase()}`,
    taxId: `${template.country.slice(0, 2).toUpperCase()}-AUTO-${stableId(idSeed, 8).toUpperCase()}`,
    updatedAt: new Date().toISOString(),
  };

  ledgerMap().set(account.id, account);
  return cloneAccount(account);
}

export function applyLedgerTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TreasuryCurrency;
  rail: "blockchain" | "swift";
  reference: string;
}) {
  const map = ledgerMap();
  const from = map.get(input.fromAccountId);
  const to = map.get(input.toAccountId);
  if (!from || !to) throw new Error("Unknown transfer account");
  if (from.currency !== input.currency || to.currency !== input.currency) throw new Error("Transfer currency must match both accounts");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Transfer amount must be positive");
  if (from.balance < input.amount) throw new Error("Insufficient source balance");

  const createdAt = new Date().toISOString();
  const fromNext = {
    ...from,
    balance: from.balance - input.amount,
    usableBalance: Math.max(from.usableBalance - input.amount, 0),
    condition: {
      en: `Settled ${input.rail} transfer ${input.reference}; balance updated in unified treasury ledger.`,
      ru: `Settled ${input.rail} transfer ${input.reference}; баланс обновлен в едином treasury ledger.`,
    },
    updatedAt: createdAt,
  };
  const toNext = {
    ...to,
    balance: to.balance + input.amount,
    usableBalance: to.usableBalance + input.amount,
    condition: {
      en: `Received ${input.rail} transfer ${input.reference}; balance updated in unified treasury ledger.`,
      ru: `Получен ${input.rail} transfer ${input.reference}; баланс обновлен в едином treasury ledger.`,
    },
    updatedAt: createdAt,
  };

  map.set(from.id, fromNext);
  map.set(to.id, toNext);

  const movement: TreasuryLedgerMovement = {
    id: `LEDGER-${stableId(`${input.reference}:${createdAt}`, 10).toUpperCase()}`,
    rail: input.rail,
    status: "settled",
    fromAccountId: from.id,
    toAccountId: to.id,
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    fromBalanceAfter: fromNext.balance,
    toBalanceAfter: toNext.balance,
    createdAt,
  };
  movementLog().unshift(movement);
  return movement;
}

export function queueSwiftTreasuryCommand(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TreasuryCurrency;
  reference: string;
}) {
  const from = findTreasuryAccount(input.fromAccountId);
  const to = findTreasuryAccount(input.toAccountId);
  if (!from || !to) throw new Error("Unknown SWIFT account");

  const movement: TreasuryLedgerMovement = {
    id: `PENDING-${stableId(`${input.reference}:${input.fromAccountId}:${input.toAccountId}`, 10).toUpperCase()}`,
    rail: "swift",
    status: "pending",
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    fromBalanceAfter: from.balance,
    toBalanceAfter: to.balance,
    createdAt: new Date().toISOString(),
  };
  movementLog().unshift(movement);
  updateTreasuryAccount(input.fromAccountId, {
    conditionText: `Pending SWIFT command ${input.reference}; balance unchanged until treasury confirms bank settlement.`,
  });
  return movement;
}

export function buildTreasuryConditionEvents(account: TreasuryAccount): TreasuryConditionEvent[] {
  const movements = listTreasuryMovements().filter(
    (movement) => movement.fromAccountId === account.id || movement.toAccountId === account.id,
  );
  const reserveAmount = Math.max(Math.round(account.survivalFloor * 0.18), 120_000);
  const operatingAmount = Math.max(Math.round(account.balance * 0.12), 180_000);
  const statutoryAmount = Math.max(Math.round(account.survivalFloor * 0.11), 90_000);
  const movementEvents: TreasuryConditionEvent[] = movements.slice(0, 2).map((movement) => ({
    id: `${account.id}-${movement.id.toLowerCase()}`,
    label: {
      en: movement.status === "settled" ? "Unified ledger movement" : "Pending treasury command",
      ru: movement.status === "settled" ? "Движение в едином ledger" : "Ожидающая treasury-команда",
    },
    due: {
      en: movement.status === "settled" ? "Settled in ledger" : "Waiting for treasury settlement",
      ru: movement.status === "settled" ? "Settled in ledger" : "Ожидает treasury settlement",
    },
    amount: movement.amount,
    currency: movement.currency,
    rail: movement.rail === "blockchain" ? "Internal ledger" : "SWIFT",
    status: movement.status === "settled" ? "ready" : "watch",
    impact: {
      en: `Reference ${movement.reference}; balance after movement is stored centrally.`,
      ru: `Reference ${movement.reference}; баланс после движения хранится централизованно.`,
    },
    proof: {
      en: "Generated from the shared treasury ledger movement log.",
      ru: "Сгенерировано из общего журнала treasury ledger.",
    },
  }));

  return [
    ...movementEvents,
    {
      id: `${account.id}-rail-cutoff`,
      label: { en: "Rail cut-off reserve", ru: "Резерв под rail cut-off" },
      due: { en: `Today via ${account.primaryRail}`, ru: `Сегодня через ${account.primaryRail}` },
      amount: reserveAmount,
      currency: account.currency,
      rail: account.primaryRail,
      status: account.usableBalance < account.survivalFloor ? "blocked" : "watch",
      impact: {
        en: "Keep this amount out of optimizer moves until local cut-off clears.",
        ru: "Не отдавать эту сумму в optimizer moves до прохождения локального cut-off.",
      },
      proof: {
        en: "Generated from account rail, survival floor, and current usable balance.",
        ru: "Сгенерировано из rail, survival floor и текущего usable balance счёта.",
      },
    },
    {
      id: `${account.id}-tax-hold`,
      label: { en: "Tax and statutory hold", ru: "Налоговый и statutory hold" },
      due: { en: "Next banking day 10:00", ru: "Следующий банковский день 10:00" },
      amount: statutoryAmount,
      currency: account.currency,
      rail: "Tax portal",
      status: "due",
      impact: {
        en: "Treat as restricted cash; it cannot be used as rescue liquidity.",
        ru: "Считать restricted cash; нельзя использовать как rescue liquidity.",
      },
      proof: { en: "Default statutory reserve policy.", ru: "Default statutory reserve policy." },
    },
    {
      id: `${account.id}-operating-payment`,
      label: { en: "Operating payment queue", ru: "Очередь операционных платежей" },
      due: { en: "T+1 before market close", ru: "T+1 до закрытия рынка" },
      amount: operatingAmount,
      currency: account.currency,
      rail: "Internal ledger",
      status: "ready",
      impact: {
        en: "Can be throttled if governance rejects the higher-risk route.",
        ru: "Можно throttling, если governance отклонит более рискованный route.",
      },
      proof: { en: "Generated from the shared account balance.", ru: "Сгенерировано из общего баланса счёта." },
    },
  ];
}
