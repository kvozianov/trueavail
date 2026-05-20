import { formatGateDecision, formatRiskStatus, formatSolverStatus, titleize, toneForStatus } from "@/lib/backend/formatters";
import type { MetricTone } from "@/lib/backend/types";

type StatusBadgeProps = {
  value?: unknown;
  variant?: MetricTone;
  context?: "risk" | "optimizer" | "gate" | "provider" | "plain";
  compact?: boolean;
};

export function StatusBadge({ value, variant, context = "plain", compact }: StatusBadgeProps) {
  const tone = variant ?? toneForStatus(value);
  const text = formatStatusText(value, context);

  return (
    <span className={`status-badge status-badge--${tone} ${compact ? "status-badge--compact" : ""}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

function formatStatusText(value: unknown, context: StatusBadgeProps["context"]) {
  if (context === "risk") {
    return formatRiskStatus(value);
  }
  if (context === "optimizer") {
    return formatSolverStatus(value);
  }
  if (context === "gate") {
    return formatGateDecision(value);
  }
  if (typeof value === "boolean") {
    return value ? "Available" : "Unavailable";
  }
  if (typeof value === "string" && value.trim()) {
    return titleize(value);
  }
  return "Unknown";
}
