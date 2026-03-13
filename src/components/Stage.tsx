import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Figure, DanceStyle, ViewMode } from '../state/useStore';
import { audioEngine } from '../core/AudioEngine';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Box as BoxIcon, Layers, Settings2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { useGLTF } from '@react-three/drei';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// v1: Apply dance style to get the position/rotation offsets
function applyDanceStyle(
  style: DanceStyle = 'fluid',
  t: number,
  speed: number,
  bass: number,
  mid: number,
  high: number,
  s: number
): { dy: number; dx: number; rotY: number; armMod: number; headMod: number } {
  switch (style) {
    case 'sharp':
      // Snappy, angular moves — square-wave-ish
      return {
        dy: Math.sign(Math.sin(t * 10 * speed)) * bass * 0.35 * s,
        dx: 0,
        rotY: Math.sign(Math.sin(t * speed)) * mid * 0.6 * s,
        armMod: mid * s * 2.5,
        headMod: high * 0.25 * s,
      };
    case 'bounce':
      // Exaggerated vertical bounce — always upward
      return {
        dy: Math.abs(Math.sin(t * 8 * speed)) * bass * 0.65 * s,
        dx: 0,
        rotY: Math.sin(t * speed * 0.5) * mid * 0.3 * s,
        armMod: mid * s * 1.5,
        headMod: high * 0.3 * s,
      };
    case 'groove':
      // Hip-hop lateral sway + figure-8 torso
      return {
        dy: Math.sin(t * 6 * speed) * bass * 0.3 * s,
        dx: Math.sin(t * 3 * speed) * mid * 0.4 * s,
        rotY: Math.sin(t * 2 * speed) * 0.4 * s,
        armMod: (mid + bass * 0.5) * s * 1.8,
        headMod: high * 0.15 * s,
      };
    case 'fluid':
    default:
      // Smooth classic sine motion
      return {
        dy: Math.sin(t * 10 * speed) * bass * 0.5 * s,
        dx: 0,
        rotY: Math.sin(t * speed) * mid * s,
        armMod: mid * s * 2,
        headMod: high * 0.2 * s,
      };
  }
}

const FigureGLB = ({ figure }: { figure: Figure }) => {
  if (!figure.url) return null;
  const { scene } = useGLTF(figure.url);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const data = audioEngine.getAnalysisData();
    if (!data || !groupRef.current) return;

    const { bass, mid } = data;
    const s = figure.sensitivity * figure.intensity;
    const speed = figure.speed;
    const t = state.clock.elapsedTime;
    const style = figure.danceStyle ?? 'fluid';
    const { dy, dx, rotY } = applyDanceStyle(style, t, speed, bass, mid, 0, s);

    groupRef.current.scale.setScalar(figure.scale * (1 + bass * 0.2 * s));
    groupRef.current.rotation.y = figure.rotation[1] + rotY;
    groupRef.current.position.y = figure.position[1] + dy;
    groupRef.current.position.x = figure.position[0] + dx;
  });

  return (
    <primitive
      ref={groupRef}
      object={scene}
      position={figure.position}
      rotation={figure.rotation}
      scale={figure.scale}
    />
  );
};

const Figure3D = ({ figure }: { figure: Figure }) => {
  const meshRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  // v2: spotlight point light that follows the figure
  const spotlightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const data = audioEngine.getAnalysisData();
    if (!data || !meshRef.current) return;

    const { bass, mid, high } = data;
    const s = figure.sensitivity * figure.intensity;
    const speed = figure.speed;
    const t = state.clock.elapsedTime;
    const style = figure.danceStyle ?? 'fluid';
    const { dy, dx, rotY, armMod, headMod } = applyDanceStyle(style, t, speed, bass, mid, high, s);

    meshRef.current.position.y = figure.position[1] + dy;
    meshRef.current.position.x = figure.position[0] + dx;
    meshRef.current.rotation.y = figure.rotation[1] + rotY;

    if (headRef.current) {
      headRef.current.position.y = 1.6 + headMod;
    }

    if (leftArmRef.current && rightArmRef.current) {
      leftArmRef.current.rotation.z = -Math.PI / 4 - armMod;
      rightArmRef.current.rotation.z = Math.PI / 4 + armMod;
    }

    // v2: spotlight tracks dancer, pulsing with bass
    if (spotlightRef.current && figure.spotlight) {
      spotlightRef.current.position.set(
        figure.position[0] + dx,
        figure.position[1] + dy + 3.5,
        figure.position[2]
      );
      spotlightRef.current.intensity = 1.5 + bass * 3 * s;
    }
  });

  return (
    <group
      ref={meshRef}
      position={figure.position}
      rotation={figure.rotation}
      scale={figure.scale}
    >
      {/* v2: per-figure spotlight that pulses with the dancer */}
      {figure.spotlight && (
        <pointLight
          ref={spotlightRef}
          color={figure.color}
          intensity={1.5}
          distance={8}
          decay={2}
          position={[0, 3.5, 0]}
        />
      )}

      {/* Body */}
      <mesh position={[0, 0.8, 0]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color={figure.color} emissive={figure.color} emissiveIntensity={0.5} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={figure.color} />
      </mesh>

      {/* Arms */}
      <mesh ref={leftArmRef} position={[-0.4, 1.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
        <meshStandardMaterial color={figure.color} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.4, 1.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <capsuleGeometry args={[0.1, 0.6, 4, 8]} />
        <meshStandardMaterial color={figure.color} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.2, 0.2, 0]}>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial color={figure.color} />
      </mesh>
      <mesh position={[0.2, 0.2, 0]}>
        <capsuleGeometry args={[0.12, 0.5, 4, 8]} />
        <meshStandardMaterial color={figure.color} />
      </mesh>
    </group>
  );
};

// v2: Beat-flash overlay — a translucent plane that flares with heavy bass drops
const BeatFlash = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const { stageAccentColor } = useStore();

  useFrame(() => {
    const data = audioEngine.getAnalysisData();
    if (!data || !matRef.current) return;
    // Flash only on hard bass hits (> 0.85)
    const hit = data.bass > 0.85 ? (data.bass - 0.85) * 6 : 0;
    matRef.current.opacity = hit * 0.18;
  });

  return (
    <mesh ref={meshRef} position={[0, 5, -8]}>
      <planeGeometry args={[60, 40]} />
      <meshBasicMaterial
        ref={matRef}
        color={stageAccentColor}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
};

const Stage3D = () => {
  const { figures, background, stageAccentColor } = useStore();
  const floorRef = useRef<THREE.Mesh>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  useFrame(() => {
    const data = audioEngine.getAnalysisData();
    if (!data || !floorRef.current) return;
    const mat = floorRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = data.bass * 2;
    mat.emissive.set(background === 'neon-grid' || background === 'gradient' ? stageAccentColor : '#333');
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      {/* v1: main stage spotlight now uses accent color */}
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={2} castShadow color={stageAccentColor} />

      {background === 'stars' && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      {background === 'space' && <Stars radius={300} depth={60} count={20000} factor={7} saturation={1} fade speed={2} />}

      {figures.filter(f => f.type === '3d').map(fig => (
        <Figure3D key={fig.id} figure={fig} />
      ))}

      {figures.filter(f => f.type === 'glb').map(fig => (
        <FigureGLB key={fig.id} figure={fig} />
      ))}

      {/* v2: beat-flash overlay */}
      <BeatFlash />

      {/* Floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#111"
          emissive={background === 'neon-grid' ? stageAccentColor : '#333'}
          emissiveIntensity={0}
        />
      </mesh>

      {/* v1: grid color uses stageAccentColor */}
      <gridHelper
        args={[20, 20, '#333', background === 'neon-grid' ? stageAccentColor : '#222']}
        position={[0, -0.49, 0]}
      />

      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
    </>
  );
};

const Stage2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { figures, background, stageAccentColor } = useStore();
  // Use a ref so the render loop reads the latest value without restarting
  const accentRef = useRef(stageAccentColor);
  useEffect(() => { accentRef.current = stageAccentColor; }, [stageAccentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    let animationFrame: number;

    const render = () => {
      const data = audioEngine.getAnalysisData();
      const { width, height } = canvas;

      // Background
      if (background === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#0a0a0f');
        grad.addColorStop(1, '#1a1a28');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#0a0a0f';
      }
      ctx.fillRect(0, 0, width, height);

      if (data) {
        // v1: background pulse uses stageAccentColor (read from ref — no loop restart)
        const alpha = background === 'neon-grid' ? data.bass * 0.2 : data.bass * 0.1;
        ctx.strokeStyle = background === 'neon-grid'
          ? accentRef.current + Math.round(alpha * 255).toString(16).padStart(2, '0')
          : `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 100 + data.bass * 50, 0, Math.PI * 2);
        ctx.stroke();

        // v2: second ring pulse ring at different freq (mid)
        if (data.mid > 0.3) {
          ctx.strokeStyle = `rgba(255,255,255,${data.mid * 0.08})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, 60 + data.mid * 80, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (background === 'stars') {
          for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * data.high})`;
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
          }
        }

        // Figures
        figures.filter(f => f.type === '2d').forEach(fig => {
          const x = (fig.position[0] + 2) * (width / 4);
          const style = fig.danceStyle ?? 'fluid';
          const t = Date.now() / 1000 * fig.speed;
          const s = fig.sensitivity * fig.intensity;

          // v1: dance style affects vertical position
          let yOffset = 0;
          switch (style) {
            case 'sharp':
              yOffset = Math.sign(Math.sin(t * 10)) * data.bass * 50 * s;
              break;
            case 'bounce':
              yOffset = Math.abs(Math.sin(t * 8)) * data.bass * 65 * s;
              break;
            case 'groove':
              yOffset = Math.sin(t * 6) * data.bass * 30 * s;
              break;
            case 'fluid':
            default:
              yOffset = data.bass * 50 * fig.sensitivity * fig.intensity;
          }
          const y = height - 100 - yOffset;

          ctx.strokeStyle = fig.color;
          ctx.lineWidth = 4 * fig.scale;
          ctx.lineCap = 'round';

          // v1: groove style adds lateral sway
          const xSway = style === 'groove' ? Math.sin(t * 3) * data.mid * 20 * s : 0;

          // Body
          ctx.beginPath();
          ctx.moveTo(x + xSway, y);
          ctx.lineTo(x + xSway, y - 60 * fig.scale);
          ctx.stroke();

          // Head
          ctx.beginPath();
          ctx.arc(x + xSway, y - (75 + data.high * 10) * fig.scale, 10 * fig.scale, 0, Math.PI * 2);
          ctx.stroke();

          // Arms
          const armSwing = Math.sin(t * 8) * 20 * data.mid * fig.sensitivity * fig.intensity;
          ctx.beginPath();
          ctx.moveTo(x + xSway, y - 50 * fig.scale);
          ctx.lineTo(x + xSway - 30 * fig.scale, y - (40 * fig.scale) + armSwing);
          ctx.moveTo(x + xSway, y - 50 * fig.scale);
          ctx.lineTo(x + xSway + 30 * fig.scale, y - (40 * fig.scale) - armSwing);
          ctx.stroke();

          // Legs
          ctx.beginPath();
          ctx.moveTo(x + xSway, y);
          ctx.lineTo(x + xSway - 20 * fig.scale, y + 40 * fig.scale);
          ctx.moveTo(x + xSway, y);
          ctx.lineTo(x + xSway + 20 * fig.scale, y + 40 * fig.scale);
          ctx.stroke();

          // v2: spotlight glow under dancer when spotlight enabled
          if (fig.spotlight) {
            const grd = ctx.createRadialGradient(x + xSway, y + 20, 5, x + xSway, y + 20, 60 + data.bass * 30 * s);
            grd.addColorStop(0, fig.color + '44');
            grd.addColorStop(1, fig.color + '00');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.ellipse(x + xSway, y + 20, 60 + data.bass * 30 * s, 20, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  // stageAccentColor intentionally excluded — handled via accentRef above
  }, [figures, background]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export const StageViewport = () => {
  const { user, viewMode, selectedFigureId, figures, isTransformOpen, setTransformOpen, setViewMode } = useStore();
  const selectedFigure = figures.find(f => f.id === selectedFigureId);

  const handleUpdateFigure = async (id: string, updates: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'figures', id), updates);
  };

  return (
    <div className="flex-1 relative bg-black overflow-hidden">
      {viewMode === '3d' ? (
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }}>
          <Stage3D />
        </Canvas>
      ) : (
        <Stage2D />
      )}

      {/* View Mode Toggle Overlay */}
      <div className="absolute top-6 right-6 flex gap-2">
        <button
          onClick={() => setViewMode('2d')}
          className={cn(
            "p-2 rounded-lg border transition-all",
            viewMode === '2d' ? "bg-accent-cool text-black border-accent-cool" : "bg-black/40 text-white border-white/10 hover:bg-white/5"
          )}
        >
          <Layers size={20} />
        </button>
        <button
          onClick={() => setViewMode('3d')}
          className={cn(
            "p-2 rounded-lg border transition-all",
            viewMode === '3d' ? "bg-accent-cool text-black border-accent-cool" : "bg-black/40 text-white border-white/10 hover:bg-white/5"
          )}
        >
          <BoxIcon size={20} />
        </button>
      </div>

      {/* Transform Toggle Button (Bottom Right) */}
      <div className="absolute bottom-6 right-6">
        <button
          onClick={() => setTransformOpen(!isTransformOpen)}
          className={cn(
            "p-3 rounded-full border transition-all shadow-xl",
            isTransformOpen ? "bg-accent-cool text-black border-accent-cool" : "bg-black/60 text-white border-white/10 hover:bg-white/20",
            !selectedFigure && "opacity-50 cursor-not-allowed"
          )}
          disabled={!selectedFigure}
        >
          <Settings2 size={24} />
        </button>
      </div>

      {/* Transform Controls Overlay */}
      <AnimatePresence>
        {selectedFigure && isTransformOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 right-6 w-64 glass-panel p-4 rounded-2xl space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-accent-cool">Transform</h3>
              <span className="text-[10px] text-slate-500">{selectedFigure.name}</span>
            </div>

            <div className="space-y-3">
              {/* Position */}
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 uppercase">Position (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <input
                      key={i}
                      type="number" step="0.1"
                      value={selectedFigure.position[i]}
                      onChange={(e) => {
                        const newPos = [...selectedFigure.position] as [number, number, number];
                        newPos[i] = parseFloat(e.target.value);
                        handleUpdateFigure(selectedFigure.id, { position: newPos });
                      }}
                      className="bg-black/40 border border-white/10 rounded px-1 py-1 text-[10px] text-center"
                    />
                  ))}
                </div>
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 uppercase">Rotation (X, Y, Z)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <input
                      key={i}
                      type="number" step="0.1"
                      value={selectedFigure.rotation[i]}
                      onChange={(e) => {
                        const newRot = [...selectedFigure.rotation] as [number, number, number];
                        newRot[i] = parseFloat(e.target.value);
                        handleUpdateFigure(selectedFigure.id, { rotation: newRot });
                      }}
                      className="bg-black/40 border border-white/10 rounded px-1 py-1 text-[10px] text-center"
                    />
                  ))}
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-1">
                <label className="text-[9px] text-slate-500 uppercase flex justify-between">
                  Scale <span>{selectedFigure.scale.toFixed(2)}</span>
                </label>
                <input
                  type="range" min="0.1" max="5" step="0.01"
                  value={selectedFigure.scale}
                  onChange={(e) => handleUpdateFigure(selectedFigure.id, { scale: parseFloat(e.target.value) })}
                  className="w-full accent-accent-cool h-1"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
