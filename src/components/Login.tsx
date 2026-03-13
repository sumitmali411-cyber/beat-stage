import React from 'react';
import { signInWithGoogle } from '../firebase';
import { Disc, LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Login = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#00d4ff10,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cool blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-hot blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md glass-panel p-12 rounded-[32px] text-center space-y-8 border border-white/10 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-3xl bg-accent-cool/10 flex items-center justify-center text-accent-cool border border-accent-cool/20 shadow-[0_0_30px_rgba(0,212,255,0.2)]">
            <Disc size={40} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white">BEATSTAGE</h1>
            <p className="text-slate-500 font-medium tracking-widest text-[10px] uppercase mt-1">Audio Visualizer Pro</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-slate-400 text-sm leading-relaxed">
            Sign in to personalize your stage, save your 3D models, and sync your YouTube Music playlists.
          </p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            <LogIn size={20} />
            Continue with Google
          </button>
        </div>

        <div className="pt-8 border-t border-white/5">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Powered by Firebase & Google Cloud
          </p>
        </div>
      </motion.div>
    </div>
  );
};
