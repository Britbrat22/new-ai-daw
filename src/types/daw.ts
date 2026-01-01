export interface AudioClip {
  id: string
  name: string
  url: string
  startTime: number
  duration: number
  offset: number
}

export interface Track {
  id: string
  name: string
  clips: AudioClip[]
}

export interface Project {
  id: string
  name: string
  tracks: Track[]
}
