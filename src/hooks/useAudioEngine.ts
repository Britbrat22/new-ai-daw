import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Track, AudioClip } from '@/types/daw';

/* ---------- type maps ---------- */
interface AudioBufferMap { [clipId: string]: AudioBuffer }
interface AudioSourceMap { [clipId: string]: AudioBufferSourceNode }
interface GainNodeMap { [trackId: string]: GainNode }
interface PanNodeMap { [trackId: string]: StereoPannerNode }

/* ---------- constants ---------- */
const SAMPLE_RATE = 44_100;
const OFFLINE_CHANNELS = 2;
const ANALYSER_FPS = 30; // half CPU vs 60

export function useAudioEngine() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const buffersRef = useRef<AudioBufferMap>({});
  const sourcesRef = useRef<AudioSourceMap>({});
  const gainNodesRef = useRef<GainNodeMap>({});
  const panNodesRef = useRef<PanNodeMap>({});
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  /* ---------- state ---------- */
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [analyserData, setAnalyserData] = useState<Uint8Array>(new Uint8Array(128));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  /* ---------- init ---------- */
  const initAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null!; // SSR guard
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const master = ctx.createGain();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      master.connect(analyser).connect(ctx.destination);
      audioContextRef.current = ctx;
      masterGainRef.current = master;
      analyserRef.current = analyser;
    }
    return audioContextRef.current;
  }, []);

  /* ---------- buffer / waveform ---------- */
  const loadAudioBuffer = useCallback(
    async (clipId: string, url: string): Promise<AudioBuffer | null> => {
      const ctx = initAudioContext();
      if (!ctx) return null;
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        buffersRef.current[clipId] = audioBuffer;
        return audioBuffer;
      } catch (e) {
        console.error("loadAudioBuffer:", e);
        return null;
      }
    },
    [initAudioContext]
  );

  const getWaveformData = useCallback(
    async (url: string): Promise<number[]> => {
      const ctx = initAudioContext();
      if (!ctx) return [];
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = await ctx.decodeAudioData(arrayBuffer);
        const data = buffer.getChannelData(0);
        const samples = 200;
        const block = Math.floor(data.length / samples);
        const out: number[] = [];
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < block; j++) sum += Math.abs(data[i * block + j]);
          out.push(sum / block);
        }
        const max = Math.max(...out) || 1;
        return out.map((v) => v / max);
      } catch (e) {
        console.error("getWaveformData:", e);
        return [];
      }
    },
    [initAudioContext]
  );

  /* ---------- per-track nodes ---------- */
  const createTrackNodes = useCallback(
    (track: Track) => {
      const ctx = initAudioContext();
      if (!ctx) return null;
      if (!gainNodesRef.current[track.id]) {
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        gain.connect(pan).connect(masterGainRef.current!);
        gainNodesRef.current[track.id] = gain;
        panNodesRef.current[track.id] = pan;
      }
      gainNodesRef.current[track.id].gain.value = track.muted ? 0 : track.volume;
      panNodesRef.current[track.id].pan.value = track.pan;
      return gainNodesRef.current[track.id];
    },
    [initAudioContext]
  );

  /* ---------- playback ---------- */
  const playClip = useCallback(
    (clip: AudioClip, trackId: string, startOffset = 0) => {
      const ctx = initAudioContext();
      if (!ctx) return;
      const buffer = buffersRef.current[clip.id];
      if (!buffer) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = gainNodesRef.current[trackId] || masterGainRef.current!;
      source.connect(gainNode);

      const clipOffset = Math.max(0, startOffset - clip.startTime);
      const when = Math.max(0, clip.startTime - startOffset);
      source.start(ctx.currentTime + when, clip.offset + clipOffset);
      sourcesRef.current[clip.id] = source;
    },
    [initAudioContext]
  );

  const play = useCallback(
    (tracks: Track[], fromTime = 0) => {
      const ctx = initAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      tracks.forEach((t) => createTrackNodes(t));
      tracks.forEach((t) => {
        if (t.muted) return;
        t.clips.forEach((c) => buffersRef.current[c.id] && playClip(c, t.id, fromTime));
      });

      startTimeRef.current = ctx.currentTime - fromTime;
      setIsPlaying(true);
    },
    [initAudioContext, createTrackNodes, playClip]
  );

  const stop = useCallback(() => {
    Object.values(sourcesRef.current).forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    sourcesRef.current = {};
    if (audioContextRef.current)
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    setIsPlaying(false);
  }, []);

  const pause = useCallback(() => {
    if (audioContextRef.current)
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current;
    stop();
  }, [stop]);

  /* ---------- recording ---------- */
  const startRecording = useCallback(async (): Promise<void> => {
    if (typeof navigator === "undefined") return; // SSR guard
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && recordedChunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (e) {
      console.error("startRecording:", e);
      throw e;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve(null);
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        resolve(blob);
      };
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    });
  }, []);

  /* ---------- mixer updates ---------- */
  const updateTrackVolume = useCallback((trackId: string, volume: number, muted: boolean) => {
    const g = gainNodesRef.current[trackId];
    if (g) g.gain.value = muted ? 0 : volume;
  }, []);

  const updateTrackPan = useCallback((trackId: string, pan: number) => {
    const p = panNodesRef.current[trackId];
    if (p) p.pan.value = pan;
  }, []);

  /* ---------- analyser ---------- */
  const getAnalyserData = useCallback(() => {
    const a = analyserRef.current;
    if (!a) return new Uint8Array(128);
    const out = new Uint8Array(a.frequencyBinCount);
    try {
      a.getByteFrequencyData(out);
    } catch {}
    return out;
  }, []);

  /* ---------- time update loop ---------- */
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const tick = () => {
      if (audioContextRef.current) {
        setCurrentTime(audioContextRef.current.currentTime - startTimeRef.current);
        setAnalyserData(getAnalyserData());
      }
      raf = requestAnimationFrame(tick);
    };
    const id = setInterval(tick, 1000 / ANALYSER_FPS);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [isPlaying, getAnalyserData]);

  /* ---------- export mix (offline) ---------- */
  const exportMix = useCallback(
    async (tracks: Track[], duration: number): Promise<Blob> => {
      const ctx = new OfflineAudioContext(OFFLINE_CHANNELS, duration * SAMPLE_RATE, SAMPLE_RATE);
      const master = ctx.createGain();
      master.connect(ctx.destination);

      for (const t of tracks) {
        if (t.muted) continue;
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        gain.gain.value = t.volume;
        pan.pan.value = t.pan;
        gain.connect(pan).connect(master);

        for (const c of t.clips) {
          const b = buffersRef.current[c.id];
          if (b) {
            const src = ctx.createBufferSource();
            src.buffer = b;
            src.connect(gain);
            src.start(c.startTime, c.offset);
          }
        }
      }

      const rendered = await ctx.startRendering();
      return audioBufferToWav(rendered);
    },
    []
  );

  /* ---------- util: AudioBuffer → WAV blob ---------- */
  function audioBufferToWav(buffer: AudioBuffer): Blob {
    const len = buffer.length;
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = len * blockAlign;
    const bufferSize = 44 + dataSize;

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    const writeString = (offset: number, str: string) =>
      [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));

    /* RIFF header */
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    /* interleaved samples */
    let offset = 44;
    for (let i = 0; i < len; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /* ---------- public API ---------- */
  return useMemo(
    () => ({
      isPlaying,
      isRecording,
      currentTime,
      analyserData,
      play,
      pause,
      stop,
      loadAudioBuffer,
      getWaveformData,
      startRecording,
      stopRecording,
      updateTrackVolume,
      updateTrackPan,
      exportMix,
      setCurrentTime: (t: number) => {
        pauseTimeRef.current = t;
        setCurrentTime(t);
      },
    }),
    [
      isPlaying,
      isRecording,
      currentTime,
      analyserData,
      play,
      pause,
      stop,
      loadAudioBuffer,
      getWaveformData,
      startRecording,
      stopRecording,
      updateTrackVolume,
      updateTrackPan,
      exportMix,
    ]
  );
}
