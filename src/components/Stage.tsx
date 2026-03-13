import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Float, MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, Figure, DanceStyle } from '../state/useStore';
import { audioEngine } from '../core/AudioEngine';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Box as BoxIcon, Layers, Settings2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { useGLTF } from '@react-three/drei';
import { ErrorBoundary } from './ErrorBoundary';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getDanceMath = (style: DanceStyle | undefined, t: number) => {
  switch (style) {
    case 'sharp':
      return Math.sign(Math.sin(t)) * Math.pow(Math.abs(Math.sin(t)), 0.2); // Snappy
    case 'bounce':
      return Math.abs(Math.sin(t));
    case 'groove':
      return Math.sin(t); // Groove handles X-axis separately
    case 'fluid':
    default:
      return Math.sin(t);
  }
};

const FigureGLB = ({ figure }: { figure: Figure }) => {
  const { scene } = useGLTF(figure.url!);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const data = audioEngine.getAnalysisData();
    if (!data || !groupRef.current) return;

    const { bass, mid } = data;
    const s = figure.sensitivity * figure.intensity;
    const speed = figure.speed;
    const t = state.clock.elapsedTime * speed;
    const danceVal = getDanceMath(figure.danceStyle, t * 10);
    const rotVal = getDanceMath(figure.danceStyle, t);

    // React to audio
    groupRef.current.scale.setScalar(figure.scale * (1 + bass * 0.2 * s));
    groupRef.current.rotation.y = figure.rotation[1] + rotVal * mid * 0.5 * s;
    
    if (figure.danceStyle === 'groove') {
      groupRef.current.position.x = figure.position[0] + Math.sin(t * 5) * mid * 0.5 * s;
      groupRef.current.position.y = figure.position[1] + Math.sin(t * 10) * bass * 0.1 * s;
    } else {
      groupRef.current.position.x = figure.position[0];
      groupRef.current.position.y = figure.position[1] + danceVal * bass * 0.2 * s;
    }
  });

  return (
    <group position={figure.position}>
      <primitive 
        ref={groupRef}
        object={scene} 
        position={[0, 0, 0]} 
        rotation={figure.rotation}
        scale={figure.scale}
      />
      {figure.hasSpotlight && (
        <pointLight color={figure.color} intensity={2} distance={5} position={[0, 1, 0]} />
      )}
    </group>
  );
};

const Figure3D = ({ figure }: { figure: Figure }) => {
  const meshRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const data = audioEngine.getAnalysisData();
    if (!data || !meshRef.current) return;

    const { bass, mid, high } = data;
    const s = figure.sensitivity * figure.intensity;
    const speed = figure.speed;
    const t = state.clock.elapsedTime * speed;
    const danceVal = getDanceMath(figure.danceStyle, t * 10);
    const rotVal = getDanceMath(figure.danceStyle, t);
    const headVal = getDanceMath(figure.danceStyle, t * 15);

    // Bounce with bass
    if (figure.danceStyle === 'groove') {
      meshRef.current.position.x = figure.position[0] + Math.sin(t * 5) * mid * 0.5 * s;
      meshRef.current.position.y = figure.position[1] + Math.sin(t * 10) * bass * 0.2 * s;
    } else {
      meshRef.current.position.x = figure.position[0];
      meshRef.current.position.y = figure.position[1] + danceVal * bass * 0.5 * s;
    }
    
    // Rotate with mid
    meshRef.current.rotation.y = figure.rotation[1] + rotVal * mid * s;

    // Head bob
    if (headRef.current) {
      headRef.current.position.y = 1.6 + headVal * high * 0.2 * s;
    }

    // Arm movement
    if (leftArmRef.current && rightArmRef.current) {
      const armVal = figure.danceStyle === 'sharp' ? Math.sign(Math.sin(t * 8)) : Math.sin(t * 8);
      leftArmRef.current.rotation.z = -Math.PI / 4 - mid * s * 2 * armVal;
      rightArmRef.current.rotation.z = Math.PI / 4 + mid * s * 2 * armVal;
    }
  });

  return (
    <group position={figure.position}>
      <group 
        ref={meshRef} 
        position={[0, 0, 0]} 
        rotation={figure.rotation}
        scale={figure.scale}
      >
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
      {figure.hasSpotlight && (
        <pointLight color={figure.color} intensity={2} distance={5} position={[0, 1, 0]} />
      )}
    </group>
  );
};

const Audience3D = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create 50 audience members
  const audience = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        0,
        (Math.random() * 10) + 5 // Positioned in front of the stage
      ] as [number, number, number],
      color: `hsl(${Math.random() * 360}, 50%, 50%)`,
      speedOffset: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    const data = audioEngine.getAnalysisData();
    if (!data || !groupRef.current) return;

    groupRef.current.children.forEach((child, i) => {
      const member = audience[i];
      // Jump with bass
      child.position.y = Math.max(0, Math.sin(state.clock.elapsedTime * 8 + member.speedOffset) * data.bass * 1.5);
      // Sway with mid
      child.rotation.z = Math.sin(state.clock.elapsedTime * 2 + member.speedOffset) * data.mid * 0.5;
    });
  });

  return (
    <group ref={groupRef}>
      {audience.map((member, i) => (
        <group key={i} position={member.position}>
          <mesh position={[0, 0.5, 0]}>
            <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
            <meshStandardMaterial color={member.color} />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={member.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const Stage3D = () => {
  const { figures, background, stageGlowColor, audienceMode } = useStore();
  const floorRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const data = audioEngine.getAnalysisData();
    if (!data) return;
    
    if (floorRef.current) {
      (floorRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = data.bass * 2;
    }
    
    if (flashRef.current) {
      const flashMat = flashRef.current.material as THREE.MeshBasicMaterial;
      if (data.bass > 0.85) {
        flashMat.opacity = (data.bass - 0.85) * 4; // Scale up opacity quickly
      } else {
        flashMat.opacity = Math.max(0, flashMat.opacity - 0.05); // Fade out
      }
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={2} castShadow color={stageGlowColor} />
      
      {background === 'stars' && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      {background === 'space' && <Stars radius={300} depth={60} count={20000} factor={7} saturation={1} fade speed={2} />}
      
      {/* Beat-drop flash plane */}
      <mesh ref={flashRef} position={[0, 0, -15]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color={stageGlowColor} transparent opacity={0} depthWrite={false} />
      </mesh>

      {figures.filter(f => f.type === '3d').map(fig => (
        <Figure3D key={fig.id} figure={fig} />
      ))}

      {figures.filter(f => f.type === 'glb').map(fig => (
        <ErrorBoundary key={fig.id} fallback={
          <mesh position={fig.position}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" wireframe />
          </mesh>
        }>
          <React.Suspense fallback={null}>
            <FigureGLB figure={fig} />
          </React.Suspense>
        </ErrorBoundary>
      ))}

      {audienceMode && <Audience3D />}

      {/* Floor */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#111" 
          emissive={background === 'neon-grid' ? stageGlowColor : "#333"} 
          emissiveIntensity={0} 
        />
      </mesh>

      <gridHelper args={[20, 20, '#333', background === 'neon-grid' ? stageGlowColor : '#222']} position={[0, -0.49, 0]} />
      
      <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
    </>
  );
};

const Stage2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { figures, background, stageGlowColor, audienceMode } = useStore();

  // Generate random audience for 2D
  const audience2D = useMemo(() => {
    return Array.from({ length: 30 }).map(() => ({
      x: Math.random(), // 0 to 1 relative width
      color: `hsl(${Math.random() * 360}, 50%, 50%)`,
      offset: Math.random() * Math.PI * 2
    }));
  }, []);

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
    let flashOpacity = 0;

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
        // Beat-drop flash
        if (data.bass > 0.85) {
          flashOpacity = (data.bass - 0.85) * 4;
        } else {
          flashOpacity = Math.max(0, flashOpacity - 0.05);
        }
        
        if (flashOpacity > 0) {
          ctx.fillStyle = stageGlowColor;
          ctx.globalAlpha = flashOpacity * 0.3; // Keep it subtle
          ctx.fillRect(0, 0, width, height);
          ctx.globalAlpha = 1.0;
        }

        // Background pulse (Bass)
        // Convert hex to rgba for strokeStyle
        let r = 0, g = 212, b = 255;
        if (stageGlowColor.startsWith('#')) {
          const hex = stageGlowColor.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }

        ctx.strokeStyle = background === 'neon-grid' ? `rgba(${r}, ${g}, ${b}, ${data.bass * 0.2})` : `rgba(255, 255, 255, ${data.bass * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 100 + data.bass * 50, 0, Math.PI * 2);
        ctx.stroke();

        // Mid-frequency pulse ring
        ctx.strokeStyle = background === 'neon-grid' ? `rgba(${r}, ${g}, ${b}, ${data.mid * 0.15})` : `rgba(255, 255, 255, ${data.mid * 0.08})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 150 + data.mid * 80, 0, Math.PI * 2);
        ctx.stroke();

        if (background === 'stars') {
          for (let i = 0; i < 50; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * data.high})`;
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
          }
        }

        // Audience 2D
        if (audienceMode) {
          const time = Date.now() / 1000;
          audience2D.forEach(member => {
            const x = member.x * width;
            const y = height - 20 - Math.max(0, Math.sin(time * 8 + member.offset) * data.bass * 40);
            
            ctx.strokeStyle = member.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            // Body
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - 30);
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(x, y - 40, 6, 0, Math.PI * 2);
            ctx.stroke();

            // Arms (cheering)
            const armY = y - 25 - data.mid * 15;
            ctx.beginPath();
            ctx.moveTo(x, y - 20);
            ctx.lineTo(x - 15, armY);
            ctx.moveTo(x, y - 20);
            ctx.lineTo(x + 15, armY);
            ctx.stroke();
          });
        }

        // Figures
        figures.filter(f => f.type === '2d').forEach(fig => {
          const speed = fig.speed;
          const time = Date.now() / 1000 * speed;
          
          let x = (fig.position[0] + 2) * (width / 4);
          let y = height - 100;
          
          const danceVal = getDanceMath(fig.danceStyle, time * 10);
          
          if (fig.danceStyle === 'groove') {
            x += Math.sin(time * 5) * data.mid * 50 * fig.sensitivity * fig.intensity;
            y -= Math.sin(time * 10) * data.bass * 20 * fig.sensitivity * fig.intensity;
          } else {
            y -= danceVal * data.bass * 50 * fig.sensitivity * fig.intensity;
          }

          // Spotlight Halo
          if (fig.hasSpotlight) {
            const haloGrad = ctx.createRadialGradient(x, height - 50, 0, x, height - 50, 100 * fig.scale * (1 + data.bass * 0.5));
            
            // Parse figure color
            let fr = 255, fg = 255, fb = 255;
            if (fig.color.startsWith('#')) {
              const hex = fig.color.replace('#', '');
              fr = parseInt(hex.substring(0, 2), 16);
              fg = parseInt(hex.substring(2, 4), 16);
              fb = parseInt(hex.substring(4, 6), 16);
            }
            
            haloGrad.addColorStop(0, `rgba(${fr}, ${fg}, ${fb}, ${0.4 * data.bass})`);
            haloGrad.addColorStop(1, `rgba(${fr}, ${fg}, ${fb}, 0)`);
            
            ctx.fillStyle = haloGrad;
            ctx.beginPath();
            ctx.ellipse(x, height - 50, 100 * fig.scale, 30 * fig.scale, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          
          ctx.strokeStyle = fig.color;
          ctx.lineWidth = 4 * fig.scale;
          ctx.lineCap = 'round';

          // Body
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - 60 * fig.scale);
          ctx.stroke();

          // Head
          ctx.beginPath();
          ctx.arc(x, y - (75 + data.high * 10) * fig.scale, 10 * fig.scale, 0, Math.PI * 2);
          ctx.stroke();

          // Arms
          const armVal = fig.danceStyle === 'sharp' ? Math.sign(Math.sin(time * 8)) : Math.sin(time * 8);
          const armSwing = armVal * 20 * data.mid * fig.sensitivity * fig.intensity;
          ctx.beginPath();
          ctx.moveTo(x, y - 50 * fig.scale);
          ctx.lineTo(x - 30 * fig.scale, y - (40 * fig.scale) + armSwing);
          ctx.moveTo(x, y - 50 * fig.scale);
          ctx.lineTo(x + 30 * fig.scale, y - (40 * fig.scale) - armSwing);
          ctx.stroke();

          // Legs
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 20 * fig.scale, y + 40 * fig.scale);
          ctx.moveTo(x, y);
          ctx.lineTo(x + 20 * fig.scale, y + 40 * fig.scale);
          ctx.stroke();
        });
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [figures, background, stageGlowColor]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export const StageViewport = () => {
  const { user, viewMode, selectedFigureId, figures, isTransformOpen, setTransformOpen } = useStore();
  const selectedFigure = figures.find(f => f.id === selectedFigureId);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpdateFigure = async (id: string, updates: any) => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid, 'figures', id), updates);
  };

  const handleScreenshot = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `beatstage-performance-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div ref={containerRef} className="flex-1 relative bg-black overflow-hidden">
      {viewMode === '3d' ? (
        <Canvas shadows camera={{ position: [0, 5, 10], fov: 50 }} gl={{ preserveDrawingBuffer: true }}>
          <Stage3D />
        </Canvas>
      ) : (
        <Stage2D />
      )}
      
      {/* View Mode Toggle Overlay */}
      <div className="absolute top-6 right-6 flex gap-2">
        <button 
          onClick={handleScreenshot}
          className="bg-black/50 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center gap-2"
          title="Take Screenshot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        </button>
        <button 
          onClick={() => useStore.getState().setViewMode('2d')}
          className={cn(
            "p-2 rounded-lg border transition-all",
            viewMode === '2d' ? "bg-accent-cool text-black border-accent-cool" : "bg-black/40 text-white border-white/10 hover:bg-white/5"
          )}
        >
          <Layers size={20} />
        </button>
        <button 
          onClick={() => useStore.getState().setViewMode('3d')}
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
