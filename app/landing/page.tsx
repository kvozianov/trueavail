"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { geoGraticule, geoNaturalEarth1, geoPath } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";
import type { FeatureCollection, Geometry } from "geojson";
import dynamic from "next/dynamic";
import Link from "next/link";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesAtlas from "world-atlas/countries-110m.json";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import styles from "./landing.module.css";

const Spline = dynamic<{ scene: string }>(() => import("@splinetool/react-spline").then((mod) => mod.default), {
  loading: () => <div className={styles.splineLoading} aria-hidden="true" />,
  ssr: false,
});

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

const defaultBlockchainSplineScene = "https://prod.spline.design/aM3hme8b4yErQ5I5/scene.splinecode";
const blockchainSplineScene = process.env.NEXT_PUBLIC_BLOCKCHAIN_SPLINE_SCENE?.trim() || defaultBlockchainSplineScene;
const hasBlockchainSplineScene =
  blockchainSplineScene.startsWith("https://") || blockchainSplineScene.startsWith("/");

const blockchainSteps = [
  {
    marker: "01",
    title: "Policy-checked intent",
    body: "Treasury selects the source, destination, amount, rail requirements, and signer policy before anything can move.",
  },
  {
    marker: "02",
    title: "Private settlement proof",
    body: "The permissioned ledger stores a deterministic receipt for the approved movement while keeping operational detail readable only to authorized reviewers.",
  },
  {
    marker: "03",
    title: "Finality back to the cockpit",
    body: "The landing account, usable-liquidity forecast, audit trail, and governance state update as one controlled decision loop.",
  },
] as const;

const blockchainLedgerRows = [
  ["rail type", "permissioned"],
  ["approval gate", "KYB + signer policy"],
  ["receipt", "audit hash ready"],
  ["fallback", "legacy route preserved"],
] as const;

type AccountPin = {
  account: string;
  amount: string;
  city: string;
  labelOffsetX?: number;
  labelOffsetY?: number;
  reveal: readonly [number, number];
  side: "left" | "right";
  x: number;
  y: number;
};

type AnimatedRoute = {
  d: string;
  muted?: boolean;
  range: readonly [number, number];
};

type MapHighlightTone = "blue" | "orange" | "red";

type MapHighlight = {
  detail: string;
  height: number;
  label: string;
  range: readonly [number, number];
  tone: MapHighlightTone;
  width: number;
  x: number;
  y: number;
};

type StoryInsightPanelData = {
  actionHref?: string;
  actionLabel?: string;
  body: string;
  eyebrow: string;
  marker: string;
  metrics: readonly (readonly [string, string])[];
  range: readonly [number, number];
  side: "left" | "right";
  title: string;
};

const MINI_MAP_WIDTH = 420;
const MINI_MAP_HEIGHT = 220;

type WorldAtlasTopology = Topology<{ countries: GeometryCollection }>;
type MiniMapPoint = {
  svgX: number;
  svgY: number;
  x: number;
  y: number;
};

const worldTopology = countriesAtlas as unknown as WorldAtlasTopology;
const miniMapCountries = feature(
  worldTopology,
  worldTopology.objects.countries,
) as FeatureCollection<Geometry, { name?: string }>;
const miniMapGraticule = geoGraticule().step([30, 30])();
const miniMapSphere = { type: "Sphere" } as GeoPermissibleObjects;
const miniMapProjection = geoNaturalEarth1()
  .fitExtent(
    [
      [12, 20],
      [MINI_MAP_WIDTH - 12, MINI_MAP_HEIGHT - 16],
    ],
    miniMapCountries,
  )
  .precision(0.6);
const miniMapPath = geoPath(miniMapProjection);
const miniMapSpherePath = miniMapPath(miniMapSphere);
const miniMapGraticulePath = miniMapPath(miniMapGraticule);
const miniCountryPaths = miniMapCountries.features.map((country, index) => ({
  d: miniMapPath(country),
  id: String(country.id ?? country.properties?.name ?? `country-${index}`),
}));

function projectMiniMapPoint(longitude: number, latitude: number): MiniMapPoint {
  const projected = miniMapProjection([longitude, latitude]) ?? [MINI_MAP_WIDTH / 2, MINI_MAP_HEIGHT / 2];

  return {
    svgX: projected[0],
    svgY: projected[1],
    x: (projected[0] / MINI_MAP_WIDTH) * 100,
    y: (projected[1] / MINI_MAP_HEIGHT) * 100,
  };
}

const miniMapLocations = {
  frankfurt: projectMiniMapPoint(8.6821, 50.1109),
  london: projectMiniMapPoint(-0.1276, 51.5072),
  nyc: projectMiniMapPoint(-74.006, 40.7128),
  riyadh: projectMiniMapPoint(46.6753, 24.7136),
  singapore: projectMiniMapPoint(103.8198, 1.3521),
} as const;

const accountPins: readonly AccountPin[] = [
  { account: "USD-01", city: "NYC", amount: "$576k", labelOffsetY: 15, x: miniMapLocations.nyc.x, y: miniMapLocations.nyc.y, side: "right", reveal: [0.08, 0.18] },
  { account: "GBP-02", city: "London", amount: "GBP 612k", labelOffsetX: -5, labelOffsetY: -13, x: miniMapLocations.london.x, y: miniMapLocations.london.y, side: "left", reveal: [0.12, 0.22] },
  { account: "EUR-01", city: "Frankfurt", amount: "EUR 1.03m", labelOffsetY: -6, x: miniMapLocations.frankfurt.x, y: miniMapLocations.frankfurt.y, side: "right", reveal: [0.16, 0.26] },
  { account: "SAR-03", city: "Riyadh", amount: "SAR 2.4m", labelOffsetY: 3, x: miniMapLocations.riyadh.x, y: miniMapLocations.riyadh.y, side: "right", reveal: [0.2, 0.3] },
  { account: "SGD-04", city: "Singapore", amount: "SGD 820k", labelOffsetX: -6, labelOffsetY: 14, x: miniMapLocations.singapore.x, y: miniMapLocations.singapore.y, side: "left", reveal: [0.24, 0.34] },
] as const;

const animatedRoutes: readonly AnimatedRoute[] = [
  {
    d: `M${miniMapLocations.nyc.svgX} ${miniMapLocations.nyc.svgY}C162 38 190 38 ${miniMapLocations.london.svgX} ${miniMapLocations.london.svgY}`,
    range: [0.3, 0.48],
  },
  {
    d: `M${miniMapLocations.london.svgX} ${miniMapLocations.london.svgY}C232 58 245 68 ${miniMapLocations.riyadh.svgX} ${miniMapLocations.riyadh.svgY}C276 101 294 113 ${miniMapLocations.singapore.svgX} ${miniMapLocations.singapore.svgY}`,
    range: [0.38, 0.58],
  },
  {
    d: `M${miniMapLocations.frankfurt.svgX} ${miniMapLocations.frankfurt.svgY}C252 44 288 70 ${miniMapLocations.singapore.svgX} ${miniMapLocations.singapore.svgY}`,
    range: [0.46, 0.64],
    muted: true,
  },
] as const;

const mapHighlights: readonly MapHighlight[] = [
  {
    detail: "p05 floor -18%",
    height: 22,
    label: "NYC pressure pocket",
    range: [0.12, 0.34],
    tone: "red",
    width: 18,
    x: miniMapLocations.nyc.x,
    y: miniMapLocations.nyc.y,
  },
  {
    detail: "rail window",
    height: 18,
    label: "EU cash source",
    range: [0.3, 0.52],
    tone: "blue",
    width: 18,
    x: miniMapLocations.london.x,
    y: miniMapLocations.london.y,
  },
  {
    detail: "buffer route",
    height: 24,
    label: "GCC corridor",
    range: [0.46, 0.72],
    tone: "orange",
    width: 24,
    x: miniMapLocations.riyadh.x,
    y: miniMapLocations.riyadh.y,
  },
  {
    detail: "settlement sink",
    height: 22,
    label: "SG payout cluster",
    range: [0.58, 0.86],
    tone: "blue",
    width: 22,
    x: miniMapLocations.singapore.x,
    y: miniMapLocations.singapore.y,
  },
] as const;

const storyInsightPanels: readonly StoryInsightPanelData[] = [
  {
    body: "The first move is not more dashboard copy. The map zooms into the account network and shows where usable cash is actually constrained.",
    eyebrow: "01 / Return to screen",
    marker: "Network",
    metrics: [
      ["accounts", "5 live"],
      ["currencies", "USD / GBP / EUR / SAR / SGD"],
      ["floor mode", "usable cash"],
    ],
    range: [0.34, 0.5],
    side: "right",
    title: "Start wide, then pull attention into the account mesh.",
  },
  {
    body: "The screen shifts left while the map pushes into the Atlantic and Europe corridor. Routes draw only after the relevant cash pockets are visible.",
    eyebrow: "02 / Corridor zoom",
    marker: "Rail timing",
    metrics: [
      ["cut-off", "T-42 min"],
      ["source rail", "GBP -> USD"],
      ["visibility", "region highlight"],
    ],
    range: [0.5, 0.66],
    side: "left",
    title: "Zoom into the corridor before explaining the risk.",
  },
  {
    body: "The camera backs off, the object moves right, and a side note explains why USD-01 is unsafe even though the book balance still looks fine.",
    eyebrow: "03 / Risk reveal",
    marker: "Pressure",
    metrics: [
      ["USD-01", "$576k"],
      ["p05 floor", "$680k"],
      ["shortfall", "$104k"],
    ],
    range: [0.66, 0.82],
    side: "right",
    title: "Pull back just enough for the viewer to read the warning.",
  },
  {
    actionHref: "/demo",
    actionLabel: "Open live demo",
    body: "The final return to the screen combines forecast, stress, optimizer, and governance into one decision instead of a decorative ending.",
    eyebrow: "04 / Governed decision",
    marker: "Decision",
    metrics: [
      ["recommendation", "hold"],
      ["reason", "rail + floor breach"],
      ["audit", "receipt ready"],
    ],
    range: [0.82, 0.98],
    side: "left",
    title: "Come back to the object for the action.",
  },
] as const;

const storySteps = [
  {
    marker: "01",
    kicker: "Network view",
    title: "Start with the accounts, not the dashboard.",
    body: "The presentation opens on a live cash network: each point is a treasury account with its own currency, rail window, and survival floor.",
  },
  {
    marker: "02",
    kicker: "Settlement motion",
    title: "Then the rails draw themselves.",
    body: "As the story moves, transfer corridors appear between accounts so a buyer can see how availability depends on timing, not just balance.",
  },
  {
    marker: "03",
    kicker: "Risk reveal",
    title: "The problem account becomes impossible to miss.",
    body: "A projected minimum breach turns one account into the focal point, shifting the page from overview into incident mode.",
  },
  {
    marker: "04",
    kicker: "Governed decision",
    title: "The product answers with evidence.",
    body: "Forecast, stress, optimizer, and governance collapse into one decision card: hold automation, explain why, and send treasury to the live demo.",
  },
] as const;

type AccountMapProps = {
  progress?: MotionValue<number>;
  riskProgress?: MotionValue<number>;
  variant?: "compact" | "presentation";
};

function AnimatedRoutePath({ route, progress }: { route: AnimatedRoute; progress?: MotionValue<number> }) {
  const staticProgress = useMotionValue(1);
  const reducedMotion = useReducedMotion();
  const progressSource = progress ?? staticProgress;
  const pathLength = useTransform(progressSource, [route.range[0], route.range[1]], [0, 1]);
  const opacity = useTransform(progressSource, [route.range[0], route.range[1]], [0, route.muted ? 0.42 : 0.9]);

  return (
    <motion.path
      className={route.muted ? styles.mapRouteMuted : styles.mapRoute}
      d={route.d}
      style={reducedMotion ? undefined : { opacity, pathLength }}
    />
  );
}

function MapHighlightLayer({ highlight, progress }: { highlight: MapHighlight; progress?: MotionValue<number> }) {
  const staticProgress = useMotionValue(1);
  const reducedMotion = useReducedMotion();
  const progressSource = progress ?? staticProgress;
  const opacity = useTransform(
    progressSource,
    [highlight.range[0], highlight.range[0] + 0.05, highlight.range[1] - 0.05, highlight.range[1]],
    [0, 1, 1, 0],
  );
  const scale = useTransform(
    progressSource,
    [highlight.range[0], highlight.range[0] + 0.08, highlight.range[1]],
    [0.78, 1, 1.08],
  );
  const toneClass =
    highlight.tone === "red"
      ? styles.focusRed
      : highlight.tone === "blue"
        ? styles.focusBlue
        : styles.focusOrange;

  return (
    <motion.span
      className={`${styles.mapFocusHalo} ${toneClass}`}
      style={{
        height: `${highlight.height}%`,
        left: `${highlight.x}%`,
        opacity: reducedMotion ? 1 : opacity,
        scale: reducedMotion ? 1 : scale,
        top: `${highlight.y}%`,
        width: `${highlight.width}%`,
      }}
    >
      <span>
        <strong>{highlight.label}</strong>
        <em>{highlight.detail}</em>
      </span>
    </motion.span>
  );
}

function AccountPoint({
  pin,
  progress,
  riskProgress,
}: {
  pin: AccountPin;
  progress?: MotionValue<number>;
  riskProgress?: MotionValue<number>;
}) {
  const staticProgress = useMotionValue(1);
  const staticRiskProgress = useMotionValue(0);
  const reducedMotion = useReducedMotion();
  const progressSource = progress ?? staticProgress;
  const riskProgressSource = riskProgress ?? staticRiskProgress;
  const opacity = useTransform(progressSource, [pin.reveal[0], pin.reveal[1]], [0, 1]);
  const baseDotOpacity = useTransform(riskProgressSource, [0.42, 0.54], [1, 0]);
  const riskDotOpacity = useTransform(riskProgressSource, [0.42, 0.54], [0, 1]);
  const showRiskState = pin.account === "USD-01" && riskProgress !== undefined;

  return (
    <motion.span
      className={`${styles.accountPoint} ${pin.side === "left" ? styles.sideLeft : styles.sideRight}`}
      style={{
        left: `${pin.x}%`,
        opacity: reducedMotion ? 1 : opacity,
        top: `${pin.y}%`,
      }}
    >
      <span className={styles.accountDotShell} aria-hidden="true">
        <motion.span
          className={styles.accountDot}
          style={showRiskState && !reducedMotion ? { opacity: baseDotOpacity } : undefined}
        />
        {showRiskState ? (
          <motion.span
            className={styles.accountDotRisk}
            style={reducedMotion ? { opacity: 1 } : { opacity: riskDotOpacity }}
          />
        ) : null}
      </span>
      <span
        className={styles.accountTag}
        style={{ transform: `translate(${pin.labelOffsetX ?? 0}px, ${pin.labelOffsetY ?? 0}px)` }}
      >
        <strong>{pin.account}</strong>
        <em>{pin.city}</em>
        <small>{pin.amount}</small>
      </span>
    </motion.span>
  );
}

function AccountMap({ progress, riskProgress, variant = "compact" }: AccountMapProps) {
  const reducedMotion = useReducedMotion();
  const staticProgress = useMotionValue(1);
  const progressSource = progress ?? staticProgress;
  const lensOpacity = useTransform(progressSource, [0.12, 0.2, 0.76, 0.88], [0, 1, 1, 0]);
  const lensLeft = useTransform(
    progressSource,
    [0.12, 0.34, 0.58, 0.78],
    [`${miniMapLocations.nyc.x}%`, `${miniMapLocations.london.x}%`, `${miniMapLocations.riyadh.x}%`, `${miniMapLocations.singapore.x}%`],
  );
  const lensTop = useTransform(
    progressSource,
    [0.12, 0.34, 0.58, 0.78],
    [`${miniMapLocations.nyc.y}%`, `${miniMapLocations.london.y}%`, `${miniMapLocations.riyadh.y}%`, `${miniMapLocations.singapore.y}%`],
  );
  const riskFieldOpacity = useTransform(progressSource, [0.44, 0.56, 0.88], [0, 1, 0.45]);

  return (
    <figure
      className={`${styles.accountMap} ${variant === "presentation" ? styles.presentationMap : ""}`}
      aria-label="Account map"
    >
      <div className={styles.mapTopline}>
        <span>Account map</span>
        <strong>5 treasury accounts</strong>
      </div>
      {variant === "presentation" ? (
        <div className={styles.mapTelemetryStrip} aria-hidden="true">
          <span>p05 forecast</span>
          <strong>USD-01 breach in 42m</strong>
          <em>rail window active</em>
        </div>
      ) : null}

      <div className={styles.mapCanvas}>
        <svg className={styles.mapBase} viewBox="0 0 420 220" preserveAspectRatio="none" aria-hidden="true">
          {miniMapSpherePath ? <path className={styles.mapSphere} d={miniMapSpherePath} /> : null}
          {miniMapGraticulePath ? <path className={styles.mapGraticule} d={miniMapGraticulePath} /> : null}
          <g className={styles.countryLayer}>
            {miniCountryPaths.map((country) =>
              country.d ? <path className={styles.countryShape} d={country.d} key={country.id} /> : null,
            )}
          </g>
          {animatedRoutes.map((route) => (
            <AnimatedRoutePath key={route.d} progress={progress} route={route} />
          ))}
        </svg>

        {variant === "presentation" ? (
          <motion.span className={styles.mapRiskField} style={reducedMotion ? undefined : { opacity: riskFieldOpacity }} />
        ) : null}

        {accountPins.map((pin) => (
          <AccountPoint key={pin.account} pin={pin} progress={progress} riskProgress={riskProgress} />
        ))}

        {variant === "presentation"
          ? mapHighlights.map((highlight) => (
              <MapHighlightLayer highlight={highlight} key={highlight.label} progress={progress} />
            ))
          : null}

        {variant === "presentation" ? (
          <motion.div
            className={styles.mapLens}
            style={reducedMotion ? undefined : { left: lensLeft, opacity: lensOpacity, top: lensTop }}
            aria-hidden="true"
          >
            <span>focus lens</span>
            <strong>usable liquidity delta</strong>
            <em>book cash != available cash</em>
          </motion.div>
        ) : null}
      </div>

      {variant === "presentation" ? (
        <div className={styles.mapBottomRail} aria-hidden="true">
          <span>settlement cut-off</span>
          <i />
          <strong>T-42m</strong>
          <em>optimizer locked to survival floor</em>
        </div>
      ) : null}
    </figure>
  );
}

function StoryInsightPanel({
  panel,
  progress,
}: {
  panel: StoryInsightPanelData;
  progress: MotionValue<number>;
}) {
  const reducedMotion = useReducedMotion();
  const opacity = useTransform(
    progress,
    [panel.range[0], panel.range[0] + 0.05, panel.range[1] - 0.05, panel.range[1]],
    [0, 1, 1, 0],
  );
  const x = useTransform(
    progress,
    [panel.range[0], panel.range[0] + 0.05, panel.range[1] - 0.05, panel.range[1]],
    [panel.side === "left" ? -28 : 28, 0, 0, panel.side === "left" ? -14 : 14],
  );
  const y = useTransform(progress, [panel.range[0], panel.range[0] + 0.05], [18, 0]);

  return (
    <motion.aside
      className={`${styles.storySidePanel} ${panel.side === "left" ? styles.sidePanelLeft : styles.sidePanelRight}`}
      style={reducedMotion ? undefined : { opacity, x, y }}
    >
      <span>{panel.eyebrow}</span>
      <strong>{panel.marker}</strong>
      <h3>{panel.title}</h3>
      <p>{panel.body}</p>
      <dl>
        {panel.metrics.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {panel.actionHref && panel.actionLabel ? <Link href={panel.actionHref}>{panel.actionLabel}</Link> : null}
    </motion.aside>
  );
}

type PresentationStoryProps = {
  scrollYProgress: MotionValue<number>;
  storyRef: RefObject<HTMLElement | null>;
};

function PresentationStory({ scrollYProgress, storyRef }: PresentationStoryProps) {
  const reducedMotion = useReducedMotion();
  const smoothStoryProgress = useSpring(scrollYProgress, { damping: 42, mass: 0.32, stiffness: 86 });
  const mapProgress = useTransform(smoothStoryProgress, [0.1, 0.88], [0, 1]);
  const stageOpacity = useTransform(smoothStoryProgress, [0, 0.05, 0.9, 0.98], [0.68, 1, 1, 0.84]);
  const stageY = useTransform(smoothStoryProgress, [0, 0.12], [38, 0]);
  const fullMapOpacity = useTransform(smoothStoryProgress, [0.04, 0.16], [0, 1]);
  const fullMapScale = useTransform(smoothStoryProgress, [0.04, 0.2], [0.72, 1]);
  const phaseRailOpacity = useTransform(smoothStoryProgress, [0.12, 0.24], [0, 1]);

  return (
    <section className={styles.story} ref={storyRef} aria-labelledby="story-title">
      <div className={styles.storyCopy}>
        <div className={styles.storyIntro}>
          <p className={styles.eyebrow}>Animated product story</p>
          <h2 id="story-title">A presentation that behaves like the product.</h2>
        </div>

        {storySteps.map((step) => (
          <motion.article
            className={styles.storyStep}
            key={step.marker}
            initial={reducedMotion ? false : { opacity: 0.25, y: 26 }}
            transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
            viewport={{ amount: 0.55, once: false }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          >
            <span>{step.marker}</span>
            <p>{step.kicker}</p>
            <h3>{step.title}</h3>
            <small>{step.body}</small>
          </motion.article>
        ))}
      </div>

      <div className={styles.storyStageWrap}>
        <motion.div
          className={styles.storyStage}
          style={reducedMotion ? undefined : { opacity: stageOpacity, y: stageY }}
        >
          <motion.div
            className={styles.storyFrame}
            style={reducedMotion ? undefined : { opacity: fullMapOpacity, scale: fullMapScale }}
          >
            <motion.div className={styles.stageHeader} style={reducedMotion ? undefined : { opacity: phaseRailOpacity }}>
              <span>TrueAvail live narrative</span>
              <strong>Forecast - Stress - Govern</strong>
            </motion.div>

            <AccountMap progress={mapProgress} riskProgress={mapProgress} variant="presentation" />
          </motion.div>

          {storyInsightPanels.map((panel) => (
            <StoryInsightPanel key={panel.marker} panel={panel} progress={smoothStoryProgress} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function BlockchainSection() {
  const { t, translate } = useLanguage();

  return (
    <section className={styles.blockchain} aria-labelledby="blockchain-title">
      <div className={styles.blockchainIntro}>
        <p className={styles.eyebrow}>{t("Permissioned blockchain rail", "Разрешённый blockchain rail")}</p>
        <h2 id="blockchain-title">{t("The map hands the decision to a governed settlement layer.", "Карта передаёт решение в governed settlement layer.")}</h2>
        <p>
          {t(
            "After the account map shows where cash is constrained, TrueAvail can route approved intragroup liquidity through a permissioned blockchain rail: faster finality, policy gates, signer control, and an audit receipt that comes back to the cockpit.",
            "После того как карта счетов показывает, где cash constrained, TrueAvail может направить одобренную внутригрупповую ликвидность через permissioned blockchain rail: быстрая финализация, policy gates, контроль подписантов и audit receipt, который возвращается в cockpit.",
          )}
        </p>
      </div>

      <div className={styles.blockchainGrid}>
        <div
          className={styles.splineShell}
          aria-label={t("Permissioned blockchain animation", "Анимация permissioned blockchain")}
        >
          <div className={styles.splineTopbar}>
            <span>{t("Blockchain execution layer", "Слой blockchain-исполнения")}</span>
            <strong>{hasBlockchainSplineScene ? t("Spline live", "Spline активен") : t("Scene waiting", "Сцена ожидает")}</strong>
          </div>

          {hasBlockchainSplineScene ? (
            <Spline scene={blockchainSplineScene} />
          ) : (
            <div className={styles.splineFallback} aria-label={t("Spline scene placeholder", "Запасной блок Spline-сцены")}>
              <span className={styles.chainOrbit} />
              <span className={styles.chainOrbit} />
              <span className={styles.chainOrbit} />
              <div className={styles.chainCore}>
                <strong>TrueAvail</strong>
                <em>settlement proof</em>
              </div>
              <div className={styles.chainNodes} aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>

        <div className={styles.blockchainBrief}>
          <div className={styles.blockchainBriefHeader}>
            <span>{t("Why blockchain here", "Зачем здесь blockchain")}</span>
            <strong>{t("Controlled finality, not open-network risk", "Контролируемая финализация без open-network risk")}</strong>
          </div>

          <ol className={styles.blockchainSteps}>
            {blockchainSteps.map((step) => (
              <li key={step.marker}>
                <span>{step.marker}</span>
                <div>
                  <strong>{translate(step.title)}</strong>
                  <p>{translate(step.body)}</p>
                </div>
              </li>
            ))}
          </ol>

          <dl className={styles.blockchainLedger} aria-label={t("Blockchain rail facts", "Факты blockchain rail")}>
            {blockchainLedgerRows.map(([term, value]) => (
              <div key={term}>
                <dt>{translate(term)}</dt>
                <dd>{translate(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const { t, translate } = useLanguage();
  const reducedMotion = useReducedMotion();
  const storyRef = useRef<HTMLElement>(null);
  const [mapFocusActive, setMapFocusActive] = useState(false);
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    const updateMapFocus = () => {
      const storyBounds = storyRef.current?.getBoundingClientRect();

      if (!storyBounds) {
        return;
      }

      setMapFocusActive(storyBounds.top < window.innerHeight * 0.45 && storyBounds.bottom > window.innerHeight * 0.18);
    };

    updateMapFocus();
    window.addEventListener("scroll", updateMapFocus, { passive: true });
    window.addEventListener("resize", updateMapFocus);

    return () => {
      window.removeEventListener("scroll", updateMapFocus);
      window.removeEventListener("resize", updateMapFocus);
    };
  }, []);

  return (
    <main className={styles.page} id="main-content">
      <motion.div
        className={`${styles.navShell} ${mapFocusActive ? styles.navShellHidden : ""}`}
      >
        <DemoNav mode="replay" statusText="Product landing" />
      </motion.div>
      <section className={styles.hero} aria-labelledby="landing-title">
        <motion.div
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          className={styles.identity}
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
        >
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
        </motion.div>

        <motion.aside
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          className={styles.panel}
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          transition={{ delay: 0.08, duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
          aria-label={t("Product presentation")}
        >
          <p className={styles.panelKicker}>{t("Product presentation")}</p>
          <h2>{t("Know the exact moment liquidity can be used.")}</h2>
          <p className={styles.panelIntro}>
            {t("TrueAvail is a minimal control layer for settlement-heavy businesses where a false cash view can create failed payouts, expensive emergency funding, or unmanaged concentration risk.",
              "TrueAvail — минимальный control layer для settlement-heavy бизнеса, где ложная картина cash может привести к failed payouts, дорогому emergency funding или неуправляемому concentration risk.")}
          </p>

          <AccountMap />

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
        </motion.aside>
      </section>

      <PresentationStory scrollYProgress={scrollYProgress} storyRef={storyRef} />

      <BlockchainSection />

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
