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
  danceStyle?: DanceStyle;
  hasSpotlight?: boolean;
}

export type BackgroundType = 'neon-grid' | 'stars' | 'gradient' | 'space';

export interface StagePreset {
  id: string;
  name: string;
  background: BackgroundType;
  stageGlowColor: string;
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
  viewMode: FigureType;
  figures: Figure[];
  presets: StagePreset[];
  background: BackgroundType;
  stageGlowColor: string;
  selectedFigureId: string | null;
  isTransformOpen: boolean;
  audienceMode: boolean;
  
  // Recording State
  isRecording: boolean;
  
  // Actions
  setSongs: (songs: Song[]) => void;
  setCurrentSong: (song: Song | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  
  setViewMode: (mode: FigureType) => void;
  setBackground: (bg: BackgroundType) => void;
  setStageGlowColor: (color: string) => void;
  setSelectedFigureId: (id: string | null) => void;
  setTransformOpen: (open: boolean) => void;
  setAudienceMode: (enabled: boolean) => void;
  setFigures: (figures: Figure[]) => void;
  setPresets: (presets: StagePreset[]) => void;
  
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
  presets: [],
  background: 'neon-grid',
  stageGlowColor: '#00d4ff',
  selectedFigureId: null,
  isTransformOpen: false,
  audienceMode: false,
  
  isRecording: false,

  setSongs: (songs) => set({ songs }),
  setCurrentSong: (song) => set({ currentSong: song, isPlaying: !!song }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  setBackground: (bg) => set({ background: bg }),
  setStageGlowColor: (color) => set({ stageGlowColor: color }),
  setSelectedFigureId: (id) => set({ selectedFigureId: id }),
  setTransformOpen: (open) => set({ isTransformOpen: open }),
  setAudienceMode: (enabled) => set({ audienceMode: enabled }),
  setFigures: (figures) => set({ figures }),
  setPresets: (presets) => set({ presets }),
  
  setIsRecording: (recording) => set({ isRecording: recording }),
}));
