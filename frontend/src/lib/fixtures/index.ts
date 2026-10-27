/**
 * Typed fixtures matching docs/SPEC.md response shapes. Served by src/lib/api.ts
 * only when NEXT_PUBLIC_USE_FIXTURES=1.
 */
import { ApiError } from "../api";
import type {
  Account,
  BacktestRequest,
  DatasetSummary,
  GenerateRequest,
  HealthResponse,
  ScheduledFlow,
  UploadResponse,
  WhatIfRequest,
} from "../types";
import { AS_OF, HISTORY_DAYS, HISTORY_START, SEED, accountProfiles, scheduledFlowsData } from "./data";
import { addDays } from "./rng";
import { buildAlertsResponse, buildBacktest, buildForecast, buildHistory, runWhatIfFixture } from "./sim";

export const accounts: Account[] = accountProfiles.map(
  ({ account_id, bank_name, label, currency, settled_balance, required_buffer }) => ({
    account_id,
    bank_name,
    label,
    currency,
    settled_balance,
    required_buffer,
  }),
);

export const scheduledFlows: ScheduledFlow[] = scheduledFlowsData;
export const forecast = buildForecast(scheduledFlowsData);
export const alerts = buildAlertsResponse(forecast, scheduledFlowsData);
export const history = buildHistory();

export const health: HealthResponse = {
  status: "ok",
  version: "fixtures",
  model_available: true,
  dataset: {
    source: "synthetic",
    seed: SEED,
    rows: history.length,
    accounts: accounts.length,
    start: HISTORY_START,
    end: AS_OF,
  },
  database: "fixtures",
};

export const historyFor = (accountId?: string) =>
  accountId ? history.filter((r) => r.account_id === accountId) : history;

export const backtestFor = (req: BacktestRequest) => buildBacktest(req);
export const runWhatIf = (req: WhatIfRequest) => runWhatIfFixture(req);

/** Fixture mode cannot regenerate the dataset; it echoes what the backend would report. */
export function generateDataset(req: GenerateRequest): DatasetSummary {
  const n = Math.min(req.accounts ?? 5, accountProfiles.length);
  const days = req.history_days ?? HISTORY_DAYS;
  return {
    source: "synthetic",
    rows: n * days,
    accounts: accountProfiles.slice(0, n).map((a) => a.account_id),
    start: addDays(AS_OF, -(days - 1)),
    end: AS_OF,
    seed: req.seed ?? SEED,
    scheduled_flows: scheduledFlowsData.length,
    warnings: [],
  };
}

const HISTORY_COLUMNS = [
  "date",
  "account_id",
  "bank_name",
  "currency",
  "net_flow",
  "ending_balance",
  "required_buffer",
];

/** Minimal client-side validation that mimics the backend's 422 / warnings contract. */
export async function uploadDataset(file: File, scheduled: File | null): Promise<UploadResponse> {
  const url = "fixture://api/data/upload";
  const lines = (await file.text()).split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = (lines[0] ?? "").split(",").map((s) => s.trim());
  const missing = HISTORY_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    throw new ApiError({
      kind: "validation",
      message: "Request rejected by validation",
      url,
      method: "POST",
      status: 422,
      details: [`header: missing required column(s): ${missing.join(", ")}`],
    });
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const errors: string[] = [];
  const byAccount = new Map<string, string[]>();
  lines.slice(1).forEach((line, i) => {
    const cells = line.split(",");
    const row = i + 2;
    const date = cells[idx.date];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) errors.push(`row ${row}, column date: invalid date "${date}"`);
    for (const col of ["net_flow", "ending_balance", "required_buffer"]) {
      if (Number.isNaN(Number(cells[idx[col]]))) errors.push(`row ${row}, column ${col}: not a number`);
    }
    const acc = cells[idx.account_id];
    byAccount.set(acc, [...(byAccount.get(acc) ?? []), date]);
  });
  if (errors.length) {
    throw new ApiError({
      kind: "validation",
      message: "Request rejected by validation",
      url,
      method: "POST",
      status: 422,
      details: errors.slice(0, 50),
    });
  }
  const warnings: string[] = [];
  const allDates: string[] = [];
  for (const [acc, dates] of byAccount) {
    const sorted = [...dates].sort();
    allDates.push(...sorted);
    if (sorted.length < 60)
      warnings.push(`${acc}: only ${sorted.length} days of history; the model may fall back to EWMA.`);
    const unique = new Set(sorted);
    if (unique.size !== sorted.length) warnings.push(`${acc}: ${sorted.length - unique.size} duplicate date(s).`);
  }
  if (!scheduled) warnings.push("No scheduled flows file: forecasts will not include known future payments.");
  allDates.sort();
  return {
    source: "upload",
    rows: lines.length - 1,
    accounts: [...byAccount.keys()],
    start: allDates[0] ?? "",
    end: allDates[allDates.length - 1] ?? "",
    seed: null,
    scheduled_flows: scheduled
      ? Math.max(0, (await scheduled.text()).split(/\r?\n/).filter((l) => l.trim()).length - 1)
      : 0,
    warnings,
  };
}
