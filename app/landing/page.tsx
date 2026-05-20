"use client";

import Image from "next/image";
import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import styles from "./landing.module.css";

const proofPoints = [
  {
    label: "01",
    title: "Usable cash, not book cash",
    body: "Forecast when capital can actually be used after rail cut-offs, holidays, buffers, and settlement delays.",
  },
  {
    label: "02",
    title: "Risk before the breach",
    body: "Surface p05 liquidity pressure, bank concentration, and corridor drift before static balances expose the issue.",
  },
  {
    label: "03",
    title: "Governed action",
    body: "Recommend prefund, hold, throttle, reject, or escalate actions with deterministic receipts and audit evidence.",
  },
];

const demoFacts = [
  ["Forecast", "p05 corridor and usable liquidity"],
  ["Stress", "rail shock, CCRI, concentration"],
  ["Optimizer", "survival floors before transfer cost"],
  ["Governance", "AI Council can reject automation"],
];

const pitchRows = [
  {
    marker: "Problem",
    title: "Treasury sees balance. Operations need availability.",
    body: "TrueAvail separates account balance from usable liquidity by modeling banking days, settlement windows, rail status, floors, and risk concentration.",
  },
  {
    marker: "Product",
    title: "A control room for cash decisions.",
    body: "The product turns fragmented bank data into a command surface: forecast corridor, stress scenarios, optimizer output, governance decision, and contingency plan.",
  },
  {
    marker: "Proof",
    title: "Every recommendation carries evidence.",
    body: "Each action is tied to function output, API contract, audit receipt, and a human-readable reason so treasury can defend the decision.",
  },
];

export default function LandingPage() {
  const { t, translate } = useLanguage();

  return (
    <main className={styles.page} id="main-content">
      <DemoNav mode="replay" statusText="Product landing" />
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.identity}>
          <Link className={styles.wordmark} href="/" aria-label={t("TrueAvail home")}>
            TrueAvail
          </Link>
          <div className={styles.rule} />

          <p className={styles.eyebrow}>{t("Treasury liquidity observatory")}</p>
          <h1 id="landing-title">{t("Book cash isn’t usable cash.")}</h1>
          <p className={styles.lede}>
            {t("TrueAvail shows when cash becomes usable, where downside risk appears, and what treasury should do before a settlement window closes.")}
          </p>

          <div className={styles.actions} aria-label={t("Product links")}>
            <Link className={styles.primaryAction} href="/demo">
              {t("Open live demo")}
            </Link>
            <Link className={styles.secondaryAction} href="/technical">
              {t("View technical proof")}
            </Link>
          </div>

          <dl className={styles.signalGrid} aria-label={t("Product signal")}>
            <div>
              <dt>{t("Decision loop", "Цикл решения")}</dt>
              <dd>Forecast - Stress - Optimize - Govern</dd>
            </div>
            <div>
              <dt>{t("Audience", "Аудитория")}</dt>
              <dd>{t("Treasury, CFO office, risk, operations", "Treasury, офис CFO, risk, operations")}</dd>
            </div>
          </dl>
        </div>

        <aside className={styles.panel} aria-label={t("Product presentation")}>
          <p className={styles.panelKicker}>{t("Product presentation")}</p>
          <h2>{t("Know the exact moment liquidity can be used.")}</h2>
          <p className={styles.panelIntro}>
            {t("TrueAvail is a minimal control layer for settlement-heavy businesses where a false cash view can create failed payouts, expensive emergency funding, or unmanaged concentration risk.",
              "TrueAvail — минимальный control layer для settlement-heavy бизнеса, где ложная картина cash может привести к failed payouts, дорогому emergency funding или неуправляемому concentration risk.")}
          </p>

          <figure className={styles.preview}>
            <Image
              src="/landing-product-preview.png"
              alt="TrueAvail live demo interface"
              width={1440}
              height={940}
              sizes="(max-width: 720px) 100vw, 386px"
              priority
            />
          </figure>

          <ol className={styles.proofList}>
            {proofPoints.map((point) => (
              <li key={point.label}>
                <span>{point.label}</span>
                <div>
                  <strong>{translate(point.title)}</strong>
                  <p>{translate(point.body)}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className={styles.pitch} aria-labelledby="pitch-title">
        <div className={styles.sectionHeader}>
          <p>{t("Investor and buyer narrative")}</p>
          <h2 id="pitch-title">{t("A presentation page built like a briefing.")}</h2>
        </div>

        <div className={styles.pitchRows}>
          {pitchRows.map((row) => (
            <article className={styles.pitchRow} key={row.marker}>
              <span>{translate(row.marker)}</span>
              <h3>{translate(row.title)}</h3>
              <p>{translate(row.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.demoProof} aria-labelledby="proof-title">
        <div>
          <p className={styles.eyebrow}>{t("Live proof packet")}</p>
          <h2 id="proof-title">{t("What the demo proves in one pass.")}</h2>
        </div>

        <dl className={styles.factGrid}>
          {demoFacts.map(([term, detail]) => (
            <div key={term}>
              <dt>{translate(term)}</dt>
              <dd>{translate(detail)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
