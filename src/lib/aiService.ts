import { supabase } from './supabase';

export interface AIProcessResult {
  success: boolean;
  action: string;
  message?: string;
  data?: Record<string, any>;
  error?: string;
}

/* ---------- real AI functions ---------- */
export async function cleanVocals(audioUrl?: string): Promise<AIProcessResult> {
  const { data, error } = await supabase.functions.invoke('ai-audio-process', {
    body: { action: 'clean_vocals', audioUrl },
  });
  return error
    ? { success: false, action: 'clean_vocals', error: error.message }
    : (data as AIProcessResult);
}

export async function isolateVocals(audioUrl?: string): Promise<AIProcessResult> {
  const { data, error } = await supabase.functions.invoke('ai-audio-process', {
    body: { action: 'isolate_vocals', audioUrl },
  });
  return error
    ? { success: false, action: 'isolate_vocals', error: error.message }
    : (data as AIProcessResult);
}

export async function generateBeat(
  genre: string,
  bpm?: number,
  key?: string
): Promise<AIProcessResult> {
  const { data, error } = await supabase.functions.invoke('ai-audio-process', {
    body: { action: 'generate_beat', genre, bpm, key },
  });
  return error
    ? { success: false, action: 'generate_beat', error: error.message }
    : (data as AIProcessResult);
}

export async function autoMix(): Promise<AIProcessResult> {
  const { data, error } = await supabase.functions.invoke('ai-audio-process', {
    body: { action: 'auto_mix' },
  });
  return error
    ? { success: false, action: 'auto_mix', error: error.message }
    : (data as AIProcessResult);
}

export async function masterTrack(preset: string): Promise<AIProcessResult> {
  const { data, error } = await supabase.functions.invoke('ai-audio-process', {
    body: { action: 'master', preset },
  });
  return error
    ? { success: false, action: 'master', error: error.message }
    : (data as AIProcessResult);
}

/* ---------- mock analyser (SSR-safe) ---------- */
const randomAnalyser = () => ({
  bpm: Math.floor(80 + Math.random() * 80), // 80-160
  key: (['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const)[Math.floor(Math.random() * 7)] +
       (Math.random() > 0.5 ? ' major' : ' minor'),
  mood: (['energetic', 'melancholic', 'uplifting', 'dark', 'chill'] as const)[Math.floor(Math.random() * 5)],
  duration: 180,
});

export async function analyzeAudio(audioUrl: string): Promise<ReturnType<typeof randomAnalyser>> {
  // Guard window so file can be imported in SSR
  if (typeof window === "undefined") return randomAnalyser();

  // Fake network delay
  await new Promise((r) => setTimeout(r, 500));
  return randomAnalyser();
}
