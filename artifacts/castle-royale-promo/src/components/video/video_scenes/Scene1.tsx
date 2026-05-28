import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

import cosmicFar from "@assets/artifacts/mobile/assets/scenes/cosmicSanctum/landscape/L0_far.png";
const appIcon = `${import.meta.env.BASE_URL}app-icon.png`;

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden"
      {...sceneTransitions.scaleFade}>
      
      {/* Background layer */}
      <motion.div className="absolute inset-0 z-0"
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}>
        <img src={cosmicFar} alt="Cosmic Sanctum" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-dark)] via-transparent to-[var(--color-bg-dark)] opacity-80" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0, rotate: -45, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, rotate: 0, opacity: 1 } : { scale: 0, rotate: -45, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-8"
        >
          <img src={appIcon} alt="Logo" className="w-32 h-32 md:w-48 md:h-48 drop-shadow-[0_0_30px_rgba(255,0,85,0.6)]" />
        </motion.div>

        <motion.h1 
          className="text-5xl md:text-8xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-alt)]"
          style={{ fontFamily: 'var(--font-display)', WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}
          initial={{ y: 50, opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { y: 0, opacity: 1, filter: 'blur(0px)' } : { y: 50, opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          The Realm
        </motion.h1>

        <motion.p
          className="text-xl md:text-3xl mt-4 font-bold tracking-widest uppercase text-white/80"
          initial={{ opacity: 0, letterSpacing: '0em' }}
          animate={phase >= 3 ? { opacity: 1, letterSpacing: '0.2em' } : { opacity: 0, letterSpacing: '0em' }}
          transition={{ duration: 1 }}
        >
          Awaits Your Command
        </motion.p>
      </div>
    </motion.div>
  );
}
