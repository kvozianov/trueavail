import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  TREASURY_ACCOUNT_SEED,
  type TreasuryAccount,
  type TreasuryCountry,
  type TreasuryCurrency,
  type TreasuryLedgerMovement,
} from "@/lib/treasury-ledger";

type TreasuryLedgerDatabase = {
  accounts: TreasuryAccount[];
  movements: TreasuryLedgerMovement[];
  updatedAt: string;
};

const configuredDataDir = process.env.TREASURY_LEDGER_DATA_DIR?.trim();
const DB_DIR = configuredDataDir || (process.env.VERCEL ? path.join(tmpdir(), "trueavail") : path.join(process.cwd(), ".data"));
const DB_PATH = path.join(DB_DIR, "treasury-ledger.json");

function stableId(input: string, length = 10) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return hex.repeat(Math.ceil(length / hex.length)).slice(0, length);
}

function cloneAccount(account: TreasuryAccount): TreasuryAccount {
  return {
    ...account,
    condition: { ...account.condition },
    cutOff: { ...account.cutOff },
  };
}

function initialDb(): TreasuryLedgerDatabase {
  return {
    accounts: TREASURY_ACCOUNT_SEED.map(cloneAccount),
    movements: [],
    updatedAt: new Date().toISOString(),
  };
}

function ensureDb() {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  if (!existsSync(DB_PATH)) {
    writeDb(initialDb());
  }
}

function readDb(): TreasuryLedgerDatabase {
  ensureDb();
  try {
    const parsed = JSON.parse(readFileSync(DB_PATH, "utf8")) as TreasuryLedgerDatabase;
    if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.movements)) {
      throw new Error("Invalid treasury ledger db");
    }
    return parsed;
  } catch {
    const fallback = initialDb();
    writeDb(fallback);
    return fallback;
  }
}

function writeDb(db: TreasuryLedgerDatabase) {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  writeFileSync(DB_PATH, JSON.stringify({ ...db, updatedAt: new Date().toISOString() }, null, 2));
}

export function listTreasuryAccountsFromStore() {
  return readDb().accounts.map(cloneAccount);
}

export function findTreasuryAccountFromStore(accountId: string | undefined) {
  if (!accountId) return undefined;
  const account = readDb().accounts.find((item) => item.id === accountId);
  return account ? cloneAccount(account) : undefined;
}

export function listTreasuryMovementsFromStore() {
  return readDb().movements.map((movement) => ({ ...movement }));
}

export function updateTreasuryAccountInStore(
  accountId: string,
  patch: Partial<Pick<TreasuryAccount, "balance" | "condition" | "usableBalance">> & { conditionText?: string },
) {
  const db = readDb();
  const index = db.accounts.findIndex((account) => account.id === accountId);
  if (index < 0) {
    throw new Error(`Unknown treasury account: ${accountId}`);
  }

  const current = db.accounts[index];
  const next: TreasuryAccount = {
    ...current,
    balance: Number.isFinite(Number(patch.balance)) ? Number(patch.balance) : current.balance,
    condition:
      patch.condition ??
      (patch.conditionText
        ? { en: patch.conditionText, ru: patch.conditionText }
        : current.condition),
    usableBalance: Number.isFinite(Number(patch.usableBalance)) ? Number(patch.usableBalance) : current.usableBalance,
    updatedAt: new Date().toISOString(),
  };

  db.accounts[index] = next;
  writeDb(db);
  return cloneAccount(next);
}

export function addTreasuryAccountToStore(input: {
  country: TreasuryCountry;
  city?: string;
  bank: string;
  accountCode: string;
  balance: number;
  conditionText?: string;
}) {
  const db = readDb();
  const template = TREASURY_ACCOUNT_SEED.find((account) => account.country === input.country) ?? TREASURY_ACCOUNT_SEED[0];
  const idSeed = `${input.country}:${input.bank}:${input.accountCode}:${input.balance}`;
  const account: TreasuryAccount = {
    ...cloneAccount(template),
    id: `${template.city.toLowerCase().replaceAll(" ", "-")}-${stableId(idSeed, 6)}`,
    accountCode: input.accountCode.trim() || `${template.country.slice(0, 2).toUpperCase()}-${template.currency}-${stableId(idSeed, 4)}`,
    balance: input.balance,
    bank: input.bank.trim() || template.bank,
    bankIban: `${template.country.slice(0, 2).toUpperCase()}${stableId(idSeed, 18).toUpperCase()}`,
    condition: {
      en: input.conditionText?.trim() || template.condition.en,
      ru: input.conditionText?.trim() || template.condition.ru,
    },
    label: `${input.city ?? template.city} Treasury Node`,
    legalEntity: `${input.city ?? template.city} Treasury Entity`,
    survivalFloor: Math.max(Math.round(input.balance * 0.32), 250_000),
    taxId: `${template.country.slice(0, 2).toUpperCase()}-AUTO-${stableId(idSeed, 8).toUpperCase()}`,
    updatedAt: new Date().toISOString(),
    usableBalance: Math.max(input.balance - template.survivalFloor * 0.22, 0),
    walletAddress: `0x${stableId(idSeed, 40)}` as `0x${string}`,
  };

  db.accounts.push(account);
  writeDb(db);
  return cloneAccount(account);
}

export function applyLedgerTransferInStore(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TreasuryCurrency;
  rail: "blockchain" | "swift";
  reference: string;
}) {
  const db = readDb();
  const fromIndex = db.accounts.findIndex((account) => account.id === input.fromAccountId);
  const toIndex = db.accounts.findIndex((account) => account.id === input.toAccountId);
  const from = db.accounts[fromIndex];
  const to = db.accounts[toIndex];
  if (!from || !to) throw new Error("Unknown transfer account");
  if (from.currency !== input.currency || to.currency !== input.currency) throw new Error("Transfer currency must match both accounts");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Transfer amount must be positive");
  if (from.balance < input.amount) throw new Error("Insufficient source balance");

  const createdAt = new Date().toISOString();
  const fromNext: TreasuryAccount = {
    ...from,
    balance: from.balance - input.amount,
    condition: {
      en: `Settled ${input.rail} transfer ${input.reference}; balance updated in unified treasury ledger.`,
      ru: `Settled ${input.rail} transfer ${input.reference}; баланс обновлен в едином treasury ledger.`,
    },
    updatedAt: createdAt,
    usableBalance: Math.max(from.usableBalance - input.amount, 0),
  };
  const toNext: TreasuryAccount = {
    ...to,
    balance: to.balance + input.amount,
    condition: {
      en: `Received ${input.rail} transfer ${input.reference}; balance updated in unified treasury ledger.`,
      ru: `Получен ${input.rail} transfer ${input.reference}; баланс обновлен в едином treasury ledger.`,
    },
    updatedAt: createdAt,
    usableBalance: to.usableBalance + input.amount,
  };

  db.accounts[fromIndex] = fromNext;
  db.accounts[toIndex] = toNext;

  const movement: TreasuryLedgerMovement = {
    id: `LEDGER-${stableId(`${input.reference}:${createdAt}`, 10).toUpperCase()}`,
    amount: input.amount,
    createdAt,
    currency: input.currency,
    fromAccountId: input.fromAccountId,
    fromBalanceAfter: fromNext.balance,
    rail: input.rail,
    reference: input.reference,
    status: "settled",
    toAccountId: input.toAccountId,
    toBalanceAfter: toNext.balance,
  };

  db.movements.unshift(movement);
  writeDb(db);
  return movement;
}

export function queueSwiftTreasuryCommandInStore(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: TreasuryCurrency;
  reference: string;
}) {
  const db = readDb();
  const from = db.accounts.find((account) => account.id === input.fromAccountId);
  const to = db.accounts.find((account) => account.id === input.toAccountId);
  if (!from || !to) throw new Error("Unknown SWIFT account");

  const movement: TreasuryLedgerMovement = {
    id: `PENDING-${stableId(`${input.reference}:${input.fromAccountId}:${input.toAccountId}`, 10).toUpperCase()}`,
    amount: input.amount,
    createdAt: new Date().toISOString(),
    currency: input.currency,
    fromAccountId: input.fromAccountId,
    fromBalanceAfter: from.balance,
    rail: "swift",
    reference: input.reference,
    status: "pending",
    toAccountId: input.toAccountId,
    toBalanceAfter: to.balance,
  };

  db.movements.unshift(movement);
  writeDb(db);
  updateTreasuryAccountInStore(input.fromAccountId, {
    conditionText: `Pending SWIFT command ${input.reference}; balance unchanged until treasury confirms bank settlement.`,
  });
  return movement;
}
