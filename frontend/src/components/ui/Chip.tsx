import type { ReactNode } from "react";

export type ChipTone = "gap" | "warn" | "good" | "accent" | "neutral" | "mono";

const tones: Record<ChipTone, string> = {
  gap: "bg-gap-tint text-gap",
  warn: "bg-warn-tint text-warn",
  good: "bg-good-tint text-good",
  accent: "bg-accent-tint text-accent-ink",
  neutral: "border border-hairline-2 text-ink-2",
  mono: "border border-hairline-2 font-mono text-[12px] text-ink-2",
};
const dotTones: Record<ChipTone, string> = {
  gap: "bg-gap-fill",
  warn: "bg-warn-fill",
  good: "bg-good-fill",
  accent: "bg-accent",
  neutral: "bg-ink-4",
  mono: "",
};

/** 26 px status pill: dot + label, never colour alone. */
export function Chip({
  tone = "neutral",
  children,
  dot = tone !== "mono",
  pulse = false,
  className = "",
  title,
}: {
  tone?: ChipTone;
  children: ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-[26px] max-w-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-medium ${tones[tone]} ${className}`}
    >
      {dot && <span aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${dotTones[tone]} ${pulse ? "dot-pulse" : ""}`} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** 22 px mono tag; `in` / `out` mark scheduled flows with ▲ / ▼. */
export function Tag({ kind = "plain", children, className = "" }: { kind?: "in" | "out" | "plain"; children: ReactNode; className?: string }) {
  const cls = kind === "in" ? "bg-good-tint text-good" : kind === "out" ? "bg-gap-tint text-gap" : "bg-bg-3 text-ink-2";
  return (
    <span
      className={`inline-flex min-h-[22px] max-w-full items-start gap-1 rounded-1 px-2 py-[3px] font-mono text-[11.5px] leading-[1.35] ${cls} ${className}`}
    >
      {kind !== "plain" && <span aria-hidden className="text-[9px] leading-[15px]">{kind === "in" ? "▲" : "▼"}</span>}
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
