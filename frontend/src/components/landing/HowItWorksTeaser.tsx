"use client";

import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { PipelineSvg } from "@/components/how-it-works/PipelineSvg";
import type { Stage } from "@/components/how-it-works/stages";
import { ButtonLink, SectionEyebrow } from "@/components/ui";
import { numberWord } from "@/lib/format";

/** The nine stages light up one by one as the section scrolls through the viewport. */
export function HowItWorksTeaser({ stages }: { stages: Stage[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(reduce ? stages.length - 1 : 0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.6"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    setActive(Math.max(0, Math.min(stages.length - 1, Math.floor(v * stages.length))));
  });
  const s = stages[active];
  return (
    <section ref={ref} id="how-it-works" className="scroll-mt-28 bg-bg-2 py-16 sm:py-20" aria-labelledby="hiw-title">
      <div className="container-page grid items-center gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionEyebrow>How it works · {stages.length} stages</SectionEyebrow>
          <h2 id="hiw-title" className="t-h2 mt-3">
            From a CSV to a cash gap, in {numberWord(stages.length)} stages.
          </h2>
          <div className="mt-6 min-h-[88px]" aria-live="polite">
            <p className="eyebrow !text-accent">
              Stage {s.n} / {String(stages.length).padStart(2, "0")} · {s.name}
            </p>
            <p className="mt-2 text-[15px] text-ink-2">{s.boxes.map((b) => b.metric).join(" · ")}</p>
          </div>
          <ButtonLink href="/how-it-works" variant="secondary" className="mt-4">
            Read how it works
          </ButtonLink>
        </div>
        <div className="mx-auto w-full max-w-[520px] lg:col-span-7">
          <PipelineSvg stages={stages} active={active} particles={!reduce} allDone={!!reduce} title={`Pipeline diagram, stage ${s.n} highlighted: ${s.name}`} />
        </div>
      </div>
    </section>
  );
}
