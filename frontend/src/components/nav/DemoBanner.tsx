import Link from "next/link";
import { DEMO, USE_FIXTURES } from "@/lib/api";
import { dateOfTimestamp } from "@/lib/format";
import { REPO_URL } from "@/lib/links";
import type { DemoManifest, HealthResponse } from "@/lib/types";
// Precomputed backend output (backend/scripts/export_demo.py, `make demo-data`), read at build time.
import healthJson from "../../../public/demo/health.json";
import manifestJson from "../../../public/demo/manifest.json";

const manifest = manifestJson as unknown as DemoManifest;
const health = healthJson as unknown as HealthResponse;

const Sep = () => (
  <span aria-hidden className="px-1.5 text-ink-4">
    ·
  </span>
);

/** One honest line under the header on every page. Server-rendered, no JS. */
export function DemoBanner() {
  const d = health.dataset;
  const days = d.accounts ? Math.round(d.rows / d.accounts) : null;
  return (
    <div className="border-b border-hairline bg-bg-2">
      <p className="container-page py-2 text-[12.5px] leading-relaxed text-ink-2 sm:py-[9px]">
        {DEMO ? (
          <>
            <strong className="font-semibold text-ink">Demo on synthetic data</strong>
            <span className="hidden sm:inline">
              <Sep />
              {d.accounts} accounts × {days} days{d.seed != null ? `, seed ${d.seed}` : ""}
            </span>
            <Sep />
            <span className="sm:hidden">precomputed by the backend</span>
            <span className="hidden sm:inline">every number was precomputed by the real backend on {dateOfTimestamp(manifest.generated_at)}</span>
            <span className="hidden md:inline">
              <Sep />
              full pipeline: <code className="mono text-[12px] text-ink">docker compose up</code>
            </span>
            <Sep />
            <Link href="/how-it-works" className="link">
              <span className="sm:hidden">how it works</span>
              <span className="hidden sm:inline">Read how it works</span>
            </Link>
            <span className="hidden md:inline">
              <Sep />
              <a href={REPO_URL} className="link">
                GitHub
              </a>
            </span>
          </>
        ) : USE_FIXTURES ? (
          <>
            <strong className="font-semibold text-ink">Fixtures mode</strong>
            <Sep />
            bundled sample responses, the backend is not called
            <Sep />
            synthetic data, nothing moves money
          </>
        ) : (
          <>
            <strong className="font-semibold text-ink">Self-hosted prototype</strong>
            <Sep />
            synthetic data unless you uploaded a CSV
            <Sep />
            every number comes from the live backend
            <Sep />
            no bank connections, nothing moves money
          </>
        )}
      </p>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-bg-2">
      <div className="container-page grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex max-w-xl gap-4">
          <FooterMark />
          <p className="t-small text-ink-2">
            Engineering prototype. Data is synthetic (or a CSV you upload); the model is not calibrated on real bank data. No bank
            connections, no payments, nothing moves money.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-medium">
            <a href={REPO_URL} className="text-ink-2 hover:text-ink">
              GitHub
            </a>
            <Link href="/how-it-works" className="text-ink-2 hover:text-ink">
              How it works
            </Link>
            <Link href="/data" className="text-ink-2 hover:text-ink">
              Data format
            </Link>
          </nav>
          {DEMO && (
            <p className="mono text-[12px] text-ink-3">
              backend {manifest.backend_version} · demo generated {dateOfTimestamp(manifest.generated_at)}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterMark() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M2.5 17.5 L21.5 5.5" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M2.5 17.5 L21.5 11" stroke="var(--ink)" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M2.5 17.5 L21.5 16.5" stroke="var(--ink)" strokeOpacity=".3" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M1.5 14 H22.5" stroke="var(--gap-fill)" strokeWidth="1" strokeDasharray="2.4 1.8" fill="none" />
    </svg>
  );
}
