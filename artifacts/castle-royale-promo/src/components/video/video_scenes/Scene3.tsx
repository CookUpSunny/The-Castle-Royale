import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

const BASE = import.meta.env.BASE_URL;

// Top row — portrait-friendly images, face fills the card
const TOP_CHAMPIONS = [
  { src: `${BASE}champ-medusa.png`,  name: 'The Viper',   objPos: '50% 15%', delay: 0.05 },
  { src: `${BASE}champ-dragon.png`,  name: 'The Drake',   objPos: '50% 10%', delay: 0.18 },
  { src: `${BASE}champ-duchess.png`, name: 'The Duchess', objPos: '50% 5%',  delay: 0.31 },
];

// Bottom row — wider images, face in upper portion
const BOT_CHAMPIONS = [
  { src: `${BASE}champ-frog.png`,   name: 'The Dealer', objPos: '50% 5%',  delay: 0.44 },
  { src: `${BASE}champ-eagles.png`, name: 'The Eagles', objPos: '50% 8%',  delay: 0.57 },
];

interface ChampProps {
  src: string;
  name: string;
  objPos: string;
  delay: number;
  ready: boolean;
}

function ChampCard({ src, name, objPos, delay, ready }: ChampProps) {
  return (
    <motion.div
      className="relative rounded-xl overflow-hidden border border-white/15 flex-1 min-w-0"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
      initial={{ y: 60, opacity: 0, scale: 0.92 }}
      animate={ready ? { y: 0, opacity: 1, scale: 1 } : { y: 60, opacity: 0, scale: 0.92 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        style={{ objectPosition: objPos }}
      />
      {/* Gradient + name */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-10 pb-2 px-2 text-center">
        <span
          className="text-xs md:text-sm font-black uppercase tracking-widest text-white"
          style={{ textShadow: '0 1px 6px rgba(0,0,0,1)' }}
        >
          {name}
        </span>
      </div>
    </motion.div>
  );
}

export function Scene3() {
  const [titleIn, setTitleIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setTitleIn(true), 150);
    const t2 = setTimeout(() => setReady(true), 350);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col overflow-hidden bg-[#06020f]"
      {...sceneTransitions.clipPolygon}
    >
      {/* Subtle top vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 z-10 pointer-events-none" />

      {/* Title */}
      <motion.div
        className="relative z-20 text-center pt-5 pb-2 shrink-0"
        initial={{ y: -20, opacity: 0 }}
        animate={titleIn ? { y: 0, opacity: 1 } : { y: -20, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2
          className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white"
          style={{
            fontFamily: 'var(--font-display)',
            textShadow: '0 0 20px rgba(0,240,255,0.7), 0 2px 8px rgba(0,0,0,0.9)',
          }}
        >
          Choose Your Champion
        </h2>
      </motion.div>

      {/* Top row — 3 portrait cards */}
      <div className="relative z-20 flex gap-1.5 px-1.5 flex-[3] min-h-0">
        {TOP_CHAMPIONS.map(c => (
          <ChampCard key={c.name} {...c} ready={ready} />
        ))}
      </div>

      {/* Bottom row — 2 wider cards */}
      <div className="relative z-20 flex gap-1.5 px-1.5 pb-1.5 flex-[2] min-h-0">
        {BOT_CHAMPIONS.map(c => (
          <ChampCard key={c.name} {...c} ready={ready} />
        ))}
      </div>
    </motion.div>
  );
}
