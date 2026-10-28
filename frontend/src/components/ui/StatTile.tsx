import type { ReactNode } from "react";

/** Big display number + small label + optional note. Gap colour only when the stat is a gap. */
export function StatTile({
  value,
  label,
  note,
  size = "l",
  gap = false,
  labelStyle = "eyebrow",
  className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  note?: ReactNode;
  size?: "xl" | "l" | "m";
  gap?: boolean;
  labelStyle?: "eyebrow" | "small";
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <div className={`t-stat t-stat-${size} ${gap ? "!text-gap" : ""}`}>{value}</div>
      <div className={`mt-2 ${labelStyle === "eyebrow" ? "eyebrow" : "t-small"}`}>{label}</div>
      {note && <div className="mt-1.5 text-[13px] leading-snug text-ink-2">{note}</div>}
    </div>
  );
}
