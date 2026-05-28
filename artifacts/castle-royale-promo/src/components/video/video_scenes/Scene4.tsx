import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const scene4Bg = `${import.meta.env.BASE_URL}scene4-bg.png`;

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
      {...sceneTransitions.splitHorizontal}>
      
      <motion.div className="absolute inset-0"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}>
        <img src={scene4Bg} alt="Throne Room" className="w-full h-full object-cover" />
      </motion.div>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.h2 
          className="text-5xl md:text-8xl font-black uppercase text-white tracking-widest"
          style={{ fontFamily: 'var(--font-display)', textShadow: '0 2px 30px rgba(0,0,0,0.9)' }}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 1.3, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Claim the
        </motion.h2>

        <motion.h2 
          className="text-6xl md:text-9xl font-black uppercase tracking-widest text-[var(--color-accent)] mt-2"
          style={{ fontFamily: 'var(--font-display)', WebkitTextStroke: '2px #fff', textShadow: '0 2px 30px rgba(0,0,0,0.9)' }}
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          Throne
        </motion.h2>
      </div>
    </motion.div>
  );
}
