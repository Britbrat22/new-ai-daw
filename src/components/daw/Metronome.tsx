import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface MetronomeProps {
  bpm: number;
  isPlaying: boolean;
  enabled: boolean;
  onToggle: () => void;
}

export const Metronome: React.FC<MetronomeProps> = ({
  bpm,
  isPlaying,
  enabled,
  onToggle,
}) => {
  /* ---------- visual beat ---------- */
  const [currentBeat, setCurrentBeat] = useState(0);

  /* ---------- audio ---------- */
  const audioCtx = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerId = useRef<number | null>(null);
  const beatRef = useRef(0);            // single source of truth for scheduler

  const playBeep = (when: number, accent: boolean) => {
    if (!audioCtx.current) return;
    const o = audioCtx.current.createOscillator();
    const g = audioCtx.current.createGain();
    o.connect(g).connect(audioCtx.current.destination);
    o.type = 'sine';
    o.frequency.value = accent ? 1000 : 800;
    g.gain.setValueAtTime(0.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.1);
    o.start(when);
    o.stop(when + 0.1);
  };

  /* ---------- scheduler ---------- */
  const scheduleAhead = 0.05; // 50 ms lookahead
  const lookahead = 25;       // ms between scheduler ticks

  const scheduler = () => {
    if (!audioCtx.current) return;
    const secPerBeat = 60 / bpm;
    while (nextNoteTime.current < audioCtx.current.currentTime + scheduleAhead) {
      playBeep(nextNoteTime.current, beatRef.current === 0);
      nextNoteTime.current += secPerBeat;
      beatRef.current = (beatRef.current + 1) % 4;
      setCurrentBeat(beatRef.current); // flush to React once
    }
    timerId.current = window.setTimeout(scheduler, lookahead);
  };

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    if (isPlaying && enabled) {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }
      beatRef.current = 0;
      setCurrentBeat(0);
      nextNoteTime.current = audioCtx.current.currentTime;
      scheduler();
    } else {
      if (timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;
      }
      beatRef.current = 0;
      setCurrentBeat(0);
    }
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [isPlaying, enabled, bpm]);

  /* ---------- resume on first user gesture ---------- */
  const handleToggle = async () => {
    if (audioCtx.current?.state === 'suspended') await audioCtx.current.resume();
    onToggle();
  };

  /* ---------- render ---------- */
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
          enabled
            ? 'bg-[#ffd93d]/20 text-[#ffd93d]'
            : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
        }`}
      >
        {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* beat indicators */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              currentBeat === i && isPlaying && enabled
                ? i === 0
                  ? 'bg-[#ffd93d] scale-125'
                  : 'bg-[#00d4ff] scale-110'
                : 'bg-[#3a3a3a]'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
