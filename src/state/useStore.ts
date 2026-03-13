import { create } from 'zustand';
import { User } from 'firebase/auth';

export interface Song {
  id: string;
  name: string;
  artist: string;
  url: string;
  duration: number;
  file?: File;
}

export type FigureType = '2d' | '3d' | 'glb';
export type ViewMode = '2d' | '3d';

// v1: Dance style changes the animation curve per dancer
export type DanceStyle = 'fluid' | 'sharp' | 'bounce' | 'groove';

export interface Figure {
  id: string;
  type: FigureType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  sensitivity: number;
  speed: number;
  intensity: number;
  name: string;
  url?: string; // For GLB models
  danceStyle?: DanceStyle; // v1: per-dancer animation style
  spotlight?: boolean;     // v2: emit colored spotlight
}

export type BackgroundType = 'neon-grid' | 'stars' | 'gradient' | 'space';

// v3: Stage preset - snapshot of the entire stage configuration
export interface StagePreset {
  id: string;
  name: string;
  background: BackgroundType;
  stageAccentColor: string;
  createdAt: string;
}

interface AppState {
  // Auth State
  user: User | null;
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;

  // Player State
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;

  // Stage State
  viewMode: ViewMode;
  figures: Figure[];
  background: BackgroundType;
  selectedFigureId: string | null;
  isTransformOpen: boolean;

  // v1: Stage accent color (the neon glow color)
  stageAccentColor: string;

  // v3: Stage presets
  stagePresets: StagePreset[];

  // Playback progress (0–1) for the real progress bar
  playbackProgress: number;
  setPlaybackProgress: (p: number) => void;

  // Recording State
  isRecording: boolean;

  // Actions
  setSongs: (songs: Song[]) => void;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;

  setViewMode: (mode: ViewMode) => void;
  setBackground: (bg: BackgroundType) => void;
  setSelectedFigureId: (id: string | null) => void;
  setTransformOpen: (open: boolean) => void;
  setFigures: (figures: Figure[]) => void;

  // v1
  setStageAccentColor: (color: string) => void;

  // v3
  setStagePresets: (presets: StagePreset[]) => void;

  setIsRecording: (recording: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthLoading: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),

  songs: [],
  currentSong: null,
  isPlaying: false,
  volume: 0.8,

  viewMode: '3d',
  figures: [],
  background: 'neon-grid',
  selectedFigureId: null,
  isTransformOpen: false,

  stageAccentColor: '#00d4ff',
  stagePresets: [],

  playbackProgress: 0,
  setPlaybackProgress: (p) => set({ playbackProgress: p }),

  isRecording: false,

  setSongs: (songs) => set({ songs }),
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: !!song }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setBackground: (bg) => set({ background: bg }),
  setSelectedFigureId: (id) => set({ selectedFigureId: id }),
  setTransformOpen: (open) => set({ isTransformOpen: open }),
  setFigures: (figures) => set({ figures }),

  setStageAccentColor: (color) => set({ stageAccentColor: color }),
  setStagePresets: (presets) => set({ stagePresets: presets }),

  setIsRecording: (recording) => set({ isRecording: recording }),
}));
