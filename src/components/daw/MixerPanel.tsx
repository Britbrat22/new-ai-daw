
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
        <div className="absolute inset-0 rounded-full bg-[#2d2d2d] border border-[#3a3a3a]" />
        <div
          className="absolute w-0.5 h-3 bg-white rounded-full left-1/2 -translate-x-1/2 origin-bottom"
          style={{ top: '4px', transform: `translateX(-50%) rotate(${angle}deg)` }}
        />
      </div>
    );
  }
);
PanKnob.displayName = 'PanKnob';

/* ------------------------------------------------------------------ */
/* ------------------------ Track Strip ----------------------------- */
/* ------------------------------------------------------------------ */
const TrackStrip = memo(
  ({
    track,
    index,
    hasSolo,
    analyser,
    onVolume,
    onPan,
    onMute,
    onSolo,
  }: {
    track: Track;
    index: number;
    hasSolo: boolean;
    analyser: Uint8Array;
    onVolume: (v: number) => void;
    onPan: (v: number) => void;
    onMute: () => void;
    onSolo: () => void;
  }) => {
    const effectiveMuted = track.muted || (hasSolo && !track.solo);
    const meterLevel = effectiveMuted ? 0 : (analyser[Math.floor((index / (analyser.length || 1)) * analyser.length)] || 0) / 255;

    /* ------------- numeric input pop-over ---------------- */
    const [showEdit, setShowEdit] = useState<'vol' | 'pan' | null>(null);
    const [text, setText] = useState('');

    const openVol = () => {
      setText(gainToDb(track.volume));
      setShowEdit('vol');
    };
    const openPan = () => {
      setText(track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`);
      setShowEdit('pan');
    };

    const commit = () => {
      if (showEdit === 'vol') {
        const db = text === '-∞' ? -60 : parseFloat(text);
        if (!Number.isNaN(db)) onVolume(dbToGain(db));
      }
      if (showEdit === 'pan') {
        const clean = text.toUpperCase().replace(/[^LR0-9]/g, '');
        if (clean === 'C' || clean === '') onPan(0);
        else {
          const dir = clean[0] === 'L' ? -1 : 1;
          const num = parseInt(clean.slice(1), 10) || 0;
          onPan(Math.max(-1, Math.min(1, (num / 100) * dir)));
        }
      }
      setShowEdit(null);
    };

    return (
      <div className="flex-shrink-0 w-20 border-r border-[#3a3a3a] flex flex-col">
        {/* name */}
        <div className="h-6 px-2 flex items-center justify-center text-xs font-medium truncate" style={{ backgroundColor: `${track.color}33`, color: track.color }}>
          {track.name}
        </div>

        {/* fader + meter */}
        <div className="flex-1 flex items-center justify-center gap-2 px-2 py-2">
          <div className="w-3 h-full bg-[#1a1a1a] rounded-full overflow-hidden flex flex-col-reverse">
            <div className="w-full transition-all duration-75" style={{ height: `${meterLevel * 100}%`, background: `linear-gradient(to top, ${track.color}, ${track.color}88)` }} />
          </div>
          <VerticalFader value={track.volume} onChange={onVolume} color={track.color} />
        </div>

        {/* pan */}
        <div className="h-8 flex items-center justify-center" onClick={openPan}>
          <PanKnob value={track.pan} onChange={onPan} />
        </div>

        {/* buttons */}
        <div className="h-8 flex items-center justify-center gap-1 px-1">
          <button onClick={onMute} className={`w-6 h-5 rounded text-[10px] font-bold ${track.muted ? 'bg-red-500/30 text-red-500' : 'bg-[#2d2d2d] text-gray-500 hover:text-white'}`}>
            M
          </button>
          <button onClick={onSolo} className={`w-6 h-5 rounded text-[10px] font-bold ${track.solo ? 'bg-yellow-500/30 text-yellow-500' : 'bg-[#2d2d2d] text-gray-500 hover:text-white'}`}>
            S
          </button>
        </div>

        {/* dB label */}
        <div className="h-5 flex items-center justify-center">
          <span className="text-[10px] text-gray-500 font-mono cursor-pointer" onClick={openVol}>
            {gainToDb(track.volume)}dB
          </span>
        </div>

        {/* tiny pop-over editor */}
        {showEdit && (
          <div className="absolute z-10 bg-[#2d2d2d] border border-[#444] rounded px-1 py-0.5 mt-8">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && commit()}
              className="w-14 text-xs bg-transparent text-white outline-none"
              autoFocus
            />
          </div>
        )}
      </div>
    );
  }
);
TrackStrip.displayName = 'TrackStrip';

/* ------------------------------------------------------------------ */
/* ------------------------- Master Strip --------------------------- */
/* ------------------------------------------------------------------ */
const MasterStrip = memo(
  ({
    volume,
    onChange,
    analyser,
  }: {
    volume: number;
    onChange: (v: number) => void;
    analyser: Uint8Array;
  }) => {
    const L = (analyser[0] || 0) / 255;
    const R = (analyser[1] || 0) / 255;
    return (
      <div className="flex-shrink-0 w-24 bg-[#252525] flex flex-col">
        <div className="h-6 px-2 flex items-center justify-center text-xs font-bold text-white bg-[#3a3a3a]">MASTER</div>
        <div className="flex-1 flex items-center justify-center gap-2 px-2 py-2">
          <div className="flex gap-1 h-full">
            <div className="w-2 h-full bg-[#1a1a1a] rounded-full overflow-hidden flex flex-col-reverse">
              <div className="w-full transition-all duration-75" style={{ height: `${L * 100}%`, background: 'linear-gradient(to top, #7fff00, #ffd93d, #ff6b6b)' }} />
            </div>
            <div className="w-2 h-full bg-[#1a1a1a] rounded-full overflow-hidden flex flex-col-reverse">
              <div className="w-full transition-all duration-75" style={{ height: `${R * 100}%`, background: 'linear-gradient(to top, #7fff00, #ffd93d, #ff6b6b)' }} />
            </div>
          </div>
          <VerticalFader value={volume} onChange={onChange} color="#00d4ff" />
        </div>
        <div className="h-8 flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-gray-400" />
        </div>
        <div className="h-8" />
        <div className="h-5 flex items-center justify-center">
          <span className="text-xs text-[#00d4ff] font-mono font-bold">{gainToDb(volume)}dB</span>
        </div>
      </div>
    );
  }
);
MasterStrip.displayName = 'MasterStrip';

/* ------------------------------------------------------------------ */
/* -------------------------  Panel  -------------------------------- */
/* ------------------------------------------------------------------ */
export const MixerPanel: React.FC<MixerPanelProps> = ({
  tracks,
  masterVolume,
  analyserData,
  onTrackVolumeChange,
  onTrackPanChange,
  onTrackMuteToggle,
  onTrackSoloToggle,
  onMasterVolumeChange,
}) => {
  const hasSolo = tracks.some((t) => t.solo);

  return (
    <div className="h-48 bg-[#1e1e1e] border-t border-[#3a3a3a] flex overflow-x-auto">
      {tracks.map((t, i) => (
        <TrackStrip
          key={t.id}
          track={t}
          index={i}
          hasSolo={hasSolo}
          analyser={analyserData}
          onVolume={(v) => onTrackVolumeChange(t.id, v)}
          onPan={(v) => onTrackPanChange(t.id, v)}
          onMute={() => onTrackMuteToggle(t.id)}
          onSolo={() => onTrackSoloToggle(t.id)}
        />
      ))}
      <MasterStrip volume={masterVolume} onChange={onMasterVolumeChange} analyser={analyserData} />
    </div>
  );
};
