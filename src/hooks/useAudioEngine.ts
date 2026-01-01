import { useRef } from "react"
import type { Track, AudioClip } from "@/types/daw"

export function useAudioEngine() {
  const audioContext = useRef<AudioContext | null>(null)

  if (!audioContext.current) {
    audioContext.current = new AudioContext()
  }

  return {
    context: audioContext.current,
    loadClip: async (_clip: AudioClip) => {},
    playTrack: (_track: Track) => {},
  }
}
