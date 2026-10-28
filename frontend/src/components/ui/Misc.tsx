import type { ReactNode } from "react";

/** Brand mark: three strokes fanning from one point (P95, P50, P5) crossed by the dashed buffer. */
export function Mark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M2.5 17.5 L21.5 5.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M2.5 17.5 L21.5 11" stroke="var(--ink)" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M2.5 17.5 L21.5 16.5" stroke="var(--ink)" strokeOpacity=".3" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M1.5 14 H22.5" stroke="var(--gap-fill)" strokeWidth="1.25" strokeDasharray="2.4 1.8" fill="none" />
    </svg>
  );
}

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={`animate-pulse rounded-2 bg-bg-3 motion-reduce:animate-none ${className}`} />;
}

/** Eyebrow with the accent dot that introduces a section. */
export function SectionEyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-2 !text-accent ${className}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </p>
  );
}

/** Flat empty-state card: h4 + small + optional action. */
export function EmptyState({ title, body, action }: { title: string; body: ReactNode; action?: ReactNode }) {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-8 text-center">
      <p className="t-h4">{title}</p>
      <p className="t-small mt-1 max-w-md">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Inner-page title block: eyebrow context line → h1 finding → optional right-aligned controls. */
export function PageTitle({ eyebrow, title, children, actions }: { eyebrow: ReactNode; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-8 pt-10 sm:pt-12">
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="t-h1 mt-3">{title}</h1>
        {children && <div className="t-lead mt-3 max-w-[60ch]">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** GitHub mark (lucide no longer ships brand icons). */
export function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
