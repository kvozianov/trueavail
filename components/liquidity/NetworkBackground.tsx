"use client";

import { useEffect, useRef } from "react";

type NetworkPoint = {
  accent: boolean;
  pulse: number;
  radius: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const createPoints = () => {
      const count = clamp(Math.round((width * height) / 18000), 46, 132);
      points = Array.from({ length: count }, (_, index) => ({
        accent: index % 4 === 0,
        pulse: Math.random() * Math.PI * 2,
        radius: index % 4 === 0 ? 2.05 : 1.55,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        x: Math.random() * width,
        y: Math.random() * height,
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

    const draw = () => {
      context.clearRect(0, 0, width, height);

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
              ? `rgba(240, 106, 27, ${strength * 0.38})`
              : `rgba(17, 17, 17, ${strength * 0.24})`;
            context.stroke();
          }
        }
      }

      points.forEach((point) => {
        const pulse = 0.45 + Math.sin(point.pulse) * 0.3;
        context.beginPath();
        context.arc(point.x, point.y, point.radius + pulse, 0, Math.PI * 2);
        context.fillStyle = point.accent ? "rgba(240, 106, 27, 0.94)" : "rgba(17, 17, 17, 0.52)";
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
