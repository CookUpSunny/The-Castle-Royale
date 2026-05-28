import { motion } from 'framer-motion';
import { sceneTransitions } from '@/lib/video';

import flamingoFar from "@assets/artifacts/mobile/assets/scenes/flamingoCasino/landscape/L0_far.png";
import flamingoMid from "@assets/artifacts/mobile/assets/scenes/flamingoCasino/landscape/L1_mid.png";

/* ─── Seeded RNG ─────────────────────────────────────────── */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ─── Card data ───────────────────────────────────────────── */
const SUITS  = ['♠', '♥', '♦', '♣'] as const;
const VALUES = ['A', 'K', 'Q', 'J', '10', '9'] as const;

interface CardDef {
  id: number; suit: string; value: string; red: boolean;
  x: number; y: number; dx: number; dy: number;
  rot: number; scale: number; delay: number;
}
interface GemDef {
  id: number; color: string;
  x: number; y: number; tx: number; ty: number;
  scale: number; delay: number; duration: number;
  twinkleDuration: number;
}
interface CoinDef {
  id: number;
  x: number; y: number; tx: number; ty: number;
  scale: number; delay: number; duration: number;
}

const rand = seeded(77);

const CARDS: CardDef[] = Array.from({ length: 10 }, (_, i) => {
  const suit = SUITS[Math.floor(rand() * 4)];
  return {
    id: i,
    suit, value: VALUES[Math.floor(rand() * 6)],
    red: suit === '♥' || suit === '♦',
    // Spawn around the center with some scatter
    x: 25 + rand() * 50,
    y: 20 + rand() * 60,
    // Drift slowly — small offset from spawn position
    dx: (rand() - 0.5) * 20,
    dy: (rand() - 0.5) * 15,
    rot: (rand() - 0.5) * 30,
    scale: 0.65 + rand() * 0.55,
    delay: rand() * 1.5,
  };
});

const GEM_COLORS = ['#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fbbf24', '#fb7185'];
const GEMS: GemDef[] = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  color: GEM_COLORS[Math.floor(rand() * GEM_COLORS.length)],
  // Start from edges / random positions
  x: rand() * 90 + 5,
  y: rand() * 80 + 5,
  tx: (rand() - 0.5) * 70,
  ty: (rand() - 0.5) * 50,
  scale: 0.5 + rand() * 0.8,
  delay: rand() * 2.0,
  duration: 2.5 + rand() * 1.5,
  twinkleDuration: 0.4 + rand() * 0.5,
}));

const COINS: CoinDef[] = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  x: 10 + rand() * 80,
  y: 80 + rand() * 20,
  tx: (rand() - 0.5) * 50,
  ty: -(50 + rand() * 50),
  scale: 0.5 + rand() * 0.7,
  delay: rand() * 2.0,
  duration: 1.0 + rand() * 0.8,
}));

/* ─── Card: floats + continuously flips ───────────────────── */
function FloatingCard({ c }: { c: CardDef }) {
  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center rounded-md border border-white/20 select-none"
      style={{
        left: `${c.x}vw`, top: `${c.y}vh`,
        width: '3rem', height: '4.2rem',
        background: c.red
          ? 'linear-gradient(135deg,#fff 60%,#fce7f3)'
          : 'linear-gradient(135deg,#1e1b4b,#312e81)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.55)',
        scale: c.scale,
        rotate: c.rot,
        transformOrigin: 'center center',
      }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 1, 1, 0.9],
        x: [`0vw`, `${c.dx}vw`, `${-c.dx * 0.5}vw`, `${c.dx * 0.7}vw`],
        y: [`0vh`, `${c.dy}vh`, `${-c.dy * 0.6}vh`, `${c.dy * 0.4}vh`],
        rotateY: [0, 180, 360, 540],
      }}
      transition={{
        delay: c.delay,
        duration: 3 - c.delay * 0.3,
        ease: 'easeInOut',
        rotateY: {
          delay: c.delay,
          duration: 1.4,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
    >
      <span className="text-[10px] font-black leading-none" style={{ color: c.red ? '#e11d48' : '#c7d2fe' }}>
        {c.value}
      </span>
      <span className="text-base leading-none" style={{ color: c.red ? '#e11d48' : '#c7d2fe' }}>
        {c.suit}
      </span>
    </motion.div>
  );
}

/* ─── Gem: floats + twinkles ─────────────────────────────── */
function TwinklingGem({ g }: { g: GemDef }) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${g.x}vw`, top: `${g.y}vh`,
        width: '1.6rem', height: '1.6rem',
        clipPath: 'polygon(50% 0%,100% 35%,82% 100%,18% 100%,0% 35%)',
        background: `linear-gradient(135deg, white 0%, ${g.color} 40%, ${g.color}66 100%)`,
        scale: g.scale,
      }}
      initial={{ opacity: 0 }}
      animate={{
        // Float across screen
        x: `${g.tx}vw`,
        y: `${g.ty}vh`,
        opacity: [0, 0.85, 1, 0.85, 1, 0.85, 0],
        // Twinkle: pulse scale and glow
        scale: [g.scale, g.scale * 1.35, g.scale * 0.9, g.scale * 1.4, g.scale * 0.95, g.scale * 1.2, g.scale],
        filter: [
          `drop-shadow(0 0 4px ${g.color}) drop-shadow(0 0 8px ${g.color}66)`,
          `drop-shadow(0 0 18px ${g.color}) drop-shadow(0 0 32px white)`,
          `drop-shadow(0 0 6px ${g.color})`,
          `drop-shadow(0 0 22px ${g.color}) drop-shadow(0 0 40px white)`,
          `drop-shadow(0 0 5px ${g.color})`,
          `drop-shadow(0 0 16px ${g.color}) drop-shadow(0 0 28px white)`,
          `drop-shadow(0 0 4px ${g.color})`,
        ],
      }}
      transition={{
        delay: g.delay,
        duration: g.duration,
        ease: 'easeInOut',
        filter: {
          delay: g.delay,
          duration: g.twinkleDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        },
        scale: {
          delay: g.delay,
          duration: g.twinkleDuration,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
    />
  );
}

/* ─── Coin: arc upward ───────────────────────────────────── */
function ArcCoin({ c }: { c: CoinDef }) {
  return (
    <motion.div
      className="absolute rounded-full border-2 flex items-center justify-center text-[9px] font-black"
      style={{
        left: `${c.x}vw`, top: `${c.y}vh`,
        width: '1.8rem', height: '1.8rem',
        background: 'radial-gradient(circle at 35% 35%, #fcd34d, #92400e)',
        borderColor: '#fbbf24',
        color: '#fff',
        boxShadow: '0 0 8px #fbbf2488',
        scale: c.scale,
      }}
      initial={{ opacity: 0 }}
      animate={{
        x: `${c.tx}vw`,
        y: `${c.ty}vh`,
        rotateY: [0, 180, 360],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        delay: c.delay,
        duration: c.duration,
        ease: 'easeOut',
        rotateY: { duration: 0.5, repeat: Infinity, ease: 'linear' },
      }}
    />
  );
}

/* ─── Scene ──────────────────────────────────────────────── */
export function Scene2() {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--color-bg-dark)]"
      {...sceneTransitions.wipe}
    >
      {/* Background */}
      <motion.div className="absolute inset-0"
        initial={{ x: '-5%' }} animate={{ x: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}>
        <img src={flamingoFar} alt="Bg" className="absolute w-full h-full object-cover opacity-70 mix-blend-screen" />
      </motion.div>
      <motion.div className="absolute inset-0"
        initial={{ x: '5%' }} animate={{ x: '0%' }}
        transition={{ duration: 4, ease: 'linear' }}>
        <img src={flamingoMid} alt="Mid" className="absolute w-full h-full object-cover opacity-90" />
      </motion.div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Coins */}
      {COINS.map(c => <ArcCoin key={c.id} c={c} />)}

      {/* Cards — floating & flipping */}
      {CARDS.map(c => <FloatingCard key={c.id} c={c} />)}

      {/* Gems — floating & twinkling */}
      {GEMS.map(g => <TwinklingGem key={g.id} g={g} />)}

      {/* Centered title — above everything */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none gap-2"
        initial={{ opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Crown */}
        <motion.div
          className="text-6xl md:text-8xl leading-none"
          style={{ filter: 'drop-shadow(0 0 18px #fbbf24) drop-shadow(0 0 40px #f59e0b)' }}
          animate={{ y: [0, -6, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          👑
        </motion.div>

        <h2
          className="text-6xl md:text-9xl font-black uppercase italic tracking-wider text-white"
          style={{
            fontFamily: 'var(--font-display)',
            textShadow: '0 0 40px var(--color-accent), 0 0 80px var(--color-accent), 0 4px 20px rgba(0,0,0,0.95)',
          }}
        >
          High Stakes
        </h2>
      </motion.div>
    </motion.div>
  );
}
