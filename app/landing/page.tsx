import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "TrueAvail | Book cash isn’t usable cash.",
  description:
    "Book cash isn’t usable cash. A product presentation for usable cash forecasting, settlement risk, treasury governance, and contingency actions.",
};

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
  return (
    <main className={styles.page} id="main-content">
      <DemoNav mode="replay" statusText="Product landing" />
      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.identity}>
          <Link className={styles.wordmark} href="/" aria-label="TrueAvail home">
            TrueAvail
          </Link>
          <div className={styles.rule} />

          <p className={styles.eyebrow}>Treasury liquidity observatory</p>
          <h1 id="landing-title">Book cash isn’t usable cash.</h1>
          <p className={styles.lede}>
            TrueAvail shows when cash becomes usable, where downside risk appears,
            and what treasury should do before a settlement window closes.
          </p>

          <div className={styles.actions} aria-label="Product links">
            <Link className={styles.primaryAction} href="/demo">
              Open live demo
            </Link>
            <Link className={styles.secondaryAction} href="/technical">
              View technical proof
            </Link>
          </div>

          <dl className={styles.signalGrid} aria-label="Product signal">
            <div>
              <dt>Decision loop</dt>
              <dd>Forecast - Stress - Optimize - Govern</dd>
            </div>
            <div>
              <dt>Audience</dt>
              <dd>Treasury, CFO office, risk, operations</dd>
            </div>
          </dl>
        </div>

        <aside className={styles.panel} aria-label="Product presentation">
          <p className={styles.panelKicker}>Product presentation</p>
          <h2>Know the exact moment liquidity can be used.</h2>
          <p className={styles.panelIntro}>
            TrueAvail is a minimal control layer for settlement-heavy businesses where a
            false cash view can create failed payouts, expensive emergency
            funding, or unmanaged concentration risk.
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
                  <strong>{point.title}</strong>
                  <p>{point.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className={styles.pitch} aria-labelledby="pitch-title">
        <div className={styles.sectionHeader}>
          <p>Investor and buyer narrative</p>
          <h2 id="pitch-title">A presentation page built like a briefing.</h2>
        </div>

        <div className={styles.pitchRows}>
          {pitchRows.map((row) => (
            <article className={styles.pitchRow} key={row.marker}>
              <span>{row.marker}</span>
              <h3>{row.title}</h3>
              <p>{row.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.demoProof} aria-labelledby="proof-title">
        <div>
          <p className={styles.eyebrow}>Live proof packet</p>
          <h2 id="proof-title">What the demo proves in one pass.</h2>
        </div>

        <dl className={styles.factGrid}>
          {demoFacts.map(([term, detail]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
