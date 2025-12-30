import React, { memo, useCallback, useRef, useState } from 'react';
import { Track } from '@/types/daw';
import { Volume2, VolumeX } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* -------------------------- helpers ------------------------------- */
/* ------------------------------------------------------------------ */
const gainToDb = (g: number): string => (g === 0 ? '-∞' : `${Math.round((g - 1) * 12)}`);
const dbToGain = (db: number): number => (db <= -60 ? 0 : 10 ** (db / 20));

/* ------------------------------------------------------------------ */
/* ------------------------ Knob / Fader ---------------------------- */
/* ------------------------------------------------------------------ */
const VerticalFader = memo(
  ({
    value,
    onChange,
    color,
  }: {
    value: number;
    onChange: (v: number) => void;
    color: string;
  }) => {
    const ref = useRef<HTMLInputElement>(null);
    const [drag, setDrag] = useState(false);
    const startY = useRef(0);
    const startV = useRef(0);

    const pxToValue = (dy: number) =>
      Math.max(0, Math.min(1, startV.current - dy / 200)); // 200 px = full scale

    const onMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!drag) return;
        onChange(pxToValue(e.clientY - startY.current));
      },
      [drag, onChange]
    );

    const onMouseUp = useCallback(() => {
      setDrag(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }, [onMouseMove]);

    const onMouseDown = (e: React.MouseEvent) => {
      startY.current = e.clientY;
      startV.current = value;
      setDrag(true);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    return (
      <div className="relative h-full w-6 flex items-center">
        {/* track */}
        <div className="absolute w-1 bg-[#3a3a3a] rounded-full h-full" />
        {/* handle */}
        <div
          className="absolute w-6 h-3 bg-[#4a4a4a] rounded pointer-events-none"
          style={{ bottom: `${value * 100}%`, transform: 'translateY(50%)' }}
        />
        {/* invisible range input for accessibility + wheel */}
        <input
          ref={ref}
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={onMouseDown}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />
      </div>
    );
  }
);
VerticalFader.displayName = 'VerticalFader';

/* ------------------------------------------------------------------ */
/* ---------------------------- Pan --------------------------------- */
/* ------------------------------------------------------------------ */
const PanKnob = memo(
  ({
    value,
    onChange,
  }: {
    value: number; // -1 … 1
    onChange: (v: number) => void;
  }) => {
    const [drag, setDrag] = useState(false);
    const startX = useRef(0);
    const startV = useRef(0);

    const onMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!drag) return;
        const delta = (e.clientX - startX.current) * 0.01; // 0.5 ° per px
        onChange(Math.max(-1, Math.min(1, startV.current + delta)));
      },
      [drag, onChange]
    );

    const onMouseUp = useCallback(() => {
      setDrag(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }, [onMouseMove]);

    const onMouseDown = (e: React.MouseEvent) => {
      startX.current = e.clientX;
      startV.current = value;
      setDrag(true);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const angle = value * 135; // ±135 ° visual rotation

    return (
      <div
        className="relative w-8 h-8 select-none"
        onMouseDown={onMouseDown}
        onDoubleClick={() => onChange(0)}
        title={`Pan: ${value === 0 ? 'C' : value < 0 ? `L${Math.abs(value * 100).toFixed(0)}` : `R${(value * 100).toFixed(0)}`}`}
      >
        <div className="absolute inset-0 rounded-full bg-[#2d2d2d
