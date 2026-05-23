"use client";

import { useEffect, useRef } from "react";

type NetworkPoint = {
  accent: boolean;
  alpha: number;
  pulse: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type MistBand = {
  alpha: number;
  phase: number;
  rx: number;
  ry: number;
  speed: number;
  tint: "cool" | "warm";
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const seededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return undefined;

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let points: NetworkPoint[] = [];
    let mistBands: MistBand[] = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const createPoints = () => {
      const rand = seededRandom(2718 + Math.round(width) * 17 + Math.round(height) * 31);
      const count = clamp(Math.round((width * height) / 18000), 46, 132);
      points = Array.from({ length: count }, (_, index) => ({
        accent: index % 4 === 0,
        alpha: index % 4 === 0 ? 0.96 : 0.5 + rand() * 0.24,
        pulse: rand() * Math.PI * 2,
        radius: index % 4 === 0 ? 2.05 : 1.55,
        vx: (rand() - 0.5) * 0.18,
        vy: (rand() - 0.5) * 0.16,
        x: rand() * width,
        y: rand() * height,
      }));

      mistBands = Array.from({ length: 9 }, (_, index) => ({
        alpha: index % 3 === 0 ? 0.15 : 0.09 + rand() * 0.06,
        phase: rand() * Math.PI * 2,
        rx: width * (0.22 + rand() * 0.22),
        ry: height * (0.08 + rand() * 0.13),
        speed: 0.00005 + rand() * 0.00008,
        tint: index % 4 === 0 ? "warm" : "cool",
        x: width * (-0.08 + rand() * 1.16),
        y: height * (0.03 + rand() * 0.74),
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      createPoints();
    };

    const draw = (time = 0) => {
      context.clearRect(0, 0, width, height);

      mistBands.forEach((band) => {
        const drift = reducedMotion.matches ? 0 : Math.sin(time * band.speed + band.phase) * width * 0.075;
        const lift = reducedMotion.matches ? 0 : Math.cos(time * band.speed * 0.78 + band.phase) * height * 0.028;
        const x = band.x + drift;
        const y = band.y + lift;
        const radius = Math.max(band.rx, 1);
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

        if (band.tint === "warm") {
          gradient.addColorStop(0, `rgba(240, 106, 27, ${band.alpha * 0.58})`);
          gradient.addColorStop(0.42, `rgba(196, 121, 72, ${band.alpha * 0.22})`);
        } else {
          gradient.addColorStop(0, `rgba(116, 165, 207, ${band.alpha})`);
          gradient.addColorStop(0.46, `rgba(73, 116, 156, ${band.alpha * 0.38})`);
        }
        gradient.addColorStop(1, "rgba(15, 16, 17, 0)");

        context.save();
        context.translate(x, y);
        context.scale(1, Math.max(band.ry / radius, 0.22));
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.fill();
        context.restore();
      });

      const maxDistance = width < 760 ? 142 : 218;
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];

        for (let j = i + 1; j < points.length; j += 1) {
          const nextPoint = points[j];
          const dx = point.x - nextPoint.x;
          const dy = point.y - nextPoint.y;
          const distance = Math.hypot(dx, dy);

          if (distance < maxDistance) {
            const strength = 1 - distance / maxDistance;
            const accentLine = point.accent || nextPoint.accent;
            context.beginPath();
            context.moveTo(point.x, point.y);
            context.lineTo(nextPoint.x, nextPoint.y);
            context.lineWidth = accentLine ? 0.94 : 0.68;
            context.strokeStyle = accentLine
              ? `rgba(240, 106, 27, ${strength * 0.42})`
              : `rgba(222, 232, 238, ${strength * 0.15})`;
            context.stroke();
          }
        }
      }

      points.forEach((point) => {
        const pulse = 0.45 + Math.sin(point.pulse) * 0.3;
        context.beginPath();
        context.arc(point.x, point.y, point.radius + pulse, 0, Math.PI * 2);
        context.fillStyle = point.accent
          ? `rgba(240, 106, 27, ${point.alpha})`
          : `rgba(231, 239, 242, ${point.alpha})`;
        context.fill();

        if (!reducedMotion.matches) {
          point.x += point.vx;
          point.y += point.vy;
          point.pulse += 0.018;

          if (point.x < -20) point.x = width + 20;
          if (point.x > width + 20) point.x = -20;
          if (point.y < -20) point.y = height + 20;
          if (point.y > height + 20) point.y = -20;
        }
      });

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas aria-hidden="true" className="network-background" ref={canvasRef} />;
}
