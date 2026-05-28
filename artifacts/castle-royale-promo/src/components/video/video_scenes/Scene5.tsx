import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const appIcon = `${import.meta.env.BASE_URL}app-icon.png`;

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--color-primary)]"
      {...sceneTransitions.morphExpand}>
      
      {/* Background Particles / Effects */}
      <motion.div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--color-secondary)_0%,_var(--color-primary)_100%)] opacity-80" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-8"
        >
          <img src={appIcon} alt="App Icon" className="w-52 h-52 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-[2rem] shadow-[0_0_80px_rgba(0,240,255,0.5),0_0_160px_rgba(255,200,0,0.25)]" />
        </motion.div>

        <motion.h1 
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-white uppercase tracking-wider leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ y: 30, opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { y: 0, opacity: 1, filter: 'blur(0px)' } : { y: 30, opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Are you ready to play?<br/>
          <span className="text-[var(--color-accent-alt)]">Welcome to The Castle Royale.</span>
        </motion.h1>
      </div>
    </motion.div>
  );
}
