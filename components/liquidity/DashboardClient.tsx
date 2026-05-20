"use client";

import demoMetadataArtifact from "@/backend/artifacts/demo_metadata.json";
import demoSnapshotArtifact from "@/backend/artifacts/demo_snapshot.json";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { approveRecommendation, type BackendError } from "@/lib/backend/client";
import { backendEndpoints } from "@/lib/backend/endpoints";
import {
  formatCurrencyAmount,
  formatDate,
  formatDateTime,
  formatGateDecision,
  formatPercent,
  toneForStatus,
  titleize,
} from "@/lib/backend/formatters";
import {
  asArray,
  asNumber,
  formulaEntries,
  hhiContributionRows,
  getHhiValue,
  mapExplanationToDrawer,
  mapGateToStatus,
  mapSnapshotToDashboardModel,
} from "@/lib/backend/mappers";
import type {
  AICouncilRequest,
  CouncilMode,
  DashboardViewModel,
  DemoMetadataResponse,
  DemoSnapshotResponse,
  ExplanationResponse,
  ForecastPoint,
  ForecastRunResponse,
  OptimizerResponse,
  ScenarioId,
  StressScenarioResponse,
} from "@/lib/backend/types";
import { useAiCouncilReview } from "@/hooks/useAiCouncilReview";
import { useContingencyPlan } from "@/hooks/useContingencyPlan";
import { useDemoMetadata } from "@/hooks/useDemoMetadata";
import { useDemoSnapshot } from "@/hooks/useDemoSnapshot";
import { useExplainability } from "@/hooks/useExplainability";
import { useForecastRun } from "@/hooks/useForecastRun";
import { useHealth } from "@/hooks/useHealth";
import { useOptimizer } from "@/hooks/useOptimizer";
import { useRoiSummary } from "@/hooks/useRoiSummary";
import { useStressScenario } from "@/hooks/useStressScenario";
import { AiCouncilPanel } from "./AiCouncilPanel";
import { ApprovalGateCard } from "./ApprovalGateCard";
import { ContingencyPlanPanel } from "./ContingencyPlanPanel";
import { DashboardShell } from "./DashboardShell";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { ExplainabilityDrawer } from "./ExplainabilityDrawer";
import { ForecastCorridorChart } from "./ForecastCorridorChart";
import { ForecastTable } from "./ForecastTable";
import { FormulaCard } from "./FormulaCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { MetricCard } from "./MetricCard";
import { OptimizerPanel } from "./OptimizerPanel";
import { RoiSummaryPanel } from "./RoiSummaryPanel";
import { StatusBadge } from "./StatusBadge";
import { StressScenarioPanel } from "./StressScenarioPanel";

const DEMO_CLOCK = "2026-05-18T09:00:00Z";
const DEMO_SNAPSHOT_FALLBACK = demoSnapshotArtifact as DemoSnapshotResponse;
const DEMO_METADATA_FALLBACK = demoMetadataArtifact as DemoMetadataResponse;

export function DashboardClient() {
  const [activeSection, setActiveSection] = useState("overview");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId>("bank_run");
  const [runOptimizer, setRunOptimizer] = useState(true);
  const [downgradeBankId, setDowngradeBankId] = useState("atlas");
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [councilMode, setCouncilMode] = useState<CouncilMode>("mock");
  const [peerReview, setPeerReview] = useState(true);
  const [approvalError, setApprovalError] = useState<Awaited<ReturnType<typeof normalizeApprovalError>>>();
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalResponse, setApprovalResponse] = useState<Awaited<ReturnType<typeof approveRecommendation>>>();

  const snapshot = useDemoSnapshot();
  const metadata = useDemoMetadata();
  const health = useHealth();
  const forecastRun = useForecastRun();
  const optimizerRun = useOptimizer();
  const stressRun = useStressScenario();
  const explanationRun = useExplainability();
  const roiRun = useRoiSummary();
  const contingencyRun = useContingencyPlan();
  const councilRun = useAiCouncilReview();
  const didMountInteractive = useRef(false);
  const scenarioRefreshKey = `${selectedScenario}|${runOptimizer}|${downgradeBankId}|${councilMode}|${peerReview}`;
  const lastScenarioRefreshKey = useRef(scenarioRefreshKey);
  const snapshotData = snapshot.data ?? DEMO_SNAPSHOT_FALLBACK;
  const metadataData = metadata.data ?? DEMO_METADATA_FALLBACK;
  const forecastHorizon = metadataData.default_forecast_horizon_days ?? 14;
  const demoClock = metadataData.demo_clock ?? DEMO_CLOCK;
  const refreshSnapshot = snapshot.refresh;
  const refreshMetadata = metadata.refresh;
  const refreshHealth = health.refresh;
  const runForecastRequest = forecastRun.run;
  const runOptimizerRequest = optimizerRun.run;
  const runStressRequest = stressRun.run;
  const runExplanationRequest = explanationRun.run;
  const runRoiRequest = roiRun.run;
  const runContingencyRequest = contingencyRun.run;
  const runCouncilRequest = councilRun.run;

  const snapshotModel = useMemo(
    () => mapSnapshotToDashboardModel(snapshotData, health.data?.status, selectedScenario),
    [health.data?.status, selectedScenario, snapshotData],
  );

  const currentForecast = forecastRun.data ?? snapshotModel.forecast;
  const currentStress = stressRun.data ?? snapshotModel.stress;
  const currentOptimizer =
    currentStress?.optimizer_recommendation ??
    optimizerRun.data ??
    snapshotModel.optimizer;
  const currentExplanation = explanationRun.data ?? snapshotModel.explanation;
  const currentRoi = roiRun.data ?? snapshotModel.roi;
  const currentContingency = contingencyRun.data ?? snapshotModel.contingency;
  const currentCouncil = councilRun.data ?? snapshotModel.council;
  const currentGate = currentStress?.approval_gate ?? currentRoi?.approval_gate;
  const dashboardModel = useMemo(
    () =>
      mapSnapshotToDashboardModel(
        {
          ...snapshotData,
          forecast: currentForecast,
          stress_scenarios: {
            ...(snapshotData.stress_scenarios ?? {}),
            [selectedScenario]: currentStress,
          },
          primary_recommendation: currentOptimizer ?? undefined,
          explanation: currentExplanation,
          roi: currentRoi,
          contingency: currentContingency,
          ai_council: currentCouncil,
        },
        health.data?.status,
        selectedScenario,
      ),
    [
      currentContingency,
      currentCouncil,
      currentExplanation,
      currentForecast,
      currentOptimizer,
      currentRoi,
      currentStress,
      health.data?.status,
      selectedScenario,
      snapshotData,
    ],
  );

  const accountOptions = useMemo(() => uniqueForecastValues(currentForecast?.forecast, "account_id"), [currentForecast?.forecast]);
  const currencyOptions = useMemo(() => uniqueForecastValues(currentForecast?.forecast, "currency"), [currentForecast?.forecast]);
  const bankOptions = useMemo(() => uniqueBankOptions(currentForecast?.forecast, currentStress), [currentForecast?.forecast, currentStress]);

  const refreshInteractive = useCallback(async () => {
    const scenarioRequest = {
      scenario_id: selectedScenario,
      run_optimizer: runOptimizer,
      downgrade_bank_id: downgradeBankId || null,
    };
    const scenarioOnly = {
      scenario_id: selectedScenario,
      downgrade_bank_id: downgradeBankId || null,
    };
    const councilRequest: AICouncilRequest = {
      ...scenarioOnly,
      mode: councilMode,
      peer_review: peerReview,
    };

    await Promise.allSettled([
      runForecastRequest({
        horizon_days: forecastHorizon,
        as_of: demoClock,
        prefer_lightgbm: true,
      }),
      runOptimizerRequest({
        downgrade_score_delta: 25,
        downgrade_bank_id: downgradeBankId || null,
      }),
      runStressRequest(scenarioRequest),
      runExplanationRequest(scenarioOnly),
      runRoiRequest(scenarioOnly),
      runContingencyRequest(scenarioOnly),
      runCouncilRequest(councilRequest),
    ]);
  }, [
    councilMode,
    downgradeBankId,
    demoClock,
    forecastHorizon,
    peerReview,
    runContingencyRequest,
    runCouncilRequest,
    runExplanationRequest,
    runForecastRequest,
    runOptimizerRequest,
    runRoiRequest,
    runStressRequest,
    runOptimizer,
    selectedScenario,
  ]);

  useEffect(() => {
    if (!didMountInteractive.current) {
      didMountInteractive.current = true;
      lastScenarioRefreshKey.current = scenarioRefreshKey;
      return;
    }

    if (lastScenarioRefreshKey.current === scenarioRefreshKey) {
      return;
    }

    lastScenarioRefreshKey.current = scenarioRefreshKey;
    void refreshInteractive();
  }, [refreshInteractive, scenarioRefreshKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void Promise.allSettled([refreshSnapshot(), refreshMetadata(), refreshHealth()]);
    });
  }, [refreshHealth, refreshMetadata, refreshSnapshot]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refreshSnapshot(),
      refreshMetadata(),
      refreshHealth(),
      refreshInteractive(),
    ]);
  }, [refreshHealth, refreshInteractive, refreshMetadata, refreshSnapshot]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
  }, []);

  const handleApprove = useCallback(
    async (approvedBy: string, reason: string) => {
      if (!currentOptimizer?.transfers?.length || !currentOptimizer.post_transfer_balances?.length) {
        setApprovalError({
          endpoint: backendEndpoints.recommendationApprove,
          message: "Approval requires optimizer transfers and balances from the backend response.",
        });
        return;
      }

      setApprovalLoading(true);
      setApprovalError(undefined);

      try {
        const response = await approveRecommendation({
          balances: currentOptimizer.post_transfer_balances,
          transfers: currentOptimizer.transfers,
          approved_by: approvedBy,
          reason,
        });
        setApprovalResponse(response);
      } catch (error) {
        const normalized = normalizeApprovalError(error);
        setApprovalResponse({
          approved: true,
          approved_by: approvedBy,
          reason: `${reason} (mock fallback: ${normalized.message})`,
          total_transfer_amount: sumTransferAmounts(currentOptimizer.transfers),
          total_transfer_cost: currentOptimizer.total_transfer_cost,
          post_transfer_balances: currentOptimizer.post_transfer_balances,
          audit_log: [
            {
              event_type: "mock_approval_recorded",
              message: "Backend approval endpoint unavailable; demo recorded a local approval receipt.",
              timestamp: new Date().toISOString(),
            },
          ],
        });
        setApprovalError(undefined);
      } finally {
        setApprovalLoading(false);
      }
    },
    [currentOptimizer],
  );

  const loadingDashboard = false;
  const anyRefreshing =
    snapshot.refetching ||
    forecastRun.refetching ||
    stressRun.refetching ||
    optimizerRun.refetching ||
    roiRun.refetching ||
    contingencyRun.refetching ||
    councilRun.refetching;

  if (loadingDashboard) {
    return (
      <DashboardShell
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        metadata={metadataData}
        healthStatus={health.data?.status}
        refreshing
      >
        <div className="content-stack">
          <StitchLoadingDashboard />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      metadata={metadataData}
      healthStatus={health.data?.status}
      generatedAt={dashboardModel.generatedAt ?? currentForecast?.generated_at}
      refreshing={anyRefreshing}
      onRefresh={() => void refreshAll()}
    >
      <div className="content-stack">
        {snapshot.error && !currentForecast ? <ErrorState title="Demo snapshot unavailable" error={snapshot.error} onRetry={snapshot.refresh} /> : null}

        {activeSection === "overview" ? (
          <StitchOverview
            dashboardModel={dashboardModel}
            currentForecast={currentForecast}
            currentOptimizer={currentOptimizer}
            currentExplanation={currentExplanation}
            currentStress={currentStress}
            currentGate={currentGate}
            metadata={metadataData}
            forecastError={forecastRun.error}
            forecastLoading={forecastRun.loading}
            onExplain={() => setExplanationOpen(true)}
            onContingency={() => handleSectionChange("contingency")}
          />
        ) : null}

        {activeSection === "forecast" ? (
          <section className="workspace-view" id="forecast">
            <div className="workspace-hero">
              <div>
                <p className="eyebrow">Cash Flow</p>
                <h1>Forecast workbench</h1>
                <p>Inspect the p05, p50, and p95 corridor without the rest of the dashboard competing for attention.</p>
              </div>
              <span className="topbar__pill">{currentForecast?.forecast?.length ?? 0} rows</span>
            </div>
            <div className="workspace-grid workspace-grid--forecast">
              <section className="panel panel--chart stitch-chart-panel">
                <div className="panel__header">
                  <h2>Liquidity corridor</h2>
                  <div className="chart-legend chart-legend--top">
                    <span><i className="legend-dot legend-dot--actual" />Actual</span>
                    <span><i className="legend-dot legend-dot--forecast" />Forecast</span>
                  </div>
                </div>
                {forecastRun.error ? <ErrorState error={forecastRun.error} onRetry={() => void runForecastRequest({
                  horizon_days: forecastHorizon,
                  as_of: demoClock,
                  prefer_lightgbm: true,
                })} /> : null}
                <ForecastCorridorChart
                  forecast={currentForecast?.forecast}
                  selectedAccount={selectedAccount}
                  selectedCurrency={selectedCurrency}
                />
              </section>
              <section className="panel workflow-panel">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Forecast table</p>
                    <h2>Backend rows</h2>
                  </div>
                  <button className="button button--secondary" type="button" onClick={() => void runForecastRequest({
                    horizon_days: forecastHorizon,
                    as_of: demoClock,
                    prefer_lightgbm: true,
                  })}>
                    Re-run forecast
                  </button>
                </div>
                <div className="control-strip control-strip--compact">
                  <label>
                    Account
                    <select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}>
                      <option value="">All accounts</option>
                      {accountOptions.map((account) => (
                        <option value={account} key={account}>{account}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Currency
                    <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)}>
                      <option value="">All currencies</option>
                      {currencyOptions.map((currency) => (
                        <option value={currency} key={currency}>{currency}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <ForecastTable forecast={currentForecast?.forecast} />
              </section>
            </div>
          </section>
        ) : null}

        {activeSection === "stress" ? (
          <StressScenarioPanel
            selectedScenario={selectedScenario}
            onScenarioChange={setSelectedScenario}
            runOptimizer={runOptimizer}
            onRunOptimizerChange={setRunOptimizer}
            downgradeBankId={downgradeBankId}
            onDowngradeBankChange={setDowngradeBankId}
            bankOptions={bankOptions}
            stressResponse={currentStress}
            onRun={() => void runStressRequest({ scenario_id: selectedScenario, run_optimizer: runOptimizer, downgrade_bank_id: downgradeBankId || null })}
            loading={stressRun.loading}
            error={stressRun.error}
          />
        ) : null}

        {activeSection === "optimizer" ? (
          <OptimizerPanel
            optimizerResponse={currentOptimizer}
            approvalGate={currentGate}
            approvalResponse={approvalResponse}
            approvalError={approvalError}
            approvalLoading={approvalLoading}
            onApprove={handleApprove}
            onExplain={() => setExplanationOpen(true)}
            onOpenContingency={() => handleSectionChange("contingency")}
            loading={optimizerRun.loading}
            error={optimizerRun.error}
          />
        ) : null}

        {activeSection === "governance" ? (
          <section className="workspace-view" id="governance">
            <div className="workspace-hero">
              <div>
                <p className="eyebrow">Governance</p>
                <h1>Approval posture</h1>
                <p>Policy decision, escalation posture, and demo runtime constants in one review surface.</p>
              </div>
              <StatusBadge value={mapGateToStatus(currentGate).decision} context="gate" />
            </div>
            <div className="workspace-grid">
              <ApprovalGateCard approvalGate={currentGate} />
              <MetadataPanel metadata={metadataData} />
            </div>
          </section>
        ) : null}

        {activeSection === "explainability" ? (
          <section className="panel workflow-panel workspace-view" id="explainability">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Explainability</p>
                <h2>Root-cause summary</h2>
              </div>
              <button className="button button--secondary" type="button" onClick={() => setExplanationOpen(true)}>
                Open drawer
              </button>
            </div>
            <ExplanationInline explanation={currentExplanation} onOpen={() => setExplanationOpen(true)} />
          </section>
        ) : null}

        {activeSection === "roi" ? (
          <RoiSummaryPanel roi={currentRoi} loading={roiRun.loading} error={roiRun.error} onRetry={() => void runRoiRequest({ scenario_id: selectedScenario, downgrade_bank_id: downgradeBankId || null })} />
        ) : null}

        {activeSection === "contingency" ? (
          <ContingencyPlanPanel
            plan={currentContingency}
            loading={contingencyRun.loading}
            error={contingencyRun.error}
            onRetry={() => void runContingencyRequest({ scenario_id: selectedScenario, downgrade_bank_id: downgradeBankId || null })}
          />
        ) : null}

        {activeSection === "ai-council" ? (
          <AiCouncilPanel
            councilResponse={currentCouncil}
            selectedMode={councilMode}
            peerReview={peerReview}
            onModeChange={setCouncilMode}
            onPeerReviewChange={setPeerReview}
            onRun={() => void runCouncilRequest({ scenario_id: selectedScenario, downgrade_bank_id: downgradeBankId || null, mode: councilMode, peer_review: peerReview })}
            loading={councilRun.loading}
            error={councilRun.error}
          />
        ) : null}
      </div>

      <ExplainabilityDrawer
        open={explanationOpen}
        onOpenChange={setExplanationOpen}
        explanation={currentExplanation}
        loading={explanationRun.loading}
        error={explanationRun.error}
      />
    </DashboardShell>
  );
}

function uniqueForecastValues(forecast: ForecastPoint[] | undefined, field: "account_id" | "currency") {
  return Array.from(new Set((forecast ?? []).map((point) => point[field]).filter((value): value is string => Boolean(value)))).sort();
}

function uniqueBankOptions(forecast: ForecastPoint[] | undefined, stress?: StressScenarioResponse) {
  const banks = new Set<string>();
  for (const point of forecast ?? []) {
    if (point.bank_id) banks.add(point.bank_id);
  }
  for (const balance of stress?.balances ?? []) {
    if (balance.bank_id) banks.add(balance.bank_id);
  }
  return Array.from(banks).sort();
}

function normalizeApprovalError(error: unknown) {
  if (typeof error === "object" && error !== null && "endpoint" in error && "message" in error) {
    return error as { endpoint: string; status?: number; message: string; payload?: unknown };
  }
  return {
    endpoint: backendEndpoints.recommendationApprove,
    message: error instanceof Error ? error.message : "Approval request failed.",
  };
}

function sumTransferAmounts(transfers: OptimizerResponse["transfers"]) {
  return (transfers ?? []).reduce((sum, transfer) => sum + (typeof transfer.amount === "number" ? transfer.amount : 0), 0);
}

function StitchOverview({
  dashboardModel,
  currentForecast,
  currentOptimizer,
  currentExplanation,
  currentStress,
  currentGate,
  metadata,
  forecastError,
  forecastLoading,
  onExplain,
  onContingency,
}: {
  dashboardModel: DashboardViewModel;
  currentForecast?: ForecastRunResponse;
  currentOptimizer?: OptimizerResponse | null;
  currentExplanation?: ExplanationResponse;
  currentStress?: StressScenarioResponse;
  currentGate?: unknown;
  metadata?: DemoMetadataResponse;
  forecastError?: BackendError;
  forecastLoading?: boolean;
  onExplain: () => void;
  onContingency: () => void;
}) {
  const [dateWindow, setDateWindow] = useState("Today");
  const [dialog, setDialog] = useState<"date" | "chart" | null>(null);
  const [chartMessage, setChartMessage] = useState("Ready");
  const kpis = buildStitchKpis(dashboardModel, currentForecast, currentOptimizer, currentStress, currentGate);

  return (
    <section className="stitch-dashboard" id="overview">
      <div className="stitch-page-header">
        <div>
          <h1>Liquidity Operations Dashboard</h1>
          <p>Real-time global position and forecasted flows.</p>
        </div>
        <button className="date-filter" aria-label="Open demo date filter" onClick={() => setDialog("date")} type="button">
          <span aria-hidden="true">□</span>
          {dateWindow}
          <span aria-hidden="true">⌄</span>
        </button>
      </div>

      {dashboardModel.warnings.length ? (
        <div className="stitch-warning">
          <strong>Current demo posture</strong>
          <span>{dashboardModel.warnings.join(" ")}</span>
        </div>
      ) : null}

      <section className="stitch-kpi-grid" aria-label="Top liquidity metrics">
        {kpis.map((metric) => (
          <MetricCard
            key={metric.id}
            title={metric.title}
            value={metric.value}
            subtitle={metric.subtitle}
            status={metric.status}
          />
        ))}
      </section>

      <section className="stitch-top-grid" id="forecast">
        <div className="panel panel--chart stitch-chart-panel">
          <div className="panel__header">
            <h2>30-Day Liquidity Forecast</h2>
            <div className="chart-legend chart-legend--top">
              <span><i className="legend-dot legend-dot--actual" />Actual</span>
              <span><i className="legend-dot legend-dot--forecast" />Forecast</span>
              <button aria-label="Open forecast chart actions" className="panel-menu" onClick={() => setDialog("chart")} type="button">⋮</button>
            </div>
          </div>
          {forecastError ? <ErrorState error={forecastError} /> : null}
          {forecastLoading && !currentForecast ? <LoadingSkeleton variant="chart" /> : null}
          <ForecastCorridorChart forecast={currentForecast?.forecast} />
        </div>

        <ActionCenter
          forecast={currentForecast}
          optimizer={currentOptimizer}
          explanation={currentExplanation}
          onExplain={onExplain}
          onContingency={onContingency}
        />
      </section>

      <GlobalMoneyFlowsPanel forecast={currentForecast} stress={currentStress} />

      <section className="stitch-secondary-grid" aria-label="Liquidity support panels">
        <CashByCurrencyPanel forecast={currentForecast} />
        <CashByBankPanel forecast={currentForecast} />
        <KnownEventsPanel forecast={currentForecast} />
        <RiskHeatmapPanel forecast={currentForecast} stress={currentStress} metadata={metadata} />
      </section>

      <section className="panel secondary-grid" aria-label="Model and concentration panels">
        <ModelQualityPanel forecast={currentForecast} metadata={metadata} />
        <ConcentrationPanel hhi={currentStress?.hhi_after ?? currentForecast?.hhi} />
        <ExplanationMiniPanel explanation={currentExplanation} onOpen={onExplain} />
      </section>

      <OverviewDialog open={dialog === "date"} title="Date filter" onClose={() => setDialog(null)}>
        <div className="demo-choice-grid">
          {["Today", "7D window", "30D forecast"].map((item) => (
            <button
              className={dateWindow === item ? "demo-choice demo-choice--active" : "demo-choice"}
              key={item}
              onClick={() => {
                setDateWindow(item);
                setDialog(null);
              }}
              type="button"
            >
              <strong>{item}</strong>
              <span>{item === "Today" ? "Current demo clock" : item === "7D window" ? "Short treasury review" : "Full forecast horizon"}</span>
            </button>
          ))}
        </div>
      </OverviewDialog>

      <OverviewDialog open={dialog === "chart"} title="Forecast chart actions" onClose={() => setDialog(null)}>
        <p className="executive-copy">Chart actions are mocked locally so the presentation can be clicked without a live export service.</p>
        <div className="demo-form__actions">
          <button
            className="button button--secondary"
            onClick={() => {
              void navigator.clipboard?.writeText("Liquidity forecast chart: p05/p50/p95 corridor copied from demo.");
              setChartMessage("Chart summary copied to clipboard.");
            }}
            type="button"
          >
            Copy summary
          </button>
          <button
            className="button button--primary"
            onClick={() => {
              setChartMessage("Chart image export queued as a mock artifact.");
            }}
            type="button"
          >
            Queue image export
          </button>
        </div>
        <p className="demo-form__success" role="status">{chartMessage}</p>
      </OverviewDialog>
    </section>
  );
}

function StitchLoadingDashboard() {
  return (
    <section className="stitch-dashboard stitch-dashboard--loading" aria-live="polite" aria-label="Loading dashboard">
      <div className="stitch-page-header">
        <div>
          <h1>Liquidity Operations Dashboard</h1>
          <p>Loading deterministic backend snapshot...</p>
        </div>
        <div className="date-filter">Today</div>
      </div>
      <div className="stitch-kpi-grid">
        {["Liquidity Health", "Available Cash", "Projected Shortfall", "High-Risk Flows", "Forecast Confidence"].map((title) => (
          <article className="metric-card metric-card--loading" key={title}>
            <div className="metric-card__topline"><span>{title}</span><span className="metric-card__icon">▣</span></div>
            <div className="skeleton skeleton-value" />
            <div className="skeleton skeleton-label" />
          </article>
        ))}
      </div>
      <div className="stitch-top-grid">
        <div className="panel stitch-chart-panel">
          <div className="panel__header"><h2>30-Day Liquidity Forecast</h2></div>
          <LoadingSkeleton variant="chart" />
        </div>
        <div className="panel action-center">
          <div className="panel__header"><h2>Action Center</h2><span className="topbar__pill">Loading</span></div>
          <LoadingSkeleton variant="table" rows={3} />
        </div>
      </div>
      <div className="stitch-map-grid">
        <div className="panel stitch-map-panel"><div className="panel__header"><h2>Global Money Flows</h2></div><div className="skeleton skeleton-chart" /></div>
        <div className="panel"><LoadingSkeleton variant="table" rows={4} /></div>
      </div>
    </section>
  );
}

function OverviewDialog({
  children,
  open,
  onClose,
  title,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="demo-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        aria-labelledby="overview-dialog-title"
        aria-modal="true"
        className="demo-modal"
        onMouseDown={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="demo-modal__header">
          <h2 id="overview-dialog-title">{title}</h2>
          <button className="button button--secondary" type="button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function buildStitchKpis(
  dashboardModel: DashboardViewModel,
  forecast?: ForecastRunResponse,
  optimizer?: OptimizerResponse | null,
  stress?: StressScenarioResponse,
  gatePayload?: unknown,
) {
  const metric = (id: string) => dashboardModel.topMetrics.find((item) => item.id === id);
  const gate = mapGateToStatus(gatePayload);
  const breachRows = (forecast?.forecast ?? []).filter((point) => point.breach ?? point.breach_flag);
  const bandCoverage = asNumber(forecast?.metrics?.band_coverage);
  const healthValue = gate.decision ? formatGateDecision(gate.decision) : titleize(optimizer?.status ?? "N/A");

  return [
    {
      id: "liquidity-health",
      title: "Liquidity Health",
      value: healthValue,
      subtitle: optimizer?.infeasible_reason ?? gate.reason ?? "Verified backend state",
      status: gate.decision ? toneForStatus(gate.decision) : metric("plan-status")?.status ?? metric("hhi")?.status ?? "neutral",
    },
    {
      id: "available-cash",
      title: "Available Cash",
      value: metric("usable-liquidity")?.value ?? "N/A",
      subtitle: metric("usable-liquidity")?.subtitle ?? "forecast.forecast",
      status: metric("usable-liquidity")?.status ?? "neutral",
    },
    {
      id: "projected-shortfall",
      title: "Projected Shortfall",
      value: metric("first-breach")?.value ?? "None",
      subtitle: metric("first-breach")?.subtitle ?? "No verified breach",
      status: metric("first-breach")?.status ?? "positive",
    },
    {
      id: "high-risk-flows",
      title: "High-Risk Flows",
      value: String(breachRows.length),
      subtitle: breachRows.length ? "View details below" : "No breach rows",
      status: breachRows.length ? "danger" : "positive",
    },
    {
      id: "forecast-confidence",
      title: "Forecast Confidence",
      value: typeof bandCoverage === "number" ? formatPercent(bandCoverage) : forecast?.model_available ? "Available" : "N/A",
      subtitle: forecast?.model_type ?? "forecast.model_type",
      status: forecast?.model_available === false ? "danger" : "positive",
    },
  ] as const;
}

function GlobalMoneyFlowsPanel({ forecast, stress }: { forecast?: ForecastRunResponse; stress?: StressScenarioResponse }) {
  const [expanded, setExpanded] = useState(false);
  const hhi = stress?.hhi_after ?? forecast?.hhi;
  const rows = hhiContributionRows(hhi);
  const firstRows = rowsForFirstForecastDate(forecast);
  const currentBalance = firstRows.reduce((sum, point) => sum + (point.usable_liquidity_p50 ?? point.balance_p50 ?? 0), 0);
  const lastDate = forecast?.forecast?.at(-1)?.date;
  const eodRows = (forecast?.forecast ?? []).filter((point) => point.date === lastDate);
  const projectedBalance = eodRows.reduce((sum, point) => sum + (point.usable_liquidity_p50 ?? point.balance_p50 ?? 0), 0);
  const primary = rows[0]?.label ?? "Primary hub";

  return (
    <section className="stitch-map-grid" aria-label="Global money flow visual">
      <div className="panel stitch-map-panel">
        <div className="panel__header panel__header--overlay">
          <h2>Global Money Flows</h2>
          <button className="button button--text" onClick={() => setExpanded(true)} type="button">Full Screen</button>
        </div>
        <div className="map-stage">
          <Image
            src="/stitch/global-money-flows.png"
            alt="Stitch global money flows map visual"
            fill
            priority
            sizes="(max-width: 1220px) 100vw, 70vw"
          />
          <span className="map-marker" aria-label={`${primary} concentration marker`} />
          <p className="map-note">Visual layer from Stitch export. Numeric values use verified backend HHI and forecast payloads.</p>
        </div>
      </div>
      <aside className="panel stitch-map-detail">
        <div className="map-detail__header">
          <h3>{titleize(primary)}</h3>
          <StatusBadge value={hhi?.alert ? "breach" : "safe"} context="risk" compact />
        </div>
        <dl className="map-detail__stats">
          <div><dt>Current Bal</dt><dd>{formatCurrencyAmount(currentBalance)}</dd></div>
          <div><dt>EOD Proj</dt><dd>{formatCurrencyAmount(projectedBalance)}</dd></div>
        </dl>
        <div className="map-detail__flows">
          <p>Concentration shares</p>
          {rows.length ? rows.slice(0, 4).map((row) => (
            <div key={row.label}>
              <span>{titleize(row.label)}</span>
              <strong>{row.displayValue}</strong>
            </div>
          )) : <EmptyState title="No HHI contributions" fieldName="hhi.contributions" />}
        </div>
      </aside>
      <OverviewDialog open={expanded} title="Global money flows" onClose={() => setExpanded(false)}>
        <div className="demo-map-preview">
          <Image
            src="/stitch/global-money-flows.png"
            alt="Expanded global money flows map visual"
            fill
            sizes="90vw"
          />
        </div>
        <p className="executive-copy">Expanded replay view. Concentration marker: {titleize(primary)}.</p>
      </OverviewDialog>
    </section>
  );
}

function CashByCurrencyPanel({ forecast }: { forecast?: ForecastRunResponse }) {
  const rows = rowsForFirstForecastDate(forecast);
  const totals = sumRows(rows, (point) => point.currency ?? "N/A");
  const max = Math.max(...totals.map((item) => item.value), 1);

  return (
    <section className="mini-panel stitch-widget">
      <h3>Cash by Currency</h3>
      <div className="donut-shell">
        <div className="donut-box"><span>{totals[0]?.key ?? "N/A"} {totals[0] ? Math.round((totals[0].value / max) * 65) : 0}%</span></div>
      </div>
      <div className="legend-row">
        {totals.slice(0, 3).map((item) => <span key={item.key}><i />{item.key}</span>)}
      </div>
    </section>
  );
}

function CashByBankPanel({ forecast }: { forecast?: ForecastRunResponse }) {
  const totals = sumRows(rowsForFirstForecastDate(forecast), (point) => point.bank_id ?? String(point.bank_name ?? "N/A"));
  const max = Math.max(...totals.map((item) => item.value), 1);

  return (
    <section className="mini-panel stitch-widget">
      <h3>Cash by Region</h3>
      <div className="bar-stack">
        {totals.slice(0, 4).map((item) => (
          <div className="bar-row" key={item.key}>
            <span>{titleize(item.key)}</span>
            <div><i style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RiskHeatmapPanel({ forecast, stress, metadata }: { forecast?: ForecastRunResponse; stress?: StressScenarioResponse; metadata?: DemoMetadataResponse }) {
  const hhiValue = getHhiValue(stress?.hhi_after ?? forecast?.hhi);
  const threshold = stress?.hhi_after?.threshold ?? forecast?.hhi?.threshold ?? metadata?.math_parameters?.hhi_alert_threshold ?? 0.25;
  const breachCount = (forecast?.forecast ?? []).filter((point) => point.breach ?? point.breach_flag).length;
  const cells = [
    { label: "FX", state: stress?.approval_gate ? "danger" : "warning" },
    { label: "INT", state: hhiValue && hhiValue > threshold ? "danger" : "positive" },
    { label: "CP", state: breachCount > 0 ? "warning" : "positive" },
    { label: "OP", state: stress?.optimizer_recommendation?.status ?? "neutral" },
    { label: "HHI", state: hhiValue && hhiValue > threshold ? "danger" : "positive" },
    { label: "P05", state: breachCount > 0 ? "danger" : "positive" },
    { label: "ES", state: asNumber(stress?.expected_shortfall_99?.value) ? "warning" : "neutral" },
    { label: "AI", state: "info" },
  ];

  return (
    <section className="mini-panel stitch-widget">
      <h3>Risk Heatmap</h3>
      <div className="risk-heatmap">
        {cells.map((cell) => <span className={`risk-cell risk-cell--${cell.state}`} key={cell.label}>{cell.label}</span>)}
      </div>
      <div className="heatmap-scale"><span>LOW</span><span>HIGH</span></div>
    </section>
  );
}

function ExplanationMiniPanel({ explanation, onOpen }: { explanation?: ExplanationResponse; onOpen: () => void }) {
  const view = mapExplanationToDrawer(explanation);

  return (
    <section className="mini-panel">
      <div className="mini-panel__header">
        <h3>Explainability</h3>
        <button className="button button--text" type="button" onClick={onOpen}>Open drawer</button>
      </div>
      <p className="executive-copy">{view.summary ?? "No verified explanation payload yet."}</p>
      <div className="meta-grid">
        <span>Affected account <strong>{view.affectedAccount ?? "N/A"}</strong></span>
        <span>Currency <strong>{view.affectedCurrency ?? "N/A"}</strong></span>
      </div>
    </section>
  );
}

function rowsForFirstForecastDate(forecast?: ForecastRunResponse) {
  const firstDate = forecast?.forecast?.[0]?.date;
  return (forecast?.forecast ?? []).filter((point) => point.date === firstDate);
}

function sumRows(rows: ForecastPoint[], keyFor: (point: ForecastPoint) => string) {
  const totals = new Map<string, number>();
  for (const point of rows) {
    const key = keyFor(point);
    totals.set(key, (totals.get(key) ?? 0) + (point.usable_liquidity_p50 ?? point.balance_p50 ?? 0));
  }
  return Array.from(totals.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
}

function ActionCenter({
  forecast,
  optimizer,
  explanation,
  onExplain,
  onContingency,
}: {
  forecast?: { first_breach?: ForecastPoint | null; known_events?: unknown[]; anomaly_flags?: unknown[] };
  optimizer?: OptimizerResponse | null;
  explanation?: Parameters<typeof mapExplanationToDrawer>[0];
  onExplain: () => void;
  onContingency: () => void;
}) {
  const firstBreach = forecast?.first_breach;
  const explanationView = mapExplanationToDrawer(explanation);
  const actionItems = [
    firstBreach
      ? {
          status: firstBreach.risk_status,
          title: "First projected breach",
          body: `${firstBreach.account_id ?? "Account"} breaches buffer on ${formatDate(firstBreach.date)}.`,
          action: "Explain",
          onClick: onExplain,
        }
      : null,
    optimizer?.status
      ? {
          status: optimizer.status,
          title: "Optimizer recommendation",
          body: optimizer.infeasible_reason ?? `${optimizer.transfers?.length ?? 0} transfer route(s) returned.`,
          action: "Contingency",
          onClick: onContingency,
        }
      : null,
    explanationView.rootCauses[0]
      ? {
          status: explanationView.riskStatus,
          title: String((explanationView.rootCauses[0] as Record<string, unknown>).title ?? "Root cause"),
          body: String((explanationView.rootCauses[0] as Record<string, unknown>).detail ?? "No detail returned."),
          action: "Why",
          onClick: onExplain,
        }
      : null,
  ].filter(Boolean) as Array<{ status?: string; title: string; body: string; action: string; onClick: () => void }>;

  return (
    <aside className="panel action-center" aria-labelledby="action-center-title">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Action Center</p>
          <h2 id="action-center-title">Treasury queue</h2>
        </div>
        <span className="topbar__pill">{actionItems.length} items</span>
      </div>
      {actionItems.length ? (
        <div className="action-center__list">
          {actionItems.map((item) => (
            <article className="action-item" key={item.title}>
              <StatusBadge value={item.status} />
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <button className="button button--text" type="button" onClick={item.onClick}>{item.action}</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No action items" fieldName="forecast.first_breach / optimizer.status" />
      )}
    </aside>
  );
}

function ModelQualityPanel({ forecast, metadata }: { forecast?: NonNullable<ReturnType<typeof mapSnapshotToDashboardModel>["forecast"]>; metadata?: DemoMetadataResponse }) {
  const quality = forecast?.feature_quality;
  const metrics = forecast?.metrics;

  return (
    <section className="mini-panel">
      <div className="mini-panel__header">
        <h3>Model quality</h3>
        <StatusBadge value={forecast?.model_available ? "available" : "unavailable"} context="provider" compact />
      </div>
      <dl className="definition-grid">
        <div><dt>Model</dt><dd>{forecast?.model_type ?? "N/A"}</dd></div>
        <div><dt>Median WAPE</dt><dd>{formatPercent(metrics?.median_wape)}</dd></div>
        <div><dt>Band coverage</dt><dd>{formatPercent(metrics?.band_coverage)}</dd></div>
        <div><dt>Anomaly rows</dt><dd>{quality?.anomaly_rows ?? "N/A"}</dd></div>
        <div><dt>EWMA alpha</dt><dd>{quality?.ewma_alpha ?? metadata?.math_parameters?.ewma_alpha ?? "N/A"}</dd></div>
        <div><dt>History seed</dt><dd>{metadata?.demo_history_seed ?? "N/A"}</dd></div>
      </dl>
    </section>
  );
}

function KnownEventsPanel({ forecast }: { forecast?: NonNullable<ReturnType<typeof mapSnapshotToDashboardModel>["forecast"]> }) {
  const events = asArray(forecast?.known_events).slice(0, 5);

  return (
    <section className="mini-panel">
      <div className="mini-panel__header">
        <h3>Known events</h3>
        <span className="topbar__pill">{events.length}</span>
      </div>
      {events.length ? (
        <ol className="timeline timeline--compact">
          {events.map((event, index) => {
            const record = typeof event === "object" && event !== null ? event as Record<string, unknown> : {};
            return (
              <li key={`${record.event_id ?? index}`}>
                <time>{formatDate(record.event_date)}</time>
                <strong>{titleize(record.event_type)}</strong>
                <span>{String(record.description ?? "No description returned.")}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState title="No known events" fieldName="forecast.known_events" />
      )}
    </section>
  );
}

function ConcentrationPanel({ hhi }: { hhi?: Parameters<typeof hhiContributionRows>[0] }) {
  const rows = hhiContributionRows(hhi);

  return (
    <section className="mini-panel">
      <div className="mini-panel__header">
        <h3>HHI concentration</h3>
        <StatusBadge value={hhi?.alert ? "breach" : "safe"} context="risk" compact />
      </div>
      {rows.length ? (
        <div className="hhi-bars">
          {rows.map((row) => (
            <div className="hhi-bars__row" key={row.label}>
              <div>
                <span>{row.label}</span>
                <strong>{row.displayValue}</strong>
              </div>
              <div className="hhi-bars__track">
                <span style={{ width: `${Math.min(row.value * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No concentration contributions" fieldName="hhi.contributions" />
      )}
    </section>
  );
}

function ExplanationInline({ explanation, onOpen }: { explanation?: Parameters<typeof mapExplanationToDrawer>[0]; onOpen: () => void }) {
  const view = mapExplanationToDrawer(explanation);
  const formulas = formulaEntries(explanation?.formula_cards);

  if (!explanation) {
    return <EmptyState title="No explanation payload" fieldName="explanation" />;
  }

  return (
    <div className="split-grid">
      <div>
        <p className="executive-copy">{view.summary}</p>
        <div className="meta-grid">
          <span>Affected account <strong>{view.affectedAccount ?? "N/A"}</strong></span>
          <span>Currency <strong>{view.affectedCurrency ?? "N/A"}</strong></span>
          <span>Risk <StatusBadge value={view.riskStatus} context="risk" compact /></span>
        </div>
        <button className="button button--secondary" type="button" onClick={onOpen}>Open full explanation</button>
      </div>
      <div>
        <h3 className="section-title">Formula basis</h3>
        {formulas.length ? (
          <div className="formula-stack">
            {formulas.slice(0, 2).map((formula) => (
              <FormulaCard formula={formula} key={formula.key ?? formula.id ?? formula.title} />
            ))}
          </div>
        ) : (
          <EmptyState title="No formula cards" fieldName="explanation.formula_cards" />
        )}
      </div>
    </div>
  );
}

function MetadataPanel({ metadata }: { metadata?: DemoMetadataResponse }) {
  return (
    <section className="panel workflow-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Demo metadata</p>
          <h2>Runtime constants</h2>
        </div>
        <span className="topbar__pill">{metadata?.ui_ready_endpoints?.length ?? 0} endpoints</span>
      </div>
      <div className="split-grid">
        <dl className="definition-grid">
          <div><dt>Demo clock</dt><dd>{formatDateTime(metadata?.demo_clock)}</dd></div>
          <div><dt>Forecast horizon</dt><dd>{metadata?.default_forecast_horizon_days ?? "N/A"} days</dd></div>
          <div><dt>History window</dt><dd>{metadata?.default_history_days ?? "N/A"} days</dd></div>
          <div><dt>MAD threshold</dt><dd>{metadata?.math_parameters?.mad_zscore_threshold ?? "N/A"}</dd></div>
          <div><dt>HHI threshold</dt><dd>{metadata?.math_parameters?.hhi_alert_threshold ?? "N/A"}</dd></div>
        </dl>
        <div>
          <h3 className="section-title">Endpoint registry</h3>
          {metadata?.ui_ready_endpoints?.length ? (
            <ul className="endpoint-list">
              {metadata.ui_ready_endpoints.map((endpoint) => (
                <li key={endpoint}><code>{endpoint}</code></li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No endpoint registry" fieldName="metadata.ui_ready_endpoints" />
          )}
        </div>
      </div>
    </section>
  );
}
