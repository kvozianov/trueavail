"use client";

import { useState } from "react";
import Link from "next/link";
import { DemoNav } from "@/components/liquidity/DemoNav";
import { useLanguage } from "@/components/liquidity/LanguageProvider";
import { formatCurrencyAmount } from "@/lib/backend/formatters";
import { DEMO_REGULATOR_VIEW_KEY } from "@/lib/transfers/transfer-rail-fixtures";
import type { ComplianceLookupResponse } from "@/lib/transfers/transfer-rail-types";

type LookupState = "idle" | "loading" | "ready" | "error";

export function TransferComplianceView({
  initialResponse,
  initialTxId,
}: {
  initialResponse: ComplianceLookupResponse | null;
  initialTxId: string;
}) {
  const { t } = useLanguage();
  const [txId, setTxId] = useState(initialTxId);
  const [viewKey, setViewKey] = useState("");
  const [lookupState, setLookupState] = useState<LookupState>(initialResponse ? "ready" : "idle");
  const [response, setResponse] = useState<ComplianceLookupResponse | null>(initialResponse);
  const [errorMessage, setErrorMessage] = useState("");

  const lookup = async (key = viewKey) => {
    setLookupState("loading");
    setErrorMessage("");
    try {
      const result = await fetch(`/api/transfers/compliance/${encodeURIComponent(txId || "latest")}?viewKey=${encodeURIComponent(key)}`, {
        cache: "no-store",
      });
      if (!result.ok) {
        throw new Error(`Compliance API returned ${result.status}`);
      }
      setResponse((await result.json()) as ComplianceLookupResponse);
      setLookupState("ready");
    } catch (error) {
      setLookupState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unknown compliance lookup error");
    }
  };

  return (
    <main className="demo-page transfers-page compliance-page" id="main-content">
      <DemoNav mode="replay" statusText={t("Compliance view", "Просмотр compliance")} />

      <section className="compliance-hero" aria-labelledby="compliance-title">
        <div>
          <p className="eyebrow">{t("Regulator / auditor", "Регулятор / аудитор")}</p>
          <h1 id="compliance-title">{t("Selective transparency for encrypted transfers.", "Selective transparency для encrypted transfers.")}</h1>
          <p>
            {t(
              "The public transaction only exposes wallets, amount, network, and encrypted memo. A regulator view key reveals the business memo and invoice details.",
              "Публичная транзакция показывает только wallets, amount, network и encrypted memo. Ключ просмотра регулятора раскрывает business memo и invoice details.",
            )}
          </p>
        </div>
        <Link className="command-button" href="/transfers">
          {t("Back to transfer console", "Назад к консоли переводов")}
        </Link>
      </section>

      <section className="compliance-console">
        <div className="compliance-lookup-panel">
          <div className="section-heading">
            <p className="eyebrow">{t("Lookup", "Поиск")}</p>
            <h2>{t("Decrypt compliance memo", "Расшифровать compliance memo")}</h2>
          </div>
          <label>
            <span>TX ID</span>
            <input value={txId} onChange={(event) => setTxId(event.target.value)} />
          </label>
          <label>
            <span>{t("View key", "Ключ просмотра")}</span>
            <input placeholder={DEMO_REGULATOR_VIEW_KEY} value={viewKey} onChange={(event) => setViewKey(event.target.value)} />
          </label>
          <div className="compliance-actions">
            <button className="command-button command-button--primary" disabled={lookupState === "loading"} onClick={() => void lookup(viewKey)} type="button">
              {t("Reveal report", "Показать отчет")}
            </button>
            <button className="command-button" onClick={() => { setViewKey(DEMO_REGULATOR_VIEW_KEY); void lookup(DEMO_REGULATOR_VIEW_KEY); }} type="button">
              {t("Use demo key", "Использовать demo key")}
            </button>
          </div>
          <p className="compliance-note">
            {t(
              "MVP note: this simulates privacy with an encrypted memo. It is not a production ZK proof.",
              "MVP note: privacy имитируется encrypted memo. Это не production ZK proof.",
            )}
          </p>
          {lookupState === "error" ? <p className="transfer-error">{errorMessage}</p> : null}
        </div>

        <div className="public-preview-panel">
          <div className="section-heading">
            <p className="eyebrow">{t("Public explorer", "Публичный explorer")}</p>
            <h2>{t("What the market sees", "Что видит рынок")}</h2>
          </div>
          {response ? (
            <dl className="compliance-dl">
              <div><dt>TX</dt><dd>{response.publicPreview.txHash}</dd></div>
              <div><dt>{t("From wallet", "Кошелёк отправителя")}</dt><dd>{response.publicPreview.fromWallet}</dd></div>
              <div><dt>{t("To wallet", "Кошелёк получателя")}</dt><dd>{response.publicPreview.toWallet}</dd></div>
              <div><dt>{t("Amount", "Сумма")}</dt><dd>{formatCurrencyAmount(response.publicPreview.amount, response.publicPreview.currency)}</dd></div>
              <div><dt>{t("Memo hash", "Хэш memo")}</dt><dd>{response.publicPreview.memoHash}</dd></div>
              <div><dt>{t("Encrypted memo", "Зашифрованное memo")}</dt><dd>{response.publicPreview.encryptedMemo}</dd></div>
            </dl>
          ) : (
            <p>{t("Loading public transaction preview.", "Загружаю публичный preview транзакции.")}</p>
          )}
        </div>

        <div className={response?.viewKeyAccepted ? "decrypted-report-panel decrypted-report-panel--open" : "decrypted-report-panel"} key={response?.viewKeyAccepted ? "report-open" : "report-locked"}>
          <div className="section-heading">
            <p className="eyebrow">{t("Private report", "Приватный отчёт")}</p>
            <h2>{response?.viewKeyAccepted ? t("View key accepted", "View key принят") : t("Locked until view key", "Закрыто до view key")}</h2>
          </div>
          <p>{response?.message ?? t("Enter the view key to reveal details.", "Введите view key, чтобы раскрыть детали.")}</p>
          {response?.decryptedReport ? (
            <dl className="compliance-dl">
              <div><dt>{t("Invoice", "Инвойс")}</dt><dd>{response.decryptedReport.invoiceId}</dd></div>
              <div><dt>{t("Company BIN", "БИН компании")}</dt><dd>{response.decryptedReport.companyBin}</dd></div>
              <div><dt>{t("From entity", "От entity")}</dt><dd>{response.decryptedReport.fromLegalEntity}</dd></div>
              <div><dt>{t("To entity", "В entity")}</dt><dd>{response.decryptedReport.toLegalEntity}</dd></div>
              <div><dt>{t("Purpose", "Назначение")}</dt><dd>{response.decryptedReport.purpose}</dd></div>
              <div><dt>{t("FX rate", "FX-курс")}</dt><dd>{response.decryptedReport.fxRate}</dd></div>
              <div><dt>{t("Policy", "Политика")}</dt><dd>{response.decryptedReport.policyVersion}</dd></div>
              <div><dt>{t("Signer", "Подписант")}</dt><dd>{response.decryptedReport.signer}</dd></div>
            </dl>
          ) : null}
        </div>
      </section>
    </main>
  );
}
