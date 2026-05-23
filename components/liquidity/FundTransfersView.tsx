"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import { formatCurrencyAmount } from "@/lib/backend/formatters";
import {
  blockchainRoutes,
  defaultRequirements,
  defaultTransferIntent,
  toTransferAccount,
  swiftRoutes,
  transferAccounts,
} from "@/lib/transfers/transfer-rail-fixtures";
import type { TreasuryAccount } from "@/lib/treasury-ledger";
import type {
  BlockchainTransferReceipt,
  PolicyCheck,
  SwiftCommandReceipt,
  TransferCurrency,
  TransferIntent,
  TransferRail,
} from "@/lib/transfers/transfer-rail-types";

type TransferStage = 0 | 1 | 2 | 3 | 4;
type RequestState = "idle" | "submitting" | "ready" | "error";
type TransferIntentPatch = Partial<Omit<TransferIntent, "requirements">> & {
  requirements?: Partial<TransferIntent["requirements"]>;
};

const transactionSteps = [
  {
    label: "KYB gate",
    ruLabel: "KYB gate",
    detail: "same company allowlist",
    ruDetail: "allowlist одной группы",
  },
  {
    label: "Encrypted memo",
    ruLabel: "Encrypted memo",
    detail: "invoice hidden from market",
    ruDetail: "инвойс скрыт от рынка",
  },
  {
    label: "Smart contract",
    ruLabel: "Смарт-контракт",
    detail: "policy and signer quorum",
    ruDetail: "policy и quorum",
  },
  {
    label: "Finality",
    ruLabel: "Finality",
    detail: "receipt for audit",
    ruDetail: "receipt для аудита",
  },
];

const stageCopy: Record<TransferStage, { status: string; ruStatus: string; chip: string; ruChip: string }> = {
  0: {
    status: "Agent: waiting for rail selection and transfer details.",
    ruStatus: "Агент: ожидаю выбор rail и параметры перевода.",
    chip: "idle",
    ruChip: "ожидание",
  },
  1: {
    status: "Agent: validating KYB, same-company policy, and signer requirements.",
    ruStatus: "Агент: проверяю KYB, same-company policy и требования подписантов.",
    chip: "KYB",
    ruChip: "KYB",
  },
  2: {
    status: "Agent: generating invoice and encrypted regulator memo.",
    ruStatus: "Агент: генерирую invoice и encrypted memo для регулятора.",
    chip: "privacy",
    ruChip: "privacy",
  },
  3: {
    status: "Agent: preparing CorporateLiquidity.transferLiquidity call.",
    ruStatus: "Агент: готовлю вызов CorporateLiquidity.transferLiquidity.",
    chip: "contract",
    ruChip: "contract",
  },
  4: {
    status: "Transfer finalized. Compliance receipt is ready.",
    ruStatus: "Перевод finalized. Compliance receipt готов.",
    chip: "success",
    ruChip: "успех",
  },
};

const mapNodes = [
  { id: "dubai", x: 22, y: 66, state: "source" },
  { id: "almaty", x: 78, y: 36, state: "risk" },
  { id: "frankfurt", x: 56, y: 74, state: "neutral" },
  { id: "new-york", x: 34, y: 40, state: "neutral" },
  { id: "treasury-hq", x: 48, y: 42, state: "neutral", label: "Treasury HQ", balance: 34_200_000, note: "Policy owner" },
] as const;

function initialIntent(): TransferIntent {
  return {
    ...defaultTransferIntent,
    requirements: { ...defaultRequirements },
  };
}

export function FundTransfersView() {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const restartTimer = useRef<number | null>(null);
  const [selectedRail, setSelectedRail] = useState<TransferRail>("blockchain");
  const [intent, setIntent] = useState<TransferIntent>(initialIntent);
  const [accounts, setAccounts] = useState(() => transferAccounts);
  const [currentStage, setCurrentStage] = useState<TransferStage>(0);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [swiftReceipt, setSwiftReceipt] = useState<SwiftCommandReceipt | null>(null);
  const [blockchainReceipt, setBlockchainReceipt] = useState<BlockchainTransferReceipt | null>(null);

  useEffect(() => {
    return () => {
      if (restartTimer.current) {
        window.clearTimeout(restartTimer.current);
      }
    };
  }, []);

  const refreshLedgerAccounts = useCallback(async () => {
    const response = await fetch("/api/treasury/accounts", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { accounts?: TreasuryAccount[] };
    if (Array.isArray(payload.accounts)) {
      setAccounts(payload.accounts.map(toTransferAccount));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshLedgerAccounts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshLedgerAccounts]);

  useEffect(() => {
    if (currentStage === 0 || currentStage === 4) return undefined;

    const stageDelay: Record<Exclude<TransferStage, 0 | 4>, number> = {
      1: reducedMotion ? 300 : 1000,
      2: reducedMotion ? 360 : 1200,
      3: reducedMotion ? 380 : 1400,
    };
    const timer = window.setTimeout(() => {
      setCurrentStage((currentStage + 1) as TransferStage);
    }, stageDelay[currentStage]);

    return () => window.clearTimeout(timer);
  }, [currentStage, reducedMotion]);

  const selectedFrom = accounts.find((account) => account.id === intent.fromAccountId) ?? accounts[0];
  const selectedTo = accounts.find((account) => account.id === intent.toAccountId) ?? accounts[1] ?? accounts[0];
  const selectedBlockchainRoute = blockchainRoutes.find((route) => route.id === intent.routeId) ?? blockchainRoutes[0];
  const selectedSwiftRoute = swiftRoutes.find((route) => route.id === intent.routeId) ?? swiftRoutes[0];
  const stage = stageCopy[currentStage];
  const progress = currentStage === 0 ? 0 : currentStage >= 4 ? 100 : (currentStage / 3) * 100;
  const ledgerSignature = useMemo(
    () => accounts.map((account) => `${account.id}:${account.balance}:${account.condition}`).join("|"),
    [accounts],
  );

  const kpis = useMemo(
    () => [
      {
        label: "SWIFT ETA",
        ruLabel: "SWIFT ETA",
        value: selectedSwiftRoute.eta,
      },
      {
        label: "Blockchain finality",
        ruLabel: "Blockchain finality",
        value: `${selectedBlockchainRoute.finalitySeconds}s`,
      },
      {
        label: "Transfer amount",
        ruLabel: "Сумма перевода",
        value: formatCurrencyAmount(intent.amount, intent.currency),
      },
      {
        label: "Privacy mode",
        ruLabel: "Privacy mode",
        value: intent.requirements.regulatorReadable ? "encrypted memo" : "hash only",
      },
    ],
    [intent.amount, intent.currency, intent.requirements.regulatorReadable, selectedBlockchainRoute.finalitySeconds, selectedSwiftRoute.eta],
  );

  const updateIntent = (patch: TransferIntentPatch) => {
    setIntent((current) => ({
      ...current,
      ...patch,
      requirements: {
        ...current.requirements,
        ...(patch.requirements ?? {}),
      },
    }));
  };

  const setRail = (rail: TransferRail) => {
    setSelectedRail(rail);
    setRequestState("idle");
    setErrorMessage("");
    setCurrentStage(0);
    updateIntent({
      rail,
      routeId: rail === "swift" ? swiftRoutes[0].id : blockchainRoutes[0].id,
    });
  };

  const startBlockchainAnimation = () => {
    if (restartTimer.current) {
      window.clearTimeout(restartTimer.current);
    }
    setCurrentStage(0);
    restartTimer.current = window.setTimeout(() => {
      setCurrentStage(1);
      restartTimer.current = null;
    }, 80);
  };

  const submitTransfer = async () => {
    setRequestState("submitting");
    setErrorMessage("");
    setSwiftReceipt(null);
    setBlockchainReceipt(null);
    setCurrentStage(0);

    const endpoint = selectedRail === "swift" ? "/api/transfers/swift-command" : "/api/transfers/blockchain-intent";
    const payload: TransferIntent = {
      ...intent,
      rail: selectedRail,
      routeId: selectedRail === "swift" ? selectedSwiftRoute.id : selectedBlockchainRoute.id,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`Transfer API returned ${response.status}`);
      }

      if (selectedRail === "swift") {
        setSwiftReceipt((await response.json()) as SwiftCommandReceipt);
      } else {
        setBlockchainReceipt((await response.json()) as BlockchainTransferReceipt);
        startBlockchainAnimation();
      }
      void refreshLedgerAccounts();
      setRequestState("ready");
    } catch (error) {
      setRequestState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown transfer error");
    }
  };

  return (
    <main className="demo-page transfers-page internal-transfer-page" id="main-content">
      <DemoNav mode="replay" statusText={t("Transfer rail MVP", "MVP transfer rail")} />

      <section className="internal-transfer-hero transfer-rail-hero" aria-labelledby="transfers-title">
        <div className="internal-transfer-copy">
          <p className="eyebrow">{t("Fund Transfers", "Переводы средств")}</p>
          <h1 id="transfers-title">{t("Choose SWIFT or the TrueAvail blockchain rail.", "Выберите SWIFT или TrueAvail blockchain rail.")}</h1>
          <p>
            {t(
              "The same internal transfer can become a slow treasury command or a governed blockchain transaction with encrypted compliance memo and finality receipt.",
              "Один и тот же внутренний перевод может стать медленной treasury-командой или governed blockchain-транзакцией с encrypted compliance memo и finality receipt.",
            )}
          </p>
          <div className="rail-segmented-control" aria-label={t("Transfer rail", "Rail перевода")}>
            <button className={selectedRail === "swift" ? "rail-segment rail-segment--active" : "rail-segment"} onClick={() => setRail("swift")} type="button">
              SWIFT
            </button>
            <button className={selectedRail === "blockchain" ? "rail-segment rail-segment--active" : "rail-segment"} onClick={() => setRail("blockchain")} type="button">
              TrueAvail Blockchain
            </button>
          </div>
        </div>

        <aside className="internal-transfer-command" aria-label={t("Selected transfer", "Выбранный перевод")} key={`summary-${selectedRail}-${ledgerSignature}`}>
          <div className="transfer-command-header">
            <span>{t("Selected rail", "Выбранный rail")}</span>
            <strong>{selectedRail === "swift" ? "SWIFT" : "BLOCKCHAIN"}</strong>
          </div>
          <dl>
            <div>
              <dt>{t("From", "Откуда")}</dt>
              <dd>{selectedFrom.label} · {formatCurrencyAmount(selectedFrom.balance, selectedFrom.currency)}</dd>
            </div>
            <div>
              <dt>{t("To", "Куда")}</dt>
              <dd>{selectedTo.label} · {formatCurrencyAmount(selectedTo.balance, selectedTo.currency)}</dd>
            </div>
            <div>
              <dt>{t("Amount", "Сумма")}</dt>
              <dd>{formatCurrencyAmount(intent.amount, intent.currency)}</dd>
            </div>
            <div>
              <dt>{t("Through", "Через")}</dt>
              <dd>{selectedRail === "swift" ? selectedSwiftRoute.label : selectedBlockchainRoute.label}</dd>
            </div>
          </dl>
          <div className="transfer-command-note">
            <span>{t("Unified ledger", "Единый ledger")}</span>
            <p>
              {selectedFrom.condition}
            </p>
          </div>
        </aside>
      </section>

      <section className="internal-transfer-kpis" aria-label={t("Transfer metrics", "Метрики перевода")}>
        {kpis.map((kpi) => (
          <article key={kpi.label}>
            <span>{t(kpi.label, kpi.ruLabel)}</span>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </section>

      <section className="transfer-rail-console" aria-labelledby="transfer-console-title">
        <TransferSetupPanel
          accounts={accounts}
          intent={intent}
          key={`setup-${selectedRail}-${ledgerSignature}`}
          requestState={requestState}
          selectedRail={selectedRail}
          submitTransfer={submitTransfer}
          translate={t}
          updateIntent={updateIntent}
        />
        <ExecutionPanel
          blockchainReceipt={blockchainReceipt}
          currentStage={currentStage}
          errorMessage={errorMessage}
          progress={progress}
          reducedMotion={Boolean(reducedMotion)}
          requestState={requestState}
          selectedRail={selectedRail}
          stage={stage}
          swiftReceipt={swiftReceipt}
          translate={t}
          key={`execution-${selectedRail}-${requestState}`}
        />
      </section>

      <section className="internal-transfer-workspace" aria-label={t("Transfer map and rail proof", "Карта перевода и proof rail")}>
        <TransferMap accounts={accounts} key={`map-${ledgerSignature}`} selectedFromId={intent.fromAccountId} selectedToId={intent.toAccountId} progress={progress} currentStage={currentStage} reducedMotion={Boolean(reducedMotion)} />
        <RailComparison translate={t} />
      </section>
    </main>
  );
}

function TransferSetupPanel({
  accounts,
  intent,
  requestState,
  selectedRail,
  submitTransfer,
  translate,
  updateIntent,
}: {
  accounts: typeof transferAccounts;
  intent: TransferIntent;
  requestState: RequestState;
  selectedRail: TransferRail;
  submitTransfer: () => void;
  translate: (en: string, ru: string) => string;
  updateIntent: (patch: TransferIntentPatch) => void;
}) {
  const routeOptions = selectedRail === "swift" ? swiftRoutes : blockchainRoutes;
  const accountsForCurrency = accounts.filter((account) => account.currency === intent.currency);
  const destinationAccounts = accountsForCurrency.length > 1 ? accountsForCurrency : accounts;
  const updateFromAccount = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      updateIntent({ fromAccountId: accountId });
      return;
    }

    const nextDestination =
      accounts.find((item) => item.id !== account.id && item.currency === account.currency)?.id ?? intent.toAccountId;
    updateIntent({
      currency: account.currency,
      fromAccountId: account.id,
      toAccountId: nextDestination,
    });
  };

  return (
    <section className="transfer-setup-panel" aria-labelledby="transfer-console-title">
      <div className="section-heading">
        <p className="eyebrow">{translate("Transfer setup", "Настройка перевода")}</p>
        <h2 id="transfer-console-title">{selectedRail === "swift" ? translate("Create a treasury command", "Создать treasury-команду") : translate("Prepare blockchain transfer", "Подготовить blockchain transfer")}</h2>
      </div>

      <div className="transfer-form-grid">
        <label>
          <span>{translate("From account", "Счет отправки")}</span>
          <select value={intent.fromAccountId} onChange={(event) => updateFromAccount(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} / {account.jurisdiction} / {formatCurrencyAmount(account.balance, account.currency)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{translate("To account", "Счет получателя")}</span>
          <select value={intent.toAccountId} onChange={(event) => updateIntent({ toAccountId: event.target.value })}>
            {destinationAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label} / {account.jurisdiction} / {formatCurrencyAmount(account.balance, account.currency)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{translate("Amount", "Сумма")}</span>
          <input min="1" type="number" value={intent.amount} onChange={(event) => updateIntent({ amount: Number(event.target.value) })} />
        </label>
        <label>
          <span>{translate("Currency", "Валюта")}</span>
          <select value={intent.currency} onChange={(event) => updateIntent({ currency: event.target.value as TransferCurrency })}>
            {["USD", "EUR", "KZT", "AED"].map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className="transfer-form-grid__wide">
          <span>{translate("Purpose", "Назначение")}</span>
          <input value={intent.purpose} onChange={(event) => updateIntent({ purpose: event.target.value })} />
        </label>
        <label className="transfer-form-grid__wide">
          <span>{selectedRail === "swift" ? translate("Treasury route", "Treasury route") : translate("Through route", "Через какой rail")}</span>
          <select value={intent.routeId} onChange={(event) => updateIntent({ routeId: event.target.value })}>
            {routeOptions.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedRail === "blockchain" ? (
        <div className="requirements-grid">
          <label className="requirement-toggle">
            <input
              checked={intent.requirements.regulatorReadable}
              onChange={(event) => updateIntent({ requirements: { regulatorReadable: event.target.checked } })}
              type="checkbox"
            />
            <span>{translate("Regulator-readable encrypted memo", "Encrypted memo для регулятора")}</span>
          </label>
          <label className="requirement-toggle">
            <input
              checked={intent.requirements.privateMarketMemo}
              onChange={(event) => updateIntent({ requirements: { privateMarketMemo: event.target.checked } })}
              type="checkbox"
            />
            <span>{translate("Hide payment purpose from public market", "Скрыть назначение от публичного рынка")}</span>
          </label>
          <label>
            <span>{translate("Signer quorum", "Quorum подписантов")}</span>
            <select value={intent.requirements.signerQuorum} onChange={(event) => updateIntent({ requirements: { signerQuorum: event.target.value as "1-of-1" | "2-of-2" } })}>
              <option value="2-of-2">2-of-2</option>
              <option value="1-of-1">1-of-1</option>
            </select>
          </label>
          <label>
            <span>{translate("Required before", "Нужно до")}</span>
            <input value={intent.requirements.requiredBefore} onChange={(event) => updateIntent({ requirements: { requiredBefore: event.target.value } })} />
          </label>
        </div>
      ) : (
        <div className="swift-mode-note">
          <strong>{translate("Treasury team owns execution", "Исполнение у treasury-команды")}</strong>
          <p>{translate("TrueAvail creates the command, document list, owner, ETA, and cut-off risk instead of showing fake instant settlement.", "TrueAvail создает команду, список документов, owner, ETA и cut-off risk вместо фейкового instant settlement.")}</p>
        </div>
      )}

      <button className="command-button command-button--primary transfer-submit-button" disabled={requestState === "submitting"} onClick={submitTransfer} type="button">
        {selectedRail === "swift" ? translate("Create treasury command", "Создать treasury-команду") : translate("Submit blockchain transfer", "Отправить blockchain transfer")}
      </button>
    </section>
  );
}

function ExecutionPanel({
  blockchainReceipt,
  currentStage,
  errorMessage,
  progress,
  reducedMotion,
  requestState,
  selectedRail,
  stage,
  swiftReceipt,
  translate,
}: {
  blockchainReceipt: BlockchainTransferReceipt | null;
  currentStage: TransferStage;
  errorMessage: string;
  progress: number;
  reducedMotion: boolean;
  requestState: RequestState;
  selectedRail: TransferRail;
  stage: (typeof stageCopy)[TransferStage];
  swiftReceipt: SwiftCommandReceipt | null;
  translate: (en: string, ru: string) => string;
}) {
  return (
    <section className="transfer-execution-panel" aria-live="polite">
      {selectedRail === "swift" ? (
        <SwiftExecutionReceipt requestState={requestState} receipt={swiftReceipt} translate={translate} />
      ) : (
        <BlockchainExecutionReceipt
          currentStage={currentStage}
          progress={progress}
          receipt={blockchainReceipt}
          reducedMotion={reducedMotion}
          requestState={requestState}
          stage={stage}
          translate={translate}
        />
      )}
      {requestState === "error" ? <p className="transfer-error">{errorMessage}</p> : null}
    </section>
  );
}

function SwiftExecutionReceipt({
  receipt,
  requestState,
  translate,
}: {
  receipt: SwiftCommandReceipt | null;
  requestState: RequestState;
  translate: (en: string, ru: string) => string;
}) {
  const timeline = receipt?.timeline ?? [
    { label: "Command not created", detail: "Choose SWIFT and create a treasury command.", state: "pending" as const },
  ];

  return (
    <div className="swift-receipt-panel">
      <div className="section-heading">
        <p className="eyebrow">SWIFT</p>
        <h2>{translate("Treasury command receipt", "Treasury command receipt")}</h2>
      </div>
      <p>{translate("SWIFT remains supported, but execution is manual, owned, and document-heavy.", "SWIFT поддерживается, но исполнение ручное: owner, документы и банковский ETA.")}</p>
      <div className="swift-command-summary">
        <span>{translate("Command", "Команда")}</span>
        <strong>{receipt?.commandId ?? (requestState === "submitting" ? "creating..." : "not created")}</strong>
        <small>{receipt ? `${receipt.assignedOwner} / ${receipt.eta}` : translate("Submit to generate owner and ETA.", "Отправьте, чтобы получить owner и ETA.")}</small>
      </div>
      <div className="transfer-timeline">
        {timeline.map((item) => (
          <article className={`transfer-timeline__item transfer-timeline__item--${item.state}`} key={item.label}>
            <span>{item.label}</span>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
      {receipt ? (
        <>
          <PolicyChecks checks={receipt.policyChecks} />
          <div className="document-stack">
            {receipt.requiredDocuments.map((document) => (
              <span key={document}>{document}</span>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BlockchainExecutionReceipt({
  currentStage,
  progress,
  receipt,
  reducedMotion,
  requestState,
  stage,
  translate,
}: {
  currentStage: TransferStage;
  progress: number;
  receipt: BlockchainTransferReceipt | null;
  reducedMotion: boolean;
  requestState: RequestState;
  stage: (typeof stageCopy)[TransferStage];
  translate: (en: string, ru: string) => string;
}) {
  return (
    <div className="blockchain-flow-panel transfer-blockchain-panel">
      <AgentStatusBar chip={translate(stage.chip, stage.ruChip)} status={requestState === "submitting" ? translate("Agent: preparing transfer intent.", "Агент: готовлю transfer intent.") : translate(stage.status, stage.ruStatus)} />
      <BlockchainTransactionTrack currentStage={currentStage} progress={progress} reducedMotion={reducedMotion} translate={translate} />
      {receipt ? (
        <div className={currentStage === 4 ? "transfer-success-toast transfer-success-toast--visible" : "transfer-success-toast"}>
          <strong>{translate("Blockchain finality receipt", "Blockchain finality receipt")}</strong>
          <span>{receipt.txHash}</span>
          <span>{translate("Encrypted memo hash", "Encrypted memo hash")}: {receipt.memoHash}</span>
          <span>{receipt.contractCall.contract}.{receipt.contractCall.method}({receipt.contractCall.amount})</span>
          <Link className="command-button" href={`/transfers/compliance?txId=${receipt.txId}`}>
            {translate("Open compliance view", "Открыть compliance view")}
          </Link>
        </div>
      ) : (
        <p className="blockchain-placeholder">{translate("Submit the blockchain transfer to generate encrypted memo, mock transaction hash, and compliance receipt.", "Отправьте blockchain transfer, чтобы получить encrypted memo, mock tx hash и compliance receipt.")}</p>
      )}
      {receipt ? <PolicyChecks checks={receipt.policyChecks} /> : null}
    </div>
  );
}

function PolicyChecks({ checks }: { checks: PolicyCheck[] }) {
  return (
    <div className="governance-grid transfer-policy-grid">
      {checks.map((check) => (
        <article className={`governance-check governance-check--${check.state}`} key={check.label}>
          <span>{check.label}</span>
          <strong>{check.value}</strong>
        </article>
      ))}
    </div>
  );
}

function TransferMap({
  accounts,
  currentStage,
  progress,
  reducedMotion,
  selectedFromId,
  selectedToId,
}: {
  accounts: typeof transferAccounts;
  currentStage: TransferStage;
  progress: number;
  reducedMotion: boolean;
  selectedFromId: string;
  selectedToId: string;
}) {
  return (
    <div className="internal-transfer-map" aria-label="Company account network">
      <div className="map-grid-lines" aria-hidden="true" />
      <svg className="internal-transfer-svg" viewBox="0 0 100 100" aria-hidden="true">
        <path className="legacy-delay-path" d="M22 66 C34 90, 66 82, 78 36" />
        <motion.path
          className="blockchain-transfer-path"
          d="M22 66 C42 48, 58 48, 78 36"
          initial={false}
          animate={{ pathLength: currentStage === 0 ? 0 : currentStage >= 4 ? 1 : currentStage / 3 }}
          transition={{ duration: reducedMotion ? 0 : 0.9, ease: "easeInOut" }}
        />
        {currentStage > 0 && currentStage < 4 ? (
          <motion.circle
            className="map-payload-dot"
            r="1.8"
            initial={false}
            animate={{ offsetDistance: `${Math.min(100, progress)}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.9, ease: "easeInOut" }}
            style={{ offsetPath: "path('M22 66 C42 48, 58 48, 78 36')" }}
          />
        ) : null}
      </svg>
      {mapNodes.map((node) => {
        const account = accounts.find((item) => item.id === node.id);
        const isSelected = node.id === selectedFromId || node.id === selectedToId;
        const fallbackLabel = "label" in node ? node.label : "Account";
        const fallbackBalance = "balance" in node ? node.balance : 0;
        const fallbackNote = "note" in node ? node.note : "";
        return (
          <article
            className={`account-node account-node--${isSelected ? node.state : "neutral"}`}
            key={node.id}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span>{account?.label ?? fallbackLabel}</span>
            <strong>{formatCurrencyAmount(account?.balance ?? fallbackBalance, account?.currency ?? "USD")}</strong>
            <small>{account?.jurisdiction ?? fallbackNote}</small>
          </article>
        );
      })}
    </div>
  );
}

function RailComparison({ translate }: { translate: (en: string, ru: string) => string }) {
  return (
    <div className="rail-comparison-panel">
      <div className="section-heading">
        <p className="eyebrow">{translate("Rail contrast", "Сравнение rails")}</p>
        <h2>{translate("Same transfer, different operating model", "Один перевод, разная операционная модель")}</h2>
      </div>
      <div className="rail-compare-grid">
        <article className="rail-compare-card rail-compare-card--legacy">
          <span>SWIFT</span>
          <strong>T+1/T+3</strong>
          <p>{translate("Treasury team owns execution, documents, bank instruction, and cut-off risk.", "Treasury-команда отвечает за исполнение, документы, банковскую инструкцию и cut-off risk.")}</p>
        </article>
        <article className="rail-compare-card rail-compare-card--blockchain">
          <span>TrueAvail Blockchain</span>
          <strong>{translate("seconds", "секунды")}</strong>
          <p>{translate("Smart contract checks the allowlist and stores only encrypted compliance memo for selective audit.", "Смарт-контракт проверяет allowlist и хранит только encrypted compliance memo для selective audit.")}</p>
        </article>
      </div>
    </div>
  );
}

function AgentStatusBar({ status, chip }: { status: string; chip: string }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="agent-status-bar"
      initial={{ opacity: 0, y: -8 }}
      key={status}
      transition={{ duration: 0.22 }}
    >
      <span>{chip}</span>
      <strong>{status}</strong>
    </motion.div>
  );
}

function BlockchainTransactionTrack({
  currentStage,
  progress,
  reducedMotion,
  translate,
}: {
  currentStage: TransferStage;
  progress: number;
  reducedMotion: boolean;
  translate: (en: string, ru: string) => string;
}) {
  return (
    <div className="blockchain-track" aria-label="Blockchain transaction progress">
      <div className="blockchain-track__line" />
      <motion.div
        animate={{
          width: `${progress}%`,
          backgroundColor: currentStage >= 4 ? "#7cd0b8" : "#74a5cf",
        }}
        className="blockchain-track__progress"
        initial={false}
        transition={{ duration: reducedMotion ? 0 : 0.75, ease: "easeInOut" }}
      />
      {currentStage > 0 && currentStage < 4 ? (
        <motion.div
          animate={{ left: `${progress}%` }}
          className="payload-dot"
          initial={false}
          transition={{ duration: reducedMotion ? 0 : 0.75, ease: "easeInOut" }}
        />
      ) : null}

      {transactionSteps.map((step, index) => {
        const nodeState = getNodeState(currentStage, index);
        return (
          <div className="track-node-wrap" key={step.label}>
            <motion.div
              animate={nodeAnimation(nodeState)}
              className={`track-node track-node--${nodeState}`}
              initial={false}
              transition={nodeState === "pulsing" && !reducedMotion ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" } : { duration: reducedMotion ? 0 : 0.22 }}
            >
              {nodeState === "success" && index === transactionSteps.length - 1 ? <span aria-hidden="true">✓</span> : null}
              {nodeState === "pulsing" && index === 2 ? <i aria-hidden="true" /> : null}
            </motion.div>
            <span>{translate(step.label, step.ruLabel)}</span>
            <small>{translate(step.detail, step.ruDetail)}</small>
          </div>
        );
      })}
    </div>
  );
}

function getNodeState(stage: TransferStage, index: number) {
  if (stage >= 4) return "success";
  if (stage === 0) return "idle";
  if (stage === 3 && index === 2) return "pulsing";
  if (index < stage) return "active";
  return "idle";
}

function nodeAnimation(state: ReturnType<typeof getNodeState>) {
  if (state === "success") {
    return {
      scale: 1.08,
      backgroundColor: "#7cd0b8",
      borderColor: "rgba(124, 208, 184, 0.82)",
      boxShadow: "0 0 22px rgba(124, 208, 184, 0.46)",
    };
  }
  if (state === "pulsing") {
    return {
      scale: [1, 1.15, 1],
      backgroundColor: "#74a5cf",
      borderColor: "rgba(116, 165, 207, 0.86)",
      boxShadow: ["0 0 0 rgba(116, 165, 207, 0)", "0 0 26px rgba(116, 165, 207, 0.72)", "0 0 0 rgba(116, 165, 207, 0)"],
    };
  }
  if (state === "active") {
    return {
      scale: 1.08,
      backgroundColor: "#74a5cf",
      borderColor: "rgba(116, 165, 207, 0.86)",
      boxShadow: "0 0 18px rgba(116, 165, 207, 0.48)",
    };
  }
  return {
    scale: 1,
    backgroundColor: "rgba(245, 245, 247, 0.08)",
    borderColor: "rgba(245, 245, 247, 0.2)",
    boxShadow: "0 0 0 rgba(116, 165, 207, 0)",
  };
}
