"use client";

import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useWidth } from "@/components/charts/scales";
import type { Account, ForecastResponse, ScheduledFlow } from "@/lib/types";
import { GlobeSvg } from "./GlobeSvg";
import { HOME, basePaths, landFeatures, projection, type LandTopology } from "./geometry";
import { buildGlobeModel } from "./model";

type Land = ReturnType<typeof landFeatures>;

/** Interactive globe: drag (or arrow keys) to rotate, it eases back to the Atlantic view when left alone. */
export default function GlobeClient({
  accounts,
  flows,
  forecast,
  fallback,
}: {
  accounts: Account[];
  flows: ScheduledFlow[];
  forecast: ForecastResponse | null;
  fallback: ReactNode;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [wrapRef, width] = useWidth<HTMLDivElement>(580);
  const [land, setLand] = useState<Land | null>(null);
  const [rot, setRot] = useState<[number, number]>(HOME);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const idle = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const rotRef = useRef(rot);
  useEffect(() => {
    rotRef.current = rot;
  }, [rot]);

  useEffect(() => {
    let alive = true;
    import("world-atlas/land-110m.json").then((m) => alive && setLand(landFeatures(m.default as unknown as LandTopology)));
    return () => {
      alive = false;
    };
  }, []);

  const model = useMemo(() => buildGlobeModel(accounts, flows, forecast), [accounts, flows, forecast]);
  const proj = useMemo(() => projection(rot), [rot]);
  const paths = useMemo(() => basePaths(proj, land), [proj, land]);

  const stopReturn = () => {
    if (idle.current) window.clearTimeout(idle.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    idle.current = raf.current = null;
  };
  const scheduleReturn = () => {
    stopReturn();
    if (reduce) return;
    idle.current = window.setTimeout(() => {
      const from = rotRef.current;
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / 1200);
        const e = 1 - (1 - t) ** 3;
        setRot([from[0] + (HOME[0] - from[0]) * e, from[1] + (HOME[1] - from[1]) * e]);
        if (t < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    }, 2500);
  };
  useEffect(() => stopReturn, []);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    stopReturn();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = { x: e.clientX, y: e.clientY, r: rotRef.current };
    const perPx = 180 / Math.max(200, width);
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const lon = start.r[0] + (ev.clientX - start.x) * perPx;
      const lat = Math.max(-80, Math.min(80, start.r[1] - (ev.clientY - start.y) * perPx));
      setRot([lon, lat]);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      setDragging(false);
      scheduleReturn();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] }[e.key];
    if (!d || e.target !== e.currentTarget) return;
    e.preventDefault();
    stopReturn();
    setRot(([l, p]) => [l + d[0], Math.max(-80, Math.min(80, p + d[1]))]);
    scheduleReturn();
  };

  return (
    <div ref={wrapRef} className="relative aspect-square w-full">
      {land ? (
        <GlobeSvg
          proj={proj}
          paths={paths}
          nodes={model.nodes}
          arcs={model.arcs}
          renderSize={width}
          particles={!reduce && !dragging}
          hoverId={hover}
          essentialOnly={width < 440}
          interactive
          label={`Globe: ${model.nodes.length} accounts at illustrative locations, ${model.arcs.length} scheduled flows${model.gapId ? `; ${model.nodes.find((n) => n.id === model.gapId)?.account} has the first cash gap` : ""}. Drag or use the arrow keys to rotate.`}
          onNodeEnter={setHover}
          onNodeClick={(id) => router.push(`/forecast?account=${encodeURIComponent(id)}`)}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        />
      ) : (
        fallback
      )}
    </div>
  );
}
