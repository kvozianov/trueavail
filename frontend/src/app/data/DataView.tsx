"use client";

import { useState } from "react";
import { DatasetStrip } from "@/components/DatasetStrip";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button, Card, Field, Loading, PageHeader, inputClass } from "@/components/ui";
import { API_URL, DEMO, DEMO_BASE, USE_FIXTURES, api } from "@/lib/api";
import { money, num, shortDate } from "@/lib/format";
import { REPO_URL } from "@/lib/links";
import type { DatasetSummary, GenerateRequest, UploadResponse } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const HISTORY_COLS = "date, account_id, bank_name, currency, net_flow, ending_balance, required_buffer";
const SCHEDULED_COLS = "flow_id, account_id, currency, amount, direction, expected_date, rail, description";
const SAMPLES = [
  { name: "history_5accounts_120d.csv", label: "history" },
  { name: "scheduled_flows.csv", label: "scheduled flows" },
] as const;
/** Default sample CSVs are served by the backend (`GET /api/data/samples/{name}`); the static demo ships copies. */
const sampleUrl = (name: string) => (DEMO ? `${DEMO_BASE}/samples/${name}` : `${API_URL}/api/data/samples/${name}`);

function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return <p className="mt-2 text-xs text-ink-muted">No validation warnings.</p>;
  return (
    <div className="mt-3 rounded-md border border-[var(--warning)] bg-[var(--warning-bg)] p-3 text-sm">
      <p className="font-medium text-warn">
        ▲ {warnings.length} validation warning{warnings.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-ink-2">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

function SummaryBox({ summary, title }: { summary: DatasetSummary; title: string }) {
  return (
    <div className="mt-4 rounded-md border border-[var(--good)] bg-[var(--good-bg)] p-3 text-sm">
      <p className="font-medium text-good">✓ {title}</p>
      <dl className="tabular mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-2 sm:grid-cols-5">
        <div>
          <dt className="text-ink-muted">Source</dt>
          <dd>
            {summary.source}
            {summary.seed != null ? ` · seed ${summary.seed}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Rows</dt>
          <dd>{num(summary.rows)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Accounts</dt>
          <dd>{summary.accounts.length}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Range</dt>
          <dd>
            {shortDate(summary.start)} – {shortDate(summary.end)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Scheduled flows</dt>
          <dd>{num(summary.scheduled_flows)}</dd>
        </div>
      </dl>
      <p className="mt-2 break-words font-mono text-xs text-ink-muted">{summary.accounts.join(", ")}</p>
    </div>
  );
}

function SampleLink({ name, label }: { name: string; label: string }) {
  if (USE_FIXTURES)
    return (
      <p className="mt-2 text-xs text-ink-muted">
        Sample {label} file: {name} (served by the backend).
      </p>
    );
  return (
    <a className="mt-2 inline-block text-series-1 underline underline-offset-2" href={sampleUrl(name)} download={name}>
      Download {name}
    </a>
  );
}

function FormatCard() {
  return (
    <Card title="File format and samples">
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="font-medium text-ink">Daily history (one row per account per day)</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-2 font-mono text-xs text-ink-2">
            {`date,account_id,bank_name,currency,net_flow,ending_balance,required_buffer
2026-01-19,atlas-eur-operating,Atlas Bank,EUR,-12345.67,4300000.00,1000000`}
          </pre>
          <SampleLink {...SAMPLES[0]} />
        </div>
        <div className="min-w-0">
          <h3 className="font-medium text-ink">Scheduled future flows</h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-2 font-mono text-xs text-ink-2">
            {`flow_id,account_id,currency,amount,direction,expected_date,rail,description
payout-2026-05-19,atlas-eur-operating,EUR,4100000,outflow,2026-05-19,SEPA,merchant payout`}
          </pre>
          <SampleLink {...SAMPLES[1]} />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        <code className="font-mono">direction</code> is <code className="font-mono">inflow</code> or{" "}
        <code className="font-mono">outflow</code>. Settlement rails and bank holidays can move a flow&apos;s effective
        date. The samples are the default dataset (seed 42){DEMO ? "" : " served by the backend"}; the same files live
        in the repository under <code className="font-mono">backend/data/samples/</code>.
      </p>
    </Card>
  );
}

export function DataView() {
  const health = useApi("health", (s) => api.health(s));

  const [gen, setGen] = useState<Required<GenerateRequest>>({ accounts: 5, history_days: 120, seed: 42 });
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<unknown>(null);
  const [genRes, setGenRes] = useState<DatasetSummary | null>(null);

  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [scheduledFile, setScheduledFile] = useState<File | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [upErr, setUpErr] = useState<unknown>(null);
  const [upRes, setUpRes] = useState<UploadResponse | null>(null);

  const generate = async () => {
    setGenBusy(true);
    setGenErr(null);
    setGenRes(null);
    try {
      setGenRes(await api.generateData(gen));
      setUpRes(null);
      health.reload();
    } catch (e) {
      setGenErr(e);
    } finally {
      setGenBusy(false);
    }
  };

  const upload = async () => {
    if (!historyFile) return;
    setUpBusy(true);
    setUpErr(null);
    setUpRes(null);
    try {
      setUpRes(await api.uploadData(historyFile, scheduledFile));
      setGenRes(null);
      health.reload();
    } catch (e) {
      setUpErr(e);
    } finally {
      setUpBusy(false);
    }
  };

  const setNum = (k: keyof GenerateRequest) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setGen((g) => ({ ...g, [k]: Number(e.target.value) }));

  return (
    <>
      <PageHeader
        title="Data"
        description="Replace the active dataset on the backend: generate a reproducible synthetic set or upload a CSV in the same format. All other pages use the active dataset."
      />
      <ErrorBanner error={health.error} onRetry={health.reload} retrying={health.loading} />

      <div className="space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink">Active dataset</h2>
          {health.data ? <DatasetStrip health={health.data} /> : health.loading && <Loading label="Loading dataset…" />}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Generate synthetic data" subtitle="Same seed and parameters give the same dataset.">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generate();
              }}
            >
              <div className="grid grid-cols-3 gap-3">
                <Field label="Accounts">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={gen.accounts}
                    onChange={setNum("accounts")}
                    className={inputClass}
                  />
                </Field>
                <Field label="History days">
                  <input
                    type="number"
                    min={30}
                    max={730}
                    required
                    value={gen.history_days}
                    onChange={setNum("history_days")}
                    className={inputClass}
                  />
                </Field>
                <Field label="Seed">
                  <input
                    type="number"
                    min={0}
                    required
                    value={gen.seed}
                    onChange={setNum("seed")}
                    className={inputClass}
                  />
                </Field>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {num(gen.accounts * gen.history_days)} rows will be generated ({gen.accounts} × {gen.history_days}).
              </p>
              <Button type="submit" variant="primary" className="mt-3" disabled={genBusy}>
                {genBusy ? "Generating…" : "Generate"}
              </Button>
            </form>
            <div className="mt-4">
              <ErrorBanner error={genErr} onRetry={generate} retrying={genBusy} />
            </div>
            {genRes && (
              <>
                <SummaryBox summary={genRes} title="Synthetic dataset generated" />
                {genRes.warnings.length > 0 && <Warnings warnings={genRes.warnings} />}
              </>
            )}
          </Card>

          <Card title="Upload CSV" subtitle="History is required; scheduled flows are optional.">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                upload();
              }}
              className="space-y-3"
            >
              <Field label="History CSV" hint={HISTORY_COLS}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  required
                  onChange={(e) => setHistoryFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-ink-2 file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-ink"
                />
              </Field>
              <Field label="Scheduled flows CSV (optional)" hint={SCHEDULED_COLS}>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setScheduledFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-ink-2 file:mr-3 file:rounded-md file:border file:border-line file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:text-ink"
                />
              </Field>
              <Button type="submit" variant="primary" disabled={upBusy || !historyFile}>
                {upBusy ? "Uploading…" : "Upload and validate"}
              </Button>
            </form>
            <div className="mt-4">
              <ErrorBanner error={upErr} />
            </div>
            {upRes && (
              <>
                <SummaryBox summary={upRes} title="CSV accepted" />
                <Warnings warnings={upRes.warnings} />
              </>
            )}
          </Card>
        </div>

        <FormatCard />
      </div>
    </>
  );
}

/** Static demo: no generate/upload (that needs the backend); shows what the demo runs on. */
export function DemoDataView() {
  const health = useApi("health", (s) => api.health(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const manifest = useApi("demo:manifest", () => api.demoManifest());
  const error = health.error ?? accounts.error ?? flows.error ?? manifest.error;
  const sha = manifest.data?.git_commit.sha;

  return (
    <>
      <PageHeader
        title="Data"
        description="The dataset behind this demo: a reproducible synthetic set produced by the backend's generator (seed 42). Every number on the other pages was computed from it by the backend."
      />
      <ErrorBanner
        error={error}
        onRetry={() => {
          for (const r of [health, accounts, flows, manifest]) if (r.error) r.reload();
        }}
      />

      <div className="space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-ink">Active dataset</h2>
          {health.data ? <DatasetStrip health={health.data} /> : health.loading && <Loading label="Loading dataset…" />}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Accounts"
            subtitle={flows.data ? `${flows.data.length} scheduled flows in the forecast window` : undefined}
          >
            {accounts.data ? (
              <ul className="divide-y divide-line text-sm">
                {accounts.data.map((a) => (
                  <li key={a.account_id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{a.bank_name}</span>{" "}
                      <span className="text-ink-2">{a.label}</span>
                    </span>
                    <span className="tabular text-xs text-ink-muted">
                      {money(a.settled_balance, a.currency)} · buffer {money(a.required_buffer, a.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              accounts.loading && <Loading label="Loading accounts…" />
            )}
          </Card>

          <Card title="Use your own data" subtitle="Generate a different synthetic set or upload a CSV.">
            <p className="text-sm text-ink-2">
              Upload your own CSV in the self-hosted version (<code className="font-mono">docker compose up</code>): the
              backend validates it row by row, stores it in PostgreSQL and every page re-runs on it.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-surface-2 p-2 font-mono text-xs text-ink-2">
              {`git clone ${REPO_URL}
cd trueavail && docker compose up --build
# then open http://localhost:3000/data`}
            </pre>
            {manifest.data && (
              <p className="tabular mt-3 text-xs text-ink-muted">
                Demo data generated {manifest.data.generated_at.replace("T", " ").replace("+00:00", " UTC")} by backend{" "}
                {manifest.data.backend_version}
                {sha ? (
                  <>
                    {" "}
                    at commit{" "}
                    <a
                      href={`${REPO_URL}/commit/${sha}`}
                      className="font-mono text-series-1 underline underline-offset-2"
                    >
                      {sha.slice(0, 7)}
                    </a>
                  </>
                ) : null}{" "}
                (<code className="font-mono">make demo-data</code>).
              </p>
            )}
          </Card>
        </div>

        <FormatCard />
      </div>
    </>
  );
}
