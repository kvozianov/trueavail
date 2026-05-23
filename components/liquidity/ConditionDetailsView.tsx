"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import {
  getAccountConditionDetail,
  type ActivityBar,
  type ConditionCurrency,
  type ConditionTone,
  type LiquidityPoint,
} from "@/lib/account-condition-details";

const toneCopy: Record<ConditionTone, { en: string; ru: string }> = {
  blocked: { en: "Breached", ru: "Нарушено" },
  due: { en: "Due", ru: "К оплате" },
  ready: { en: "Ready", ru: "Готово" },
  watch: { en: "Watch", ru: "Наблюдать" },
};

export function ConditionDetailsView({ accountId }: { accountId: string }) {
  const { message, t } = useLanguage();
  const account = getAccountConditionDetail(accountId);
  const chart = buildLiquidityChart(account.liquiditySeries);
  const worstPoint = account.liquiditySeries.reduce((lowest, point) => (point.usable < lowest.usable ? point : lowest), account.liquiditySeries[0]);

  return (
    <main className="condition-detail-page" id="main-content">
      <div className="condition-detail-topbar">
        <Link className="condition-detail-back" href="/liquidity-control-tower" aria-label={t("Back to map", "Back to map")}>
          <span aria-hidden="true">←</span>
          {t("Back to map", "Back to map")}
        </Link>
        <span>{t("Deterministic account packet", "Deterministic account packet")}</span>
      </div>

      <section className="condition-detail-hero" aria-labelledby="condition-detail-title">
        <div className="condition-detail-hero__copy">
          <p className="eyebrow">{account.bank} / {account.accountCode}</p>
          <h1 id="condition-detail-title">{message(account.headline)}</h1>
          <p>{message(account.summary)}</p>
          <div className="condition-detail-identity" aria-label={t("Account identity", "Account identity")}>
            <span>{message(account.city)}</span>
            <span>{account.entity}</span>
            <span>{account.primaryRail}</span>
            <span>{message(account.cutOff)}</span>
          </div>
        </div>

        <div className="condition-detail-command">
          <span>{t("Current governance posture", "Current governance posture")}</span>
          <strong>{account.p05Gap > 0 ? t("Reject unsafe approval", "Reject unsafe approval") : t("Watch", "Наблюдать")}</strong>
          <p>{t("Book balance is not enough; this page explains what cash is actually usable before cut-off.", "Book balance недостаточен; эта страница показывает, какие деньги реально доступны до cut-off.")}</p>
        </div>
      </section>

      <section className="condition-kpi-grid" aria-label={t("Account metrics", "Account metrics")}>
        <MetricCard label={t("Book balance", "Book balance")} value={formatMoney(account.capital, account.currency)} detail={t("Visible cash on account", "Видимые деньги на счёте")} />
        <MetricCard label={t("Usable now", "Usable now")} value={formatMoney(account.usableNow, account.currency)} detail={t("After restricted cash and timing", "После restricted cash и timing")} tone="warning" />
        <MetricCard label={t("Survival floor", "Survival floor")} value={formatMoney(account.liquidityFloor, account.currency)} detail={message(account.cutOff)} />
        <MetricCard label={t("p05 gap", "p05 gap")} value={formatMoney(account.p05Gap, account.currency)} detail={t("Downside liquidity breach", "Downside liquidity breach")} tone="danger" />
        <MetricCard label={t("Committed outflow", "Обязательный отток")} value={formatMoney(account.committedOutflow, account.currency)} detail={`${account.hardEvents} ${t("hard events", "жёстких события")}`} tone="warning" />
      </section>

      <section className="condition-detail-grid" aria-label={t("Detailed account movements", "Детальная история движения денег")}>
        <article className="condition-ledger-card condition-ledger-card--wide">
          <div className="condition-section-heading">
            <p className="eyebrow">{t("Company perimeter", "Company perimeter")}</p>
            <h2>{t("Intragroup transfers to and from this account", "Внутригрупповые переводы по этому счёту")}</h2>
            <p>{t("These movements stay inside the company. They can improve timing, but still need policy, signer and cut-off checks.", "Эти движения остаются внутри компании. Они могут улучшить timing, но всё равно требуют policy, signer и cut-off checks.")}</p>
          </div>
          <div className="condition-transfer-list">
            {account.intragroupTransfers.map((transfer) => (
              <div className={`condition-transfer-row condition-transfer-row--${transfer.direction}`} key={transfer.id}>
                <span>{transfer.date}</span>
                <strong>{message(transfer.title)}</strong>
                <em>{transfer.direction === "in" ? "IN" : "OUT"}</em>
                <b>{formatMoney(transfer.amount, transfer.currency)}</b>
                <small>{message(transfer.counterparty)} · {transfer.rail}</small>
                <p>{message(transfer.note)}</p>
                <i>{message(transfer.status)}</i>
              </div>
            ))}
          </div>
        </article>

        <article className="condition-ledger-card">
          <div className="condition-section-heading">
            <p className="eyebrow">{t("External cash leaving company", "Деньги уходят за пределы компании")}</p>
            <h2>{t("External obligations", "Внешние обязательства")}</h2>
            <p>{t("Credit, tax, vendor and server payments reduce usable cash because they leave the corporate perimeter.", "Кредиты, налоги, vendor и server payments снижают usable cash, потому что деньги уходят за периметр компании.")}</p>
          </div>
          <div className="condition-obligation-stack">
            {account.externalObligations.map((obligation) => (
              <div className={`condition-obligation condition-obligation--${obligation.tone}`} key={obligation.id}>
                <div>
                  <span>{message(obligation.due)}</span>
                  <strong>{message(obligation.title)}</strong>
                  <small>{message(obligation.counterparty)}</small>
                </div>
                <em>{message(toneCopy[obligation.tone])}</em>
                <b>{formatMoney(obligation.amount, obligation.currency)}</b>
                <p>{message(obligation.evidence)}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="condition-ledger-card condition-chart-card">
          <div className="condition-section-heading">
            <p className="eyebrow">{t("Stability and volatility", "Стабильность и колебания")}</p>
            <h2>{t("Usable liquidity history", "История usable liquidity")}</h2>
            <p>{t("The orange line shows usable cash falling below the survival floor as obligations cluster near cut-off.", "Оранжевая линия показывает, как usable cash падает ниже survival floor, когда обязательства сгущаются перед cut-off.")}</p>
          </div>
          <div className="condition-line-chart" aria-label={t("Usable liquidity chart", "График usable liquidity")}>
            <svg viewBox="0 0 640 260" role="img">
              <line className="condition-chart-gridline" x1="36" x2="612" y1={chart.floorY} y2={chart.floorY} />
              <polyline className="condition-chart-requirement" points={chart.requirementPoints} />
              <polyline className="condition-chart-line" points={chart.usablePoints} />
              {chart.points.map((point) => (
                <circle className="condition-chart-dot" cx={point.x} cy={point.y} key={point.date} r="4" />
              ))}
            </svg>
            <div className="condition-chart-caption">
              <span>{t("Lowest point", "Lowest point")}: {worstPoint.date}</span>
              <strong>{formatMoney(worstPoint.usable, account.currency)}</strong>
            </div>
          </div>
        </article>

        <article className="condition-ledger-card condition-bar-card">
          <div className="condition-section-heading">
            <p className="eyebrow">{t("Calendar pressure", "Calendar pressure")}</p>
            <h2>{t("Required cash activity by date", "Активность требований по датам")}</h2>
            <p>{t("Bars combine banking holidays, payroll, tax, vendor and settlement events into a single pressure score.", "Столбцы объединяют bank holidays, payroll, tax, vendor и settlement events в один pressure score.")}</p>
          </div>
          <div className="condition-bar-chart">
            {account.activityBars.map((bar, index) => (
              <Bar key={`${bar.date}-${bar.value}`} bar={bar} index={index} />
            ))}
          </div>
        </article>

        <article className="condition-ledger-card condition-policy-card">
          <div className="condition-section-heading">
            <p className="eyebrow">{t("Important controls", "Важные контроли")}</p>
            <h2>{t("What governance checks before action", "Что governance проверяет перед действием")}</h2>
          </div>
          <div className="condition-policy-grid">
            {account.policyFacts.map((fact) => (
              <div key={message(fact.label)}>
                <span>{message(fact.label)}</span>
                <strong>{message(fact.value)}</strong>
                <p>{message(fact.detail)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail: string; tone?: "neutral" | "warning" | "danger" }) {
  return (
    <article className={`condition-metric condition-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Bar({ bar, index }: { bar: ActivityBar; index: number }) {
  const { message } = useLanguage();

  return (
    <div className={`condition-bar condition-bar--${bar.tone}`} style={{ "--bar-height": `${bar.value}%`, "--bar-delay": `${index * 80}ms` } as CSSProperties}>
      <span />
      <strong>{bar.date}</strong>
      <small>{message(bar.label)}</small>
      <em>{message(bar.driver)}</em>
    </div>
  );
}

function buildLiquidityChart(points: LiquidityPoint[]) {
  const width = 640;
  const height = 260;
  const left = 36;
  const right = 612;
  const top = 26;
  const bottom = 220;
  const values = points.flatMap((point) => [point.usable, point.floor, point.requirement]);
  const min = Math.min(...values) * 0.82;
  const max = Math.max(...values) * 1.06;
  const xStep = (right - left) / Math.max(points.length - 1, 1);
  const scaleY = (value: number) => bottom - ((value - min) / (max - min)) * (bottom - top);
  const chartPoints = points.map((point, index) => ({
    date: point.date,
    x: left + index * xStep,
    y: scaleY(point.usable),
  }));

  return {
    floorY: scaleY(points[0]?.floor ?? 0),
    points: chartPoints,
    requirementPoints: points.map((point, index) => `${left + index * xStep},${scaleY(point.requirement)}`).join(" "),
    usablePoints: chartPoints.map((point) => `${point.x},${point.y}`).join(" "),
    viewBox: `0 0 ${width} ${height}`,
  };
}

function formatMoney(value: number, currency: ConditionCurrency) {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
