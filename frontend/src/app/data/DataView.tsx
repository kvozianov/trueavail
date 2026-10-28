"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { Button, ButtonLink, ErrorBanner, Field, GithubIcon, PageTitle, Skeleton, WarningBanner, inputClass } from "@/components/ui";
import { API_URL, DEMO, DEMO_BASE, USE_FIXTURES, api, isApiError } from "@/lib/api";
import { dateOfTimestamp, dayMonth, money, num } from "@/lib/format";
import { REPO_URL } from "@/lib/links";
import type { DatasetSummary, GenerateRequest } from "@/lib/types";
import { useApi } from "@/lib/useApi";

const SAMPLES = [
  { name: "history_5accounts_120d.csv", label: "Daily history", note: "one row per account per day" },
  { name: "scheduled_flows.csv", label: "Scheduled flows", note: "known future payments" },
] as const;

const SCHEMA: Record<string, { type: string; note: string }[]> = {
  "history_5accounts_120d.csv": [
    { type: "date (YYYY-MM-DD)", note: "calendar day" },
    { type: "string", note: "account id, stable across rows" },
    { type: "string", note: "bank name" },
    { type: "ISO 4217 code", note: "account currency" },
    { type: "number", note: "net flow of the day (inflow − outflow)" },
    { type: "number", note: "balance at the end of the day" },
    { type: "number", note: "minimum balance the account must keep" },
  ],
  "scheduled_flows.csv": [
    { type: "string", note: "unique flow id" },
    { type: "string", note: "account id (must exist in history)" },
    { type: "ISO 4217 code", note: "flow currency" },
    { type: "number > 0", note: "amount" },
    { type: "inflow | outflow", note: "direction" },
    { type: "date (YYYY-MM-DD)", note: "expected date" },
    { type: "string", note: "payment rail; settlement delays may move the effective date" },
    { type: "string", note: "free text" },
  ],
};

const sampleUrl = (name: string) => (DEMO ? `${DEMO_BASE}/samples/${name}` : `${API_URL}/api/data/samples/${name}`);

async function fetchText(url: string, signal: AbortSignal) {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
  return r.text();
}

function SampleCard({ name, label, note, bytes }: { name: string; label: string; note: string; bytes: number | null }) {
  const csv = useApi(USE_FIXTURES ? null : `csv:${name}`, (s) => fetchText(sampleUrl(name), s));
  const lines = csv.data?.split(/\r?\n/).filter(Boolean) ?? [];
  const head = lines[0]?.split(",") ?? [];
  const first = lines[1]?.split(",") ?? [];
  const size = bytes ?? (csv.data ? new Blob([csv.data]).size : null);
  return (
    <section className="card-flat min-w-0 p-5" aria-labelledby={`s-${name}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`s-${name}`} className="t-h4">
            {label}
          </h3>
          <p className="t-small mt-0.5">
            <span className="mono">{name}</span>
            {size != null ? ` · ${(size / 1024).toFixed(1)} KB` : ""}
            {lines.length > 1 ? ` · ${num(lines.length - 1)} rows` : ""} · {note}
          </p>
        </div>
        {!USE_FIXTURES && (
          <ButtonLink href={sampleUrl(name)} download={name} size="sm" variant="secondary" icon={<Download size={16} strokeWidth={1.75} aria-hidden />}>
            Download
          </ButtonLink>
        )}
      </div>
      {csv.error ? <ErrorBanner error={csv.error} onRetry={csv.reload} /> : null}
      {lines.length > 0 ? (
        <pre className="mt-4 overflow-x-auto rounded-2 bg-bg-2 p-3 font-mono text-[12px] leading-relaxed text-ink-2">{lines.slice(0, 3).join("\n")}</pre>
      ) : (
        !USE_FIXTURES && <Skeleton className="mt-4 h-16 w-full" />
      )}
      {head.length > 0 && (
        <div className="-mx-5 mt-4 overflow-x-auto px-5">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-[12px] text-ink-3 [&>th]:py-1.5 [&>th]:pr-3 [&>th]:font-medium">
                <th>Column</th>
                <th>Type</th>
                <th>Example</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {head.map((c, i) => (
                <tr key={c} className="border-b border-hairline text-ink-2 last:border-0 [&>td]:py-1.5 [&>td]:pr-3">
                  <td className="font-mono text-ink">{c}</td>
                  <td className="text-[12.5px]">{SCHEMA[name]?.[i]?.type ?? ""}</td>
                  <td className="font-mono text-[12px]">{first[i] ?? ""}</td>
                  <td className="text-[12.5px]">{SCHEMA[name]?.[i]?.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DatasetCard({ generated }: { generated?: string | null }) {
  const health = useApi("health", (s) => api.health(s));
  const accounts = useApi("accounts", (s) => api.accounts(s));
  const flows = useApi("scheduled", (s) => api.scheduled(s));
  const d = health.data?.dataset;
  return (
    <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="ds-h">
      <h2 id="ds-h" className="t-h4">
        Active dataset
      </h2>
      <ErrorBanner error={health.error ?? accounts.error ?? flows.error} onRetry={() => [health, accounts, flows].forEach((r) => r.error && r.reload())} />
      {d ? (
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["source", d.source === "synthetic" ? "synthetic" : "uploaded CSV"],
              ["rows", num(d.rows)],
              ["accounts", num(d.accounts)],
              ["history", `${dayMonth(d.start)} – ${dayMonth(d.end)} ${d.end.slice(0, 4)}`],
              ["scheduled flows", flows.data ? num(flows.data.length) : "—"],
              [generated ? "generated" : "seed", generated ? dateOfTimestamp(generated) : d.seed != null ? String(d.seed) : "—"],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dd className="font-display text-[20px] font-semibold leading-tight text-ink tnum">{v}</dd>
              <dt className="t-small mt-1">{k}</dt>
            </div>
          ))}
        </dl>
      ) : (
        <Skeleton className="mt-5 h-14 w-full" />
      )}
      {accounts.data && (
        <div className="-mx-5 mt-6 overflow-x-auto px-5 sm:-mx-6 sm:px-6">
          <table className="w-full min-w-[560px] text-left text-[13.5px] tnum">
            <thead>
              <tr className="border-b border-hairline text-[12.5px] text-ink-3 [&>th]:py-2 [&>th]:pr-3 [&>th]:font-medium">
                <th>Bank</th>
                <th>Account</th>
                <th>Currency</th>
                <th className="text-right">Settled balance</th>
                <th className="text-right">Required buffer</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.map((a) => (
                <tr key={a.account_id} className="border-b border-hairline text-ink-2 last:border-0 [&>td]:py-2 [&>td]:pr-3">
                  <td className="font-medium text-ink">{a.bank_name}</td>
                  <td>
                    {a.label} <span className="font-mono text-[11.5px] text-ink-3">{a.account_id}</span>
                  </td>
                  <td className="font-mono">{a.currency}</td>
                  <td className="text-right">{money(a.settled_balance, a.currency)}</td>
                  <td className="text-right">{money(a.required_buffer, a.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Title() {
  const health = useApi("health", (s) => api.health(s));
  const d = health.data?.dataset;
  const days = d && d.accounts ? Math.round(d.rows / d.accounts) : null;
  return (
    <PageTitle
      eyebrow={d ? `Data · ${d.source}${d.seed != null ? ` · seed ${d.seed}` : ""}` : "Data"}
      title={d ? `${num(d.rows)} rows, ${d.accounts} accounts, ${days} days.` : <Skeleton className="h-10 w-80" />}
    >
      {DEMO
        ? "The dataset behind this demo: a reproducible synthetic set from the backend's generator. Every number on the other pages was computed from it by the backend."
        : "Replace the active dataset on the backend: generate a reproducible synthetic set or upload a CSV in the same format. Every page uses the active dataset."}
    </PageTitle>
  );
}

function Samples() {
  const manifest = useApi(DEMO ? "demo:manifest" : null, () => api.demoManifest());
  const size = (name: string) => manifest.data?.files.find((f) => f.path === `samples/${name}`)?.bytes ?? null;
  return (
    <section aria-labelledby="fmt-h">
      <h2 id="fmt-h" className="t-h3 mb-4">
        File format and samples
      </h2>
      <div className="grid gap-6 xl:grid-cols-2">
        {SAMPLES.map((s) => (
          <SampleCard key={s.name} {...s} bytes={size(s.name)} />
        ))}
      </div>
    </section>
  );
}

/** Static demo: read-only. */
export function DemoDataView() {
  const manifest = useApi("demo:manifest", () => api.demoManifest());
  return (
    <div className="container-page space-y-8 pb-8">
      <Title />
      <DatasetCard generated={manifest.data?.generated_at} />
      <Samples />
      <section className="card-tonal grid gap-6 p-5 sm:p-6 lg:grid-cols-2" aria-labelledby="up-h">
        <div>
          <h2 id="up-h" className="t-h4">
            Upload in the self-hosted version
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            The hosted demo is read-only. Run <code className="mono text-[13px] text-ink">docker compose up</code>, open localhost:3000/data, and upload a history CSV (and
            optionally a scheduled-flows CSV). Rows are validated one by one; errors come back with row and column.
          </p>
          <ButtonLink href={REPO_URL} variant="secondary" className="mt-4" icon={<GithubIcon />}>
            Source on GitHub
          </ButtonLink>
        </div>
        <pre className="overflow-x-auto rounded-3 bg-[#101214] p-5 font-mono text-[13px] leading-relaxed text-[#F2F3F5]">
          <code>{`git clone ${REPO_URL}\ncd trueavail && docker compose up --build\n# then open http://localhost:3000/data`}</code>
        </pre>
      </section>
    </div>
  );
}

function SummaryBox({ s, title }: { s: DatasetSummary; title: string }) {
  return (
    <div className="mt-4 rounded-2 border-l-[3px] border-good-fill bg-good-tint px-4 py-3 text-[14px]">
      <p className="font-semibold text-good">{title}</p>
      <p className="mt-1 text-ink-2 tnum">
        {s.source}
        {s.seed != null ? ` · seed ${s.seed}` : ""} · {num(s.rows)} rows · {s.accounts.length} accounts · {dayMonth(s.start)} – {dayMonth(s.end)} · {num(s.scheduled_flows)} scheduled flows
      </p>
    </div>
  );
}

/** Self-hosted: generate a synthetic set or upload CSVs. */
export function DataView() {
  const [gen, setGen] = useState<Required<GenerateRequest>>({ accounts: 5, history_days: 120, seed: 42 });
  const [genBusy, setGenBusy] = useState(false);
  const [genErr, setGenErr] = useState<unknown>(null);
  const [genRes, setGenRes] = useState<DatasetSummary | null>(null);
  const [hist, setHist] = useState<File | null>(null);
  const [sched, setSched] = useState<File | null>(null);
  const [upBusy, setUpBusy] = useState(false);
  const [upErr, setUpErr] = useState<unknown>(null);
  const [upRes, setUpRes] = useState<DatasetSummary | null>(null);
  const [nonce, setNonce] = useState(0);
  const seedBad = !Number.isInteger(gen.seed) || gen.seed < 0;

  const generate = async () => {
    setGenBusy(true);
    setGenErr(null);
    setGenRes(null);
    try {
      setGenRes(await api.generateData(gen));
      setUpRes(null);
      setNonce((n) => n + 1);
    } catch (e) {
      setGenErr(e);
    } finally {
      setGenBusy(false);
    }
  };
  const upload = async () => {
    if (!hist) return;
    setUpBusy(true);
    setUpErr(null);
    setUpRes(null);
    try {
      setUpRes(await api.uploadData(hist, sched));
      setGenRes(null);
      setNonce((n) => n + 1);
    } catch (e) {
      setUpErr(e);
    } finally {
      setUpBusy(false);
    }
  };
  const setNum = (k: keyof GenerateRequest) => (e: React.ChangeEvent<HTMLInputElement>) => setGen((g) => ({ ...g, [k]: Number(e.target.value) }));

  return (
    <div className="container-page space-y-8 pb-8">
      <Title key={`t${nonce}`} />
      <DatasetCard key={`d${nonce}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="up-h">
          <h2 id="up-h" className="t-h4">
            Upload CSV
          </h2>
          <p className="t-small mt-0.5">History is required; scheduled flows are optional. Rows are validated one by one.</p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              upload();
            }}
          >
            <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-3 border border-dashed border-border-input bg-bg-2 px-4 text-center focus-within:shadow-[var(--focus-ring)]">
              <Upload size={20} strokeWidth={1.75} aria-hidden className="text-ink-3" />
              <span className="text-[14px] font-medium text-ink">{hist ? hist.name : "Choose a history CSV"}</span>
              <span className="t-micro">date, account_id, bank_name, currency, net_flow, ending_balance, required_buffer</span>
              <input type="file" accept=".csv,text/csv" required className="sr-only-table" onChange={(e) => setHist(e.target.files?.[0] ?? null)} />
            </label>
            <Field label="Scheduled flows CSV (optional)">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setSched(e.target.files?.[0] ?? null)}
                className="text-[13px] text-ink-2 file:mr-3 file:h-9 file:cursor-pointer file:rounded-full file:border file:border-hairline-2 file:bg-bg file:px-4 file:text-[13px] file:font-medium file:text-ink"
              />
            </Field>
            <Button type="submit" variant="accent" loading={upBusy} disabled={upBusy || !hist}>
              {upBusy ? "Uploading…" : "Upload"}
            </Button>
          </form>
          {isApiError(upErr) && upErr.kind === "validation" ? (
            <WarningBanner title={`${upErr.details.length} validation messages — the CSV was rejected.`} lines={upErr.details} />
          ) : (
            <ErrorBanner error={upErr} />
          )}
          {upRes && (
            <>
              <SummaryBox s={upRes} title="CSV accepted" />
              {upRes.warnings.length > 0 && <WarningBanner title={`${upRes.warnings.length} validation warnings`} lines={upRes.warnings} />}
            </>
          )}
        </section>
        <section className="card min-w-0 p-5 sm:p-6" aria-labelledby="gen-h">
          <h2 id="gen-h" className="t-h4">
            Generate synthetic data
          </h2>
          <p className="t-small mt-0.5">Same seed and parameters give the same dataset.</p>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!seedBad) generate();
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <Field label="Accounts" hint="1–12">
                <input type="number" min={1} max={12} required value={gen.accounts} onChange={setNum("accounts")} className={inputClass} />
              </Field>
              <Field label="History days" hint="30–730">
                <input type="number" min={30} max={730} required value={gen.history_days} onChange={setNum("history_days")} className={inputClass} />
              </Field>
              <Field label="Seed" error={seedBad ? "Must be an integer ≥ 0" : null}>
                <input type="number" min={0} required aria-invalid={seedBad} value={gen.seed} onChange={setNum("seed")} className={inputClass} />
              </Field>
            </div>
            <p className="t-small mt-3">
              {num(gen.accounts * gen.history_days)} rows ({gen.accounts} × {gen.history_days}).
            </p>
            <Button type="submit" variant="accent" className="mt-4" loading={genBusy} disabled={genBusy || seedBad}>
              {genBusy ? "Generating…" : `Generate ${gen.accounts} accounts × ${gen.history_days} days`}
            </Button>
          </form>
          <ErrorBanner error={genErr} onRetry={generate} retrying={genBusy} />
          {genRes && (
            <>
              <SummaryBox s={genRes} title="Synthetic dataset generated" />
              {genRes.warnings.length > 0 && <WarningBanner title={`${genRes.warnings.length} validation warnings`} lines={genRes.warnings} />}
            </>
          )}
        </section>
      </div>
      <Samples />
    </div>
  );
}
