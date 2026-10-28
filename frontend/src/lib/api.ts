/**
 * Typed client for the TrueAvail backend (docs/SPEC.md, "Backend API").
 *
 * Mode is fixed at build time:
 * - live (default): every call goes to NEXT_PUBLIC_API_URL (default http://localhost:8000).
 *   Failures surface as ApiError; there is no fallback to bundled data.
 * - fixtures: NEXT_PUBLIC_USE_FIXTURES=1 serves typed sample responses from
 *   src/lib/fixtures without any network call. The UI shows a "Fixtures" badge.
 * - demo: NEXT_PUBLIC_DEMO=1 (static export for hosting without a backend) reads
 *   responses that the real backend precomputed into public/demo/*.json
 *   (backend/scripts/export_demo.py, `make demo-data`). Only the default requests exist
 *   there; generate/upload/custom what-if are not available and the UI hides them.
 */
import type {
  Account,
  AlertsResponse,
  BacktestRequest,
  BacktestResponse,
  DatasetSummary,
  DemoManifest,
  DemoScenario,
  DemoScenarioSummary,
  ExplainResponse,
  ForecastRequest,
  ForecastResponse,
  GenerateRequest,
  HealthResponse,
  HistoryRow,
  ScheduledFlow,
  UploadResponse,
  WhatIfRequest,
  WhatIfResponse,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
export const USE_FIXTURES = !DEMO && process.env.NEXT_PUBLIC_USE_FIXTURES === "1";
/** Where the static demo keeps its precomputed JSON and sample CSVs. */
export const DEMO_BASE = "/demo";

export type ApiErrorKind = "network" | "http" | "validation" | "parse";

/** Error raised by every API call. `url` is the exact URL that was tried. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly url: string;
  readonly method: string;
  /** Human-readable details, e.g. row-level CSV validation errors from a 422. */
  readonly details: string[];

  constructor(opts: {
    kind: ApiErrorKind;
    message: string;
    url: string;
    method: string;
    status?: number | null;
    details?: string[];
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.kind = opts.kind;
    this.status = opts.status ?? null;
    this.url = opts.url;
    this.method = opts.method;
    this.details = opts.details ?? [];
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Turns a FastAPI-style `detail` (string, list of strings, or list of objects) into lines. */
export function detailToLines(detail: unknown): string[] {
  if (detail == null) return [];
  if (typeof detail === "string") return [detail];
  if (Array.isArray(detail)) return detail.flatMap(detailToLines);
  if (typeof detail === "object") {
    const d = detail as Record<string, unknown>;
    // Backend shape: {message, errors:[{row, column, message}], total_errors?}
    if (Array.isArray(d.errors) && d.errors.length) {
      const lines = d.errors.flatMap(detailToLines);
      const head = d.message != null ? [String(d.message)] : [];
      const total = typeof d.total_errors === "number" ? d.total_errors : d.errors.length;
      const more = total > d.errors.length ? [`${total - d.errors.length} more error(s) not shown`] : [];
      return [...head, ...lines, ...more];
    }
    const msg = d.msg ?? d.message ?? d.error;
    const where: string[] = [];
    if (d.row != null) where.push(`row ${d.row}`);
    if (d.column != null) where.push(`column ${d.column}`);
    if (d.field != null) where.push(`field ${d.field}`);
    if (Array.isArray(d.loc)) where.push(d.loc.join("."));
    if (msg != null) return [where.length ? `${where.join(", ")}: ${String(msg)}` : String(msg)];
    return [JSON.stringify(detail)];
  }
  return [String(detail)];
}

type Query = Record<string, string | number | undefined | null>;

async function request<T>(
  method: "GET" | "POST",
  path: string,
  opts: { query?: Query; json?: unknown; form?: FormData; signal?: AbortSignal; base?: string } = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const url = `${opts.base ?? API_URL}${path}${qs.size ? `?${qs}` : ""}`;

  const init: RequestInit = { method, signal: opts.signal, headers: { Accept: "application/json" } };
  if (opts.json !== undefined) {
    init.body = JSON.stringify(opts.json);
    init.headers = { ...init.headers, "Content-Type": "application/json" };
  } else if (opts.form) {
    init.body = opts.form;
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError({
      kind: "network",
      message: "Backend unreachable",
      url,
      method,
      details: [e instanceof Error ? e.message : String(e)],
    });
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (res.ok) {
        throw new ApiError({ kind: "parse", message: "Response is not valid JSON", url, method, status: res.status });
      }
      body = text;
    }
  }

  if (!res.ok) {
    const detail = body && typeof body === "object" && "detail" in body ? (body as { detail: unknown }).detail : body;
    throw new ApiError({
      kind: res.status === 422 ? "validation" : "http",
      message: res.status === 422 ? "Request rejected by validation" : `HTTP ${res.status} ${res.statusText}`.trim(),
      url,
      method,
      status: res.status,
      details: detailToLines(detail),
    });
  }
  return body as T;
}

/** Lazily loads fixtures so they are dropped from the bundle in live mode. */
async function fx() {
  const mod = await import("./fixtures");
  await new Promise((r) => setTimeout(r, 250)); // make loading states visible
  return mod;
}

const demoCache = new Map<string, Promise<unknown>>();

/** Static demo: GET /demo/<file> once per page load (shared by every caller); failures are not cached. */
function demo<T>(file: string): Promise<T> {
  let p = demoCache.get(file) as Promise<T> | undefined;
  if (!p) {
    p = request<T>("GET", `${DEMO_BASE}/${file}`, { base: "" });
    p.catch(() => demoCache.delete(file));
    demoCache.set(file, p);
  }
  return p;
}

function notInDemo(what: string): Promise<never> {
  return Promise.reject(
    new ApiError({
      kind: "http",
      message: `${what} is not available in the static demo`,
      url: DEMO_BASE,
      method: "GET",
      details: ["Run the full pipeline locally with docker compose up."],
    }),
  );
}

export const api = {
  health: (signal?: AbortSignal) =>
    DEMO
      ? demo<HealthResponse>("health.json")
      : USE_FIXTURES
        ? fx().then((m) => m.health)
        : request<HealthResponse>("GET", "/health", { signal }),

  accounts: (signal?: AbortSignal) =>
    DEMO
      ? demo<Account[]>("accounts.json")
      : USE_FIXTURES
        ? fx().then((m) => m.accounts)
        : request<Account[]>("GET", "/api/accounts", { signal }),

  generateData: (body: GenerateRequest) =>
    DEMO
      ? notInDemo("Generating a dataset")
      : USE_FIXTURES
        ? fx().then((m) => m.generateDataset(body))
        : request<DatasetSummary>("POST", "/api/data/generate", { json: body }),

  uploadData: (history: File, scheduled?: File | null) => {
    if (DEMO) return notInDemo("CSV upload");
    if (USE_FIXTURES) return fx().then((m) => m.uploadDataset(history, scheduled ?? null));
    const form = new FormData();
    form.append("file", history);
    if (scheduled) form.append("scheduled", scheduled);
    return request<UploadResponse>("POST", "/api/data/upload", { form });
  },

  history: (accountId?: string, signal?: AbortSignal) =>
    DEMO
      ? demo<HistoryRow[]>("history.json").then((rows) =>
          accountId ? rows.filter((r) => r.account_id === accountId) : rows,
        )
      : USE_FIXTURES
        ? fx().then((m) => m.historyFor(accountId))
        : request<HistoryRow[]>("GET", "/api/data/history", { query: { account_id: accountId }, signal }),

  scheduled: (signal?: AbortSignal) =>
    DEMO
      ? demo<ScheduledFlow[]>("scheduled.json")
      : USE_FIXTURES
        ? fx().then((m) => m.scheduledFlows)
        : request<ScheduledFlow[]>("GET", "/api/data/scheduled", { signal }),

  /** Demo mode serves the precomputed default run (14-day horizon) whatever the request. */
  runForecast: (body: ForecastRequest = { horizon_days: 14 }, signal?: AbortSignal) =>
    DEMO
      ? demo<ForecastResponse>("forecast.json")
      : USE_FIXTURES
        ? fx().then((m) => m.forecast)
        : request<ForecastResponse>("POST", "/api/forecast/run", { json: body, signal }),

  /** Per-component corridors and LightGBM feature importances. */
  explain: (horizonDays = 14, signal?: AbortSignal) =>
    DEMO
      ? demo<ExplainResponse>("explain.json")
      : USE_FIXTURES
        ? fx().then((m) => m.explain())
        : request<ExplainResponse>("GET", "/api/forecast/explain", { query: { horizon_days: horizonDays }, signal }),

  alerts: (params: { quantile?: string; horizon_days?: number } = {}, signal?: AbortSignal) =>
    DEMO
      ? demo<AlertsResponse>("alerts.json")
      : USE_FIXTURES
        ? fx().then((m) => m.alerts)
        : request<AlertsResponse>("GET", "/api/alerts", {
            query: { quantile: params.quantile ?? "p05", horizon_days: params.horizon_days ?? 14 },
            signal,
          }),

  /** Demo mode serves the precomputed default backtest (14 d, 6 folds, 7-day step). */
  runBacktest: (body: BacktestRequest = {}, signal?: AbortSignal) =>
    DEMO
      ? demo<BacktestResponse>("backtest.json")
      : USE_FIXTURES
        ? fx().then((m) => m.backtestFor(body))
        : request<BacktestResponse>("POST", "/api/backtest/run", { json: body, signal }),

  runWhatIf: (body: WhatIfRequest) =>
    DEMO
      ? notInDemo("A custom what-if run")
      : USE_FIXTURES
        ? fx().then((m) => m.runWhatIf(body))
        : request<WhatIfResponse>("POST", "/api/whatif/run", { json: body }),

  /** Demo mode only: precomputed what-if scenarios and the export manifest. */
  demoScenarios: () => demo<DemoScenarioSummary[]>("scenarios/index.json"),
  demoScenario: (s: Pick<DemoScenarioSummary, "file">) => demo<DemoScenario>(s.file),
  demoManifest: () => demo<DemoManifest>("manifest.json"),
};
