import React, { useRef, useEffect, memo } from 'react';

interface WaveformProps {
  data: number[];
  color: string;
  height: number;
  width: number;
  className?: string;
}

export const Waveform = memo(function Waveform({
  data,
  color,
  height,
  width,
  className = '',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ---------- retina-size canvas only when W/H change ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.floor(width * dpr);
    cv.height = Math.floor(height * dpr);
    const ctx = cv.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  /* ---------- draw waveform ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || data.length === 0) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const barWidth = width / data.length;
    const centerY = height / 2;
    ctx.fillStyle = color;

    data.forEach((v, i) => {
      const h = v * (height - 4);
      const x = i * barWidth;
      const y = centerY - h / 2;
      const w = Math.max(0.5, barWidth - 1); // guard against sub-pixel
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 1);
      ctx.fill();
    });
  }, [data, color, width, height]);

  /* ---------- imperative clear ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    (cv as any).clear = () => {
      const ctx = cv.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width, height);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
    />
  );
});

/* ------------- demo helper ------------- */
export const generateFakeWaveform = (length = 200): number[] => {
  const out: number[] = [];
  let v = 0.3;
  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * 0.3;
    const wave = Math.sin(i * 0.1) * 0.2;
    const env = Math.sin((i / length) * Math.PI) * 0.3;
    v = Math.max(0.1, Math.min(1, v + noise));
    out.push(v * 0.5 + wave + env + 0.2);
  }
  const max = Math.max(...out);
  return out.map((x) => Math.min(1, x / max));
};
