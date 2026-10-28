"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useMedia } from "@/lib/useMedia";
import { PipelineSvg } from "./PipelineSvg";
import type { Stage } from "./stages";

function Progress({ n, active }: { n: number; active: number }) {
  return (
    <div className="mt-6 flex gap-1.5" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`h-[3px] flex-1 rounded-full ${i === active ? "bg-accent" : i < active ? "bg-ink-4" : "bg-hairline"}`} />
      ))}
    </div>
  );
}

function StageText({ s, total, active, i }: { s: Stage; total: number; active: number; i: number }) {
  return (
    <>
      <p className="eyebrow !text-accent">
        Stage {s.n} / {String(total).padStart(2, "0")} · {s.name}
      </p>
      <h2 className="t-h2 mt-3">{s.headline}</h2>
      <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-ink-2">{s.body}</p>
      <p className={`t-stat t-stat-xl mt-7 ${s.gap ? "!text-gap" : ""}`}>{s.big}</p>
      <p className="t-small mt-2">{s.bigLabel}</p>
      <Progress n={total} active={i === active ? active : i} />
    </>
  );
}

/** Desktop: stage cards scroll on the left while the pipeline diagram stays pinned on the right. */
export function PipelineStory({ stages }: { stages: Stage[] }) {
  const reduce = useReducedMotion();
  const desktop = useMedia("(min-width: 1024px)");
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const rows = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = (desktop ? refs.current : rows.current).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [desktop, stages.length]);

  if (desktop)
    return (
      <div className="grid grid-cols-[440px_minmax(0,1fr)] gap-12 xl:gap-20">
        <div>
          {stages.map((s, i) => (
            <section
              key={s.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-stage={i}
              aria-label={`Stage ${s.n}: ${s.name}`}
              className="flex min-h-[90vh] flex-col justify-center py-10"
            >
              <StageText s={s} total={stages.length} active={active} i={i} />
            </section>
          ))}
        </div>
        <div>
          <div className="sticky top-28 flex max-h-[calc(100vh-136px)] justify-center">
            <PipelineSvg
              stages={stages}
              active={active}
              particles={!reduce}
              allDone={!!reduce}
              className="max-h-[calc(100vh-136px)] w-auto max-w-[600px]"
              title={`Pipeline diagram with ${stages.length} stages; stage ${stages[active].n}, ${stages[active].name}, is highlighted.`}
            />
          </div>
        </div>
      </div>
    );

  const s = stages[active];
  return (
    <div>
      <div className="card p-5" aria-live="polite">
        <StageText s={s} total={stages.length} active={active} i={active} />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" aria-label="Previous stage" disabled={active === 0} onClick={() => setActive(active - 1)} icon={<ChevronLeft size={16} aria-hidden />} />
          <Button
            size="sm"
            variant="secondary"
            aria-label="Next stage"
            disabled={active === stages.length - 1}
            onClick={() => setActive(active + 1)}
            icon={<ChevronRight size={16} aria-hidden />}
          />
        </div>
      </div>
      <ol className="relative mt-8 space-y-3 before:absolute before:bottom-5 before:left-[19px] before:top-5 before:w-px before:bg-hairline-2" aria-label="Pipeline stages">
        {stages.map((st, i) => {
          const on = i === active;
          const done = reduce || i < active;
          return (
            <li
              key={st.id}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-stage={i}
              className="relative grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3"
            >
              <span
                aria-hidden
                className={`z-[1] flex h-10 w-10 items-center justify-center rounded-full border font-mono text-[12px] ${
                  on ? "border-accent bg-accent text-white dark:text-[#0E1013]" : done ? "border-ink-4 bg-bg text-ink-2" : "border-hairline-2 bg-bg text-ink-3"
                }`}
              >
                {st.n}
              </span>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={on ? "step" : undefined}
                className={`min-h-11 rounded-3 border px-4 py-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${on ? "border-accent bg-accent-tint" : "border-hairline bg-bg"}`}
              >
                <span className={`block text-[15px] font-semibold ${on ? "text-accent-ink" : done ? "text-ink" : "text-ink-2"}`}>{st.name}</span>
                <span className={`mt-0.5 block font-mono text-[11.5px] ${on ? "text-accent-ink" : "text-ink-3"}`}>{st.boxes.map((b) => b.metric).join(" · ")}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
