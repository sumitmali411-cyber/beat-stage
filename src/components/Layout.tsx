import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/useStore';
import { audioEngine } from '../core/AudioEngine';
import { auth, db, storage, logout } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, 
  Music, User, Trash2, Plus, Settings, Monitor, 
  Box, Disc, Search, Radio, Mic, Video, Download,
  X, Layers, Move, FileCode, LogOut, Lightbulb, Save, Users, Wand2
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
    stageGlowColor, setStageGlowColor,
    selectedFigureId, setSelectedFigureId,
    presets, audienceMode, setAudienceMode
  } = useStore();

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = async () => {
    if (!user || !presetName.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'presets'), {
      name: presetName.trim(),
      background,
      stageGlowColor,
      createdAt: new Date().toISOString()
    });
    setPresetName('');
    setIsSavingPreset(false);
  };

  const handleApplyPreset = (preset: any) => {
    setBackground(preset.background);
    setStageGlowColor(preset.stageGlowColor);
  };

  const handleDeletePreset = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, 'users', user.uid, 'presets', id));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && user) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        try {
          const storageRef = ref(storage, `users/${user.uid}/songs/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);

          await addDoc(collection(db, 'users', user.uid, 'songs'), {
            uid: user.uid,
            name: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Local Artist",
            url,
            duration: 0,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          console.error("Error uploading song:", error);
          alert("Failed to upload song.");
        }
      }
    }
  };

  const handleGlbChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && user) {
      const file = e.target.files[0];
      try {
        const storageRef = ref(storage, `users/${user.uid}/figures/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

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
      } catch (error) {
        console.error("Error uploading figure:", error);
        alert("Failed to upload 3D model.");
      }
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
    const figure = figures.find(f => f.id === id);
    if (figure?.url && !figure.url.startsWith('blob:') && figure.url.includes('firebasestorage')) {
      try {
        const fileRef = ref(storage, figure.url);
        await deleteObject(fileRef);
      } catch (e) {
        console.error("Failed to delete figure from storage", e);
      }
    }
    await deleteDoc(doc(db, 'users', user.uid, 'figures', id));
  };

  const handleUpdateFigure = async (id: string, updates: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'figures', id), updates);
  };

  const handleRemoveSong = async (id: string) => {
    if (!user) return;
    const song = songs.find(s => s.id === id);
    if (song?.url && !song.url.startsWith('blob:') && song.url.includes('firebasestorage')) {
      try {
        const fileRef = ref(storage, song.url);
        await deleteObject(fileRef);
      } catch (e) {
        console.error("Failed to delete song from storage", e);
      }
    }
    await deleteDoc(doc(db, 'users', user.uid, 'songs', id));
  };

  const handleAutoMood = () => {
    const data = audioEngine.getAnalysisData();
    if (!data) return;

    if (data.bass > data.mid && data.bass > data.high) {
      setBackground('space');
      setStageGlowColor('#ff3366'); // Hot pink/red
    } else if (data.mid > data.bass && data.mid > data.high) {
      setBackground('neon-grid');
      setStageGlowColor('#00d4ff'); // Neon blue
    } else {
      setBackground('stars');
      setStageGlowColor('#ffcc00'); // Yellow/gold
    }
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
        {/* Background & Atmosphere */}
        <section>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Atmosphere</h2>
            <button 
              onClick={handleAutoMood}
              className="hover:text-accent-cool transition-colors text-slate-400 flex items-center gap-1"
              title="Auto-Mood (Matches current audio)"
            >
              <Wand2 size={14} />
            </button>
          </div>
          <div className="space-y-3">
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
            <div className="flex items-center justify-between px-2 py-2 bg-white/5 rounded-lg border border-white/5">
              <span className="text-[10px] font-bold uppercase text-slate-400">Stage Glow</span>
              <input 
                type="color" 
                value={stageGlowColor} 
                onChange={(e) => setStageGlowColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
              />
            </div>
            <button
              onClick={() => setAudienceMode(!audienceMode)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border",
                audienceMode ? "bg-accent-cool/20 text-accent-cool border-accent-cool/50" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
              )}
            >
              <Users size={14} />
              Audience Mode
            </button>
          </div>
        </section>

        {/* Stage Presets */}
        <section>
          <div className="flex items-center justify-between mb-3 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Stage Presets</h2>
            <button 
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              className="hover:text-accent-cool transition-colors text-slate-400"
              title="Save Current Preset"
            >
              <Save size={14} />
            </button>
          </div>
          
          <AnimatePresence>
            {isSavingPreset && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-3 px-2 overflow-hidden"
              >
                <div className="flex gap-2">
                  <input 
                    autoFocus
                    type="text" 
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    placeholder="Preset name..." 
                    className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] focus:outline-none focus:border-accent-cool text-white"
                  />
                  <button 
                    onClick={handleSavePreset}
                    className="bg-accent-cool text-black px-2 py-1 rounded text-[10px] font-bold hover:bg-white transition-colors"
                  >
                    Save
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 px-2">
            {presets.map(preset => (
              <div 
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className="group relative flex-shrink-0 w-20 h-16 rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-accent-cool transition-colors"
              >
                <div className="absolute inset-0 opacity-50" style={{ backgroundColor: preset.stageGlowColor }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
                  <span className="text-[9px] font-bold truncate text-white">{preset.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 hover:text-accent-hot text-white transition-all"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="w-full text-center py-4 border border-dashed border-white/5 rounded-lg">
                <p className="text-[10px] text-slate-500">No presets saved</p>
              </div>
            )}
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
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {fig.type === '3d' ? <Box size={14} className="shrink-0" /> : (fig.type === 'glb' ? <FileCode size={14} className="shrink-0" /> : <Layers size={14} className="shrink-0" />)}
                    {editingNameId === fig.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingNameValue}
                        onChange={(e) => setEditingNameValue(e.target.value)}
                        onBlur={() => {
                          handleUpdateFigure(fig.id, { name: editingNameValue || fig.name });
                          setEditingNameId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateFigure(fig.id, { name: editingNameValue || fig.name });
                            setEditingNameId(null);
                          }
                        }}
                        className="bg-black/50 border border-white/20 rounded px-1 text-xs w-full text-white focus:outline-none focus:border-accent-cool"
                      />
                    ) : (
                      <span 
                        className="text-xs font-medium truncate cursor-text"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingNameValue(fig.name);
                          setEditingNameId(fig.id);
                        }}
                        title="Double-click to rename"
                      >
                        {fig.name}
                      </span>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveFigure(fig.id); }} className="text-slate-500 hover:text-accent-hot shrink-0 ml-2"><X size={14} /></button>
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
                          Style
                        </label>
                        <select
                          value={fig.danceStyle || 'fluid'}
                          onChange={(e) => handleUpdateFigure(fig.id, { danceStyle: e.target.value })}
                          className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-accent-cool"
                        >
                          <option value="fluid">Fluid</option>
                          <option value="sharp">Sharp</option>
                          <option value="bounce">Bounce</option>
                          <option value="groove">Groove</option>
                        </select>
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <button
                          onClick={() => handleUpdateFigure(fig.id, { hasSpotlight: !fig.hasSpotlight })}
                          className={cn(
                            "flex items-center justify-center gap-1.5 w-full py-1 rounded border text-[10px] font-bold uppercase transition-colors",
                            fig.hasSpotlight 
                              ? "bg-accent-cool/20 text-accent-cool border-accent-cool/50" 
                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                          )}
                        >
                          <Lightbulb size={12} className={fig.hasSpotlight ? "text-accent-cool" : ""} />
                          Spotlight
                        </button>
                      </div>
                    </div>
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
          
          if (err.message.includes('404')) {
            message = "The requested audio file could not be found (404).";
          } else if (err.message.includes('CORS')) {
            message = "Browser security (CORS) blocked the direct stream. Please use local files.";
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
