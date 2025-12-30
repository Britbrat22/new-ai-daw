import React, { useRef, useState, useCallback, useMemo, memo } from 'react';
import { Track, AudioClip } from '@/types/daw';
import { TrackHeader } from './TrackHeader';
import { AudioClipComponent } from './AudioClipComponent';
import { Plus, ZoomIn, ZoomOut, Magnet, MousePointer, Scissors } from 'lucide-react';

interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  duration: number;
  zoom: number;
  bpm: number;
  snapEnabled: boolean;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  tool: 'select' | 'cut' | 'draw';
  onTrackSelect: (trackId: string) => void;
  onClipSelect: (clipId: string) => void;
  onTrackUpdate: (trackId: string, updates: Partial<Track>) => void;
  onClipUpdate: (trackId: string, clipId: string, updates: Partial<AudioClip>) => void;
  onClipDelete: (trackId: string, clipId: string) => void;
  onClipDuplicate: (trackId: string, clipId: string) => void;
  onClipSplit: (trackId: string, clipId: string, splitTime: number) => void;
  onAddTrack: () => void;
  onZoomChange: (zoom: number) => void;
  onSnapToggle: () => void;
  onToolChange: (tool: 'select' | 'cut' | 'draw') => void;
  onSeek: (time: number) => void;
  onDropAudio: (trackId: string, file: File, startTime: number) => void;
}

const TRACK_HEIGHT = 96;
const HEADER_WIDTH = 200;

export const Timeline = memo(function Timeline({
  tracks,
  currentTime,
  duration,
  zoom,
  bpm,
  snapEnabled,
  selectedTrackId,
  selectedClipId,
  tool,
  onTrackSelect,
  onClipSelect,
  onTrackUpdate,
  onClipUpdate,
  onClipDelete,
  onClipDuplicate,
  onClipSplit,
  onAddTrack,
  onZoomChange,
  onSnapToggle,
  onToolChange,
  onSeek,
  onDropAudio,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [dragOverTrack, setDragOverTrack] = useState<string | null>(null);

  const pixelsPerSecond = zoom;
  const timelineWidth = Math.max(duration * pixelsPerSecond, 2000);
  const beatsPerSecond = bpm / 60;
  const pixelsPerBeat = pixelsPerSecond / beatsPerSecond;
  const pixelsPerBar = pixelsPerBeat * 4;
  const hasSolo = tracks.some((t) => t.solo);

  /* ---------- stable rulers (only rebuild when zoom really changes) ---------- */
  const rulerMarkers = useMemo(() => {
    const totalBars = Math.ceil(duration * beatsPerSecond / 4) + 10;
    const bars: JSX.Element[] = [];
    for (let bar = 0; bar <= totalBars; bar++) {
      const x = bar * pixelsPerBar;
      bars.push(
        <div key={`bar-${bar}`} className="absolute top-0 bottom-0 border-l border-[#3a3a3a]" style={{ left: `${x}px` }}>
          <span className="absolute top-1 left-1 text-[10px] text-gray-500 font-mono">{bar + 1}</span>
        </div>
      );
      for (let beat = 1; beat < 4; beat++) {
        const beatX = x + beat * pixelsPerBeat;
        bars.push(
          <div key={`beat-${bar}-${beat}`} className="absolute top-4 bottom-0 border-l border-[#2a2a3a]" style={{ left: `${beatX}px` }} />
        );
      }
    }
    return bars;
  }, [duration, pixelsPerBar, pixelsPerBeat]);

  /* ---------- 60 fps scrub ---------- */
  const seekRaf = useRef<number>(0);
  const scrubTo = useRef(currentTime);
  useEffect(() => {
    scrubTo.current = currentTime;
  }, [currentTime]);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      scrubTo.current = Math.max(0, x / pixelsPerSecond);

      const scrub = () => {
        onSeek(scrubTo.current);
        seekRaf.current = requestAnimationFrame(scrub);
      };
      scrub();

      const up = () => cancelAnimationFrame(seekRaf.current);
      window.addEventListener('mouseup', up, { once: true });
    },
    [scrollX, pixelsPerSecond, onSeek]
  );

  /* ---------- drag & drop ---------- */
  const handleDragOver = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    setDragOverTrack(trackId);
  }, []);

  const handleDragLeave = useCallback(() => setDragOverTrack(null), []);
  const handleDrop = useCallback(
    (e: React.DragEvent, trackId: string) => {
      e.preventDefault();
      setDragOverTrack(null);
      if (!timelineRef.current) return;
      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find((f) => f.type.startsWith('audio/') || /\.(wav|mp3|aac|flac|ogg|m4a)$/i.test(f.name));
      if (audioFile) {
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left + scrollX;
        onDropAudio(trackId, audioFile, Math.max(0, x / pixelsPerSecond));
      }
    },
    [scrollX, onDropAudio, pixelsPerSecond]
  );

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 bg-[#252525] border-b border-[#3a3a3a] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          {(['select', 'cut', 'draw'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onToolChange(t)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${tool === t ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'select' && <MousePointer className="w-4 h-4" />}
              {t === 'cut' && <Scissors className="w-4 h-4" />}
              {t === 'draw' && <Plus className="w-4 h-4" />}
            </button>
          ))}
          <div className="w-px h-6 bg-[#3a3a3a] mx-1" />
          <button type="button" onClick={onSnapToggle} className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${snapEnabled ? 'bg-[#b24bf3]/20 text-[#b24bf3]' : 'text-gray-400 hover:text-white'}`}>
            <Magnet className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onZoomChange(Math.max(20, zoom - 20))} className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-24 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div className="h-full bg-[#00d4ff]" style={{ width: `${((zoom - 20) / 180) * 100}%` }} />
          </div>
          <button type="button" onClick={() => onZoomChange(Math.min(200, zoom + 20))} className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Headers */}
        <div className="flex-shrink-0 bg-[#252525] border-r border-[#3a3a3a]" style={{ width: HEADER_WIDTH }}>
          <div className="h-8 border-b border-[#3a3a3a]" />
          {tracks.map((track) => (
            <TrackHeader
              key={track.id}
              track={track}
              isSelected={selectedTrackId === track.id}
              hasSolo={hasSolo}
              onSelect={() => onTrackSelect(track.id)}
              onVolumeChange={(volume) => onTrackUpdate(track.id, { volume })}
              onPanChange={(pan) => onTrackUpdate(track.id, { pan })}
              onMuteToggle={() => onTrackUpdate(track.id, { muted: !track.muted })}
              onSoloToggle={() => onTrackUpdate(track.id, { solo: !track.solo })}
              onArmToggle={() => onTrackUpdate(track.id, { armed: !track.armed })}
              onNameChange={(name) => onTrackUpdate(track.id, { name })}
              onColorChange={(color) => onTrackUpdate(track.id, { color })}
            />
          ))}
          <button type="button" onClick={onAddTrack} className="w-full h-10 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-[#2d2d2d] transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Track</span>
          </button>
        </div>

        {/* Timeline */}
        <div ref={timelineRef} className="flex-1 overflow-auto" onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}>
          <div style={{ width: timelineWidth, minHeight: '100%' }}>
            {/* Ruler */}
