import type { MetricTone, ScenarioId } from "./types";

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatUtcDateParts(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const month = shortMonths[parsed.getUTCMonth()] ?? "Jan";
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const year = parsed.getUTCFullYear();
  const hour = String(parsed.getUTCHours()).padStart(2, "0");
  const minute = String(parsed.getUTCMinutes()).padStart(2, "0");

  return { day, hour, minute, month, year };
}

export function normalizeStatus(value: unknown) {
  if (typeof value !== "string") {
    return "unknown";
  }

  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function toneForStatus(value: unknown): MetricTone {
  const normalized = normalizeStatus(value);

  if (["green", "safe", "ok", "normal", "optimal", "feasible", "success", "approved", "available"].includes(normalized)) {
    return "positive";
  }

  if (["amber", "yellow", "warning", "watch", "fallback", "degraded", "escalated", "review_required", "mock"].includes(normalized)) {
    return normalized === "mock" ? "info" : "warning";
  }

  if (["red", "breach", "critical", "infeasible", "failed", "error", "rejected", "reject", "unavailable", "blocked"].includes(normalized)) {
    return "danger";
  }

  if (["pending", "running", "unknown", "missing"].includes(normalized)) {
    return "neutral";
  }

  return "neutral";
}

export function formatCurrencyAmount(value: unknown, currency?: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  if (typeof currency === "string" && /^[A-Z]{3}$/.test(currency)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 0 : 2,
    }).format(value);
  }

  return numberFormatter.format(value);
}

export function formatCompactNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return compactNumberFormatter.format(value);
}

export function formatNumber(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return numberFormatter.format(value);
}

export function formatDecimal(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return decimalFormatter.format(value);
}

export function formatPercent(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  const normalized = Math.abs(value) > 1 ? value / 100 : value;
  return percentFormatter.format(normalized);
}

export function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "N/A";
  }

  const parts = formatUtcDateParts(value);
  if (!parts) {
    return value;
  }

  return `${parts.month} ${parts.day}, ${parts.year}`;
}

export function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "N/A";
  }

  const parts = formatUtcDateParts(value);
  if (!parts) {
    return value;
  }

  return `${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} UTC`;
}

export function formatRiskStatus(value: unknown) {
  const normalized = normalizeStatus(value);
  if (normalized === "green") return "Safe";
  if (normalized === "yellow" || normalized === "amber") return "Watch";
  if (normalized === "red") return "Breach";
  return typeof value === "string" && value.trim() ? value : "Unknown";
}

export function formatScenarioName(value: ScenarioId | string | undefined) {
  if (value === "bank_run") {
    return "Bank run";
  }
  if (value === "target2_outage") {
    return "TARGET2 outage";
  }
  return value ? value.replace(/_/g, " ") : "Unknown scenario";
}

export function formatSolverStatus(value: unknown) {
  const normalized = normalizeStatus(value);
  if (normalized === "optimal") return "Optimal";
  if (normalized === "infeasible") return "Infeasible";
  if (normalized === "error") return "Error";
  return typeof value === "string" && value.trim() ? value : "Unknown";
}

export function formatGateDecision(value: unknown) {
  const normalized = normalizeStatus(value);
  if (normalized === "approve" || normalized === "approved") return "Approved";
  if (normalized === "reject" || normalized === "rejected") return "Rejected";
  if (normalized === "escalate" || normalized === "escalated") return "Escalated";
  if (normalized === "review_required") return "Review required";
  return typeof value === "string" && value.trim() ? value : "Unknown";
}

export function titleize(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "N/A";
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
