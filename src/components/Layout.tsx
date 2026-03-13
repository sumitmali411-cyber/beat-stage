import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/useStore';
import { audioEngine } from '../core/AudioEngine';
import { auth, db, logout } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Music, User, Trash2, Plus, Settings, Monitor, 
  Box, Disc, Search, Radio, Mic, Video, Download,
  X, Layers, Move, FileCode, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Sidebar Components ---

const Sidebar = () => {
  const { 
    user, songs, currentSong, setCurrentSong, 
    figures, background, setBackground,
    selectedFigureId, setSelectedFigureId
  } = useStore();
  
  const [ytLink, setYtLink] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && user) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        await addDoc(collection(db, 'users', user.uid, 'songs'), {
          uid: user.uid,
          name: file.name.replace(/\.[^/.]+$/, ""),
          artist: "Local Artist",
          url: URL.createObjectURL(file), // Note: In a real app, upload to Storage
          duration: 0,
          createdAt: new Date().toISOString()
        });
      }
    }
  };

  const handleGlbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      await addDoc(collection(db, 'users', user.uid, 'figures'), {
        uid: user.uid,
        type: 'glb',
        url,
        name: file.name.replace(/\.[^/.]+$/, ""),
        position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 2],
        rotation: [0, 0, 0],
        scale: 1,
        color: '#ffffff',
        sensitivity: 1,
        speed: 1,
        intensity: 1
      });
    }
  };

  const handleAddFigure = async (type: '2d' | '3d') => {
    if (!user) return;
    await addDoc(collection(db, 'users', user.uid, 'figures'), {
      uid: user.uid,
      type,
      position: [(Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 2],
      rotation: [0, 0, 0],
      scale: 1,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      sensitivity: 1,
      speed: 1,
      intensity: 1,
      name: `Dancer ${figures.length + 1}`
    });
  };

  const handleRemoveFigure = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'figures', id));
  };

  const handleUpdateFigure = async (id: string, updates: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'figures', id), updates);
  };

  const handleRemoveSong = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'songs', id));
  };

  const handleAddYtMusic = async () => {
    if (!ytLink || !user) return;
    
    const isYt = ytLink.includes('youtube.com') || ytLink.includes('youtu.be');
    const streamUrl = isYt ? `/api/stream?url=${encodeURIComponent(ytLink)}` : ytLink;
    
    await addDoc(collection(db, 'users', user.uid, 'songs'), {
      uid: user.uid,
      name: isYt ? "YT Music Stream" : "External Link",
      artist: isYt ? "YouTube" : "External",
      url: streamUrl, 
      duration: 180,
      createdAt: new Date().toISOString()
    });
    setYtLink('');
  };

  return (
    <div className="w-80 h-full glass-panel flex flex-col border-r border-white/5">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tighter text-accent-cool flex items-center gap-2">
          <Disc className="animate-spin-slow" /> BEATSTAGE
        </h1>
        <button 
          onClick={logout}
          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-accent-hot transition-all"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <img src={user?.photoURL || ''} className="w-8 h-8 rounded-full border border-white/10" alt="User" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-white truncate">{user?.displayName}</p>
          <p className="text-[9px] text-slate-500 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        {/* Background Selection */}
        <section>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Background</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['neon-grid', 'stars', 'gradient', 'space'].map((bg) => (
              <button
                key={bg}
                onClick={() => setBackground(bg as any)}
                className={cn(
                  "px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border",
                  background === bg ? "bg-accent-cool text-black border-accent-cool" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                )}
              >
                {bg.replace('-', ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* Song Pool */}
        <section>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Song Pool</h2>
            <label className="cursor-pointer hover:text-accent-cool transition-colors">
              <Plus size={16} />
              <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="space-y-1">
            {songs.map(song => (
              <div 
                key={song.id}
                onClick={() => setCurrentSong(song)}
                className={cn(
                  "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                  currentSong?.id === song.id ? "bg-accent-cool/20 text-accent-cool" : "hover:bg-white/5"
                )}
              >
                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center">
                  <Music size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{song.artist}</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-accent-hot transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {songs.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-xs text-slate-500">Drop songs here</p>
              </div>
            )}
          </div>
        </section>

        {/* Figure Management */}
        <section>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Figures</h2>
            <div className="flex gap-2">
              <button onClick={() => handleAddFigure('2d')} className="hover:text-accent-cool transition-colors" title="Add 2D Figure"><Layers size={14} /></button>
              <button onClick={() => handleAddFigure('3d')} className="hover:text-accent-cool transition-colors" title="Add 3D Figure"><Box size={14} /></button>
              <label className="cursor-pointer hover:text-accent-cool transition-colors" title="Upload GLB Model">
                <FileCode size={14} />
                <input type="file" accept=".glb,.gltf" className="hidden" onChange={handleGlbChange} />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            {figures.map(fig => (
              <div 
                key={fig.id} 
                onClick={() => setSelectedFigureId(fig.id)}
                className={cn(
                  "p-3 rounded-xl bg-white/5 border transition-all cursor-pointer space-y-2",
                  selectedFigureId === fig.id ? "border-accent-cool ring-1 ring-accent-cool/50" : "border-white/5"
                )}
              >
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {fig.type === '3d' ? <Box size={14} /> : (fig.type === 'glb' ? <FileCode size={14} /> : <Layers size={14} />)}
                    <span className="text-xs font-medium">{fig.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveFigure(fig.id); }} className="text-slate-500 hover:text-accent-hot"><X size={14} /></button>
                </div>
                
                {selectedFigureId === fig.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-3 pt-2 border-t border-white/5 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase flex justify-between">
                          Speed <span>{fig.speed.toFixed(1)}x</span>
                        </label>
                        <input 
                          type="range" min="0.1" max="3" step="0.1" 
                          value={fig.speed} 
                          onChange={(e) => handleUpdateFigure(fig.id, { speed: parseFloat(e.target.value) })}
                          className="w-full accent-accent-cool h-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase flex justify-between">
                          Intensity <span>{fig.intensity.toFixed(1)}</span>
                        </label>
                        <input 
                          type="range" min="0.1" max="3" step="0.1" 
                          value={fig.intensity} 
                          onChange={(e) => handleUpdateFigure(fig.id, { intensity: parseFloat(e.target.value) })}
                          className="w-full accent-accent-cool h-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase">Sensitivity</label>
                        <input 
                          type="range" min="0.1" max="3" step="0.1" 
                          value={fig.sensitivity} 
                          onChange={(e) => handleUpdateFigure(fig.id, { sensitivity: parseFloat(e.target.value) })}
                          className="w-full accent-accent-cool h-1"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase">Color</label>
                        <input 
                          type="color" 
                          value={fig.color} 
                          onChange={(e) => handleUpdateFigure(fig.id, { color: e.target.value })}
                          className="w-full h-4 bg-transparent border-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* YT Music Personalization */}
        <section className="pt-4 border-t border-white/5">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-600/20 to-transparent border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={16} className="text-red-500" />
              <h3 className="text-xs font-bold uppercase tracking-tighter text-red-500">YT Music Connect</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Paste a YouTube Music link to personalize your stage with your favorite tracks.
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={ytLink}
                onChange={(e) => setYtLink(e.target.value)}
                placeholder="Paste link..." 
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] focus:outline-none focus:border-red-500/50 text-white"
              />
              <button 
                onClick={handleAddYtMusic}
                className="bg-red-600 hover:bg-red-500 text-white p-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// --- Control Bar Components ---

const ControlBar = () => {
  const { currentSong, isPlaying, setIsPlaying, volume, setVolume, isRecording, setIsRecording } = useStore();
  
  const togglePlay = async () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioEngine.play(volume);
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
      }
    }
  };

  useEffect(() => {
    if (currentSong) {
      audioEngine.loadSong(currentSong.url)
        .then(() => {
          if (isPlaying) {
            audioEngine.play(volume).catch(console.error);
          }
        })
        .catch(async (err) => {
          console.error("Failed to load song:", err);
          setIsPlaying(false);
          
          let message = `Failed to load song. Error: ${err.message}`;
          
          // Try to get more info if it's a proxy error
          if (currentSong.url.startsWith('/api/stream')) {
            try {
              const response = await fetch(currentSong.url);
              if (!response.ok) {
                const errorData = await response.json();
                if (errorData.code === 'BOT_DETECTION') {
                  message = "YouTube has blocked this request due to bot detection. This is common on cloud servers. Please try another link or upload a local MP3/WAV file for 100% reliability.";
                } else if (errorData.message) {
                  message = `YouTube Stream Error: ${errorData.message}`;
                }
              }
            } catch (jsonErr) {
              // Fallback to generic error if JSON parsing fails
              if (err.message.includes('403')) {
                message = "YouTube blocked the request (403 Forbidden). This usually means bot detection is active for this IP range.";
              }
            }
          } else if (err.message.includes('404')) {
            message = "The requested audio file could not be found (404).";
          } else if (err.message.includes('CORS')) {
            message = "Browser security (CORS) blocked the direct stream. Please use the YouTube proxy or local files.";
          }
          
          alert(message);
        });
    }
  }, [currentSong]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  return (
    <div className="h-24 glass-panel border-t border-white/5 flex items-center px-8 gap-12">
      {/* Now Playing */}
      <div className="w-64 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-accent-cool/10 flex items-center justify-center text-accent-cool border border-accent-cool/20">
          <Disc className={cn(isPlaying && "animate-spin-slow")} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{currentSong?.name || "No Song Selected"}</h3>
          <p className="text-xs text-slate-500 truncate">{currentSong?.artist || "Pick a song to start"}</p>
        </div>
      </div>

      {/* Main Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-6">
          <button className="text-slate-500 hover:text-white transition-colors"><SkipBack size={20} /></button>
          <button 
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
          </button>
          <button className="text-slate-500 hover:text-white transition-colors"><SkipForward size={20} /></button>
        </div>
        <div className="w-full max-w-md h-1 bg-white/10 rounded-full overflow-hidden relative">
           <motion.div 
             className="absolute top-0 left-0 h-full bg-accent-cool"
             animate={{ width: isPlaying ? '100%' : '0%' }}
             transition={{ duration: currentSong?.duration || 180, ease: 'linear' }}
           />
        </div>
      </div>

      {/* Extra Controls */}
      <div className="w-64 flex items-center justify-end gap-6">
        <div className="flex items-center gap-3 group relative">
          <Volume2 size={18} className="text-slate-500" />
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={volume} 
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-24 accent-accent-cool cursor-pointer"
          />
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-accent-cool text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {Math.round(volume * 100)}%
          </div>
        </div>
        <button 
          onClick={() => setIsRecording(!isRecording)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all",
            isRecording ? "bg-accent-hot text-white animate-pulse" : "bg-white/5 hover:bg-white/10 text-slate-300"
          )}
        >
          <Video size={16} />
          {isRecording ? "STOP" : "REC"}
        </button>
      </div>
    </div>
  );
};

export { Sidebar, ControlBar };
