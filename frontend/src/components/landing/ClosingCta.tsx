import { ButtonLink, GithubIcon } from "@/components/ui";
import { REPO_URL } from "@/lib/links";

export function ClosingCta() {
  return (
    <section className="py-16 sm:py-20" aria-labelledby="cta-title">
      <div className="container-page">
        <div className="card-tonal grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 id="cta-title" className="t-h2">
              Run it on your own CSV.
            </h2>
            <p className="t-lead mt-3 max-w-[52ch]">
              <code className="mono text-[0.9em] text-ink">docker compose up</code> starts PostgreSQL, the FastAPI backend and the dashboard. Upload a history CSV in the
              documented format and get the same forecast, alerts, what-if and backtest on your data.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={REPO_URL} variant="primary" icon={<GithubIcon />}>
                Source on GitHub
              </ButtonLink>
              <ButtonLink href="/data" variant="secondary">
                Data format
              </ButtonLink>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-3 bg-[#101214] p-5 font-mono text-[13px] leading-relaxed text-[#F2F3F5]">
            <code>{`git clone ${REPO_URL}\ncd trueavail\ndocker compose up --build\n# dashboard  http://localhost:3000\n# API docs   http://localhost:8000/docs`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
