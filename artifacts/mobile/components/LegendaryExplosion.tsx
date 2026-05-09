/**
 * LegendaryExplosion — GPU-accelerated Skia particle system for Castle Royale
 *
 * Architecture
 * ─────────────
 *  • Particle data pre-computed at mount (plain JS objects, worklet-serialisable)
 *  • Single Reanimated clock (0 → 1 over 1.2 s) drives all motion on the UI thread
 *  • useDerivedValue records one Skia Picture per frame — a single batched GPU draw call
 *  • BlendMode.Plus (additive blending) creates HDR glow where particles overlap
 *  • Three emitter archetypes: burst sparks · trailing embers · core bloom
 *  • Expanding ring shockwaves (1–3 based on rarity), drawn behind particles
 *  • Animated.View wrapper provides canvas-layer shake (shakeIntensity prop)
 *
 * Usage
 * ─────
 *  <LegendaryExplosion
 *    visible={burnFired}
 *    center={pileCenter}
 *    onComplete={() => setBurnFired(false)}
 *    rarity="legendary"
 *    variant="fire"
 *  />
 */
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlendMode, Canvas, Picture, Skia, type SkColor } from '@shopify/react-native-skia';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// ─── Public API ───────────────────────────────────────────────────────────────

export type ExplosionVariant = 'fire' | 'ice' | 'lightning' | 'void';
export type ExplosionRarity  = 'rare' | 'epic' | 'legendary';
export type ExplosionQuality = 'low'  | 'high';

export interface LegendaryExplosionProps {
  /** Show / hide. Each false→true transition fires a fresh burst. */
  visible: boolean;
  /** Screen-space emitter centre. Defaults to screen centre. */
  center?: { x: number; y: number } | null;
  /** Fired once after the last particle fades. */
  onComplete?: () => void;
  /** Particle budget before quality scaling (default 180). */
  particleCount?: number;
  /** Override colour palette; otherwise determined by `variant`. */
  colors?: string[];
  /** Controls particle count scale, ring count, and shake amplitude. */
  rarity?: ExplosionRarity;
  /** Canvas-shake amplitude 0–10 (default 5). */
  shakeIntensity?: number;
  /** 'low' ≈ 44 % particle count — use on older devices. */
  quality?: ExplosionQuality;
  /** Visual theme — selects the default colour palette. */
  variant?: ExplosionVariant;
}

// ─── Colour palettes ──────────────────────────────────────────────────────────

const PALETTES: Record<ExplosionVariant, readonly string[]> = {
  fire:      ['#ff4500', '#ff7f00', '#ffd700', '#ff0000', '#fff8c0', '#ff6347'],
  ice:       ['#00e5ff', '#80d8ff', '#e0f7fa', '#40c4ff', '#ffffff', '#b2ebf2'],
  lightning: ['#e040fb', '#ffff00', '#ffffff', '#b388ff', '#ce93d8', '#f8bbd0'],
  void:      ['#7c4dff', '#ea80fc', '#9c27b0', '#ffffff', '#b388ff', '#9575cd'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// ─── Particle data ────────────────────────────────────────────────────────────
// Plain JS objects — fully serialisable into Reanimated worklet closures.

interface ParticleInit {
  vx: number; vy: number; grav: number; // velocity (px/s) and gravity (px/s²)
  size:  number;                         // max radius (px)
  delay: number; life: number;           // clock fractions: emit offset, lifespan
  cr: number; cg: number; cb: number;   // colour 0-255
  a255: number;                          // max opacity 0-255
  type:  0 | 1 | 2;                     // 0=burst spark, 1=trailing ember, 2=core bloom
  x0: number; y0: number;               // jitter from emitter centre (px)
}

function makeParticles(
  count: number,
  palette: readonly string[],
  rarity: ExplosionRarity,
  quality: ExplosionQuality,
): ParticleInit[] {
  const n   = quality === 'low' ? Math.ceil(count * 0.44) : count;
  const rs  = rarity === 'legendary' ? 1.0 : rarity === 'epic' ? 0.72 : 0.50;
  const spd = 280 * rs;
  const out: ParticleInit[] = [];

  for (let i = 0; i < n; i++) {
    const roll  = Math.random();
    const type  = (roll < 0.60 ? 0 : roll < 0.84 ? 1 : 2) as 0 | 1 | 2;
    const angle = Math.random() * Math.PI * 2;
    const [cr, cg, cb] = hexToRgb(palette[Math.floor(Math.random() * palette.length)]!);
    let vx = 0, vy = 0, grav = 0, size = 0, delay = 0, life = 0, a = 0, x0 = 0, y0 = 0;

    if (type === 0) {                            // burst spark
      const s = spd + Math.random() * spd * 0.85;
      vx    = Math.cos(angle) * s;
      vy    = Math.sin(angle) * s - spd * 0.25; // slight upward bias
      grav  = 160 + Math.random() * 220;
      size  = 3 + Math.random() * 9 * rs;
      delay = Math.random() * 0.04;
      life  = 0.52 + Math.random() * 0.48;
      a     = 195 + Math.floor(Math.random() * 60);
      x0    = (Math.random() - 0.5) * 20;
      y0    = (Math.random() - 0.5) * 20;
    } else if (type === 1) {                     // trailing ember
      const s = 55 + Math.random() * 145 * rs;
      vx    = Math.cos(angle) * s;
      vy    = Math.sin(angle) * s;
      grav  = 65 + Math.random() * 90;
      size  = 1.5 + Math.random() * 3.5;
      delay = 0.03 + Math.random() * 0.20;
      life  = 0.22 + Math.random() * 0.48;
      a     = 130 + Math.floor(Math.random() * 90);
      x0    = (Math.random() - 0.5) * 10;
      y0    = (Math.random() - 0.5) * 10;
    } else {                                     // core bloom
      vx    = (Math.random() - 0.5) * 36;
      vy    = (Math.random() - 0.5) * 36;
      grav  = 0;
      size  = (10 + Math.random() * 24) * rs;
      delay = 0;
      life  = 0.10 + Math.random() * 0.20;
      a     = 180 + Math.floor(Math.random() * 75);
      x0    = (Math.random() - 0.5) * 6;
      y0    = (Math.random() - 0.5) * 6;
    }

    out.push({ vx, vy, grav, size, delay, life, cr, cg, cb, a255: a, type, x0, y0 });
  }
  return out;
}

// ─── Rarity scaling ───────────────────────────────────────────────────────────

const RING_COUNT: Record<ExplosionRarity, number> = { rare: 1, epic: 2, legendary: 3 };
const RING_MAXR:  Record<ExplosionRarity, number> = { rare: 130, epic: 195, legendary: 265 };
const DURATION_S = 1.2; // total clock length in seconds

// ─── Component ────────────────────────────────────────────────────────────────

export default function LegendaryExplosion({
  visible,
  center,
  onComplete,
  particleCount = 180,
  colors,
  rarity        = 'legendary',
  shakeIntensity = 5,
  quality       = 'high',
  variant       = 'fire',
}: LegendaryExplosionProps) {
  const { width: W, height: H } = useWindowDimensions();
  const palette  = colors ?? PALETTES[variant];
  const nRings   = RING_COUNT[rarity];
  const maxR     = RING_MAXR[rarity];
  const shakeAmp = (shakeIntensity / 10) * 14; // 0–14 px

  // Pre-compute ring RGB (avoids hex parsing inside worklet)
  const ringRgb = useMemo(
    () => ([0, 1, 2] as const).map(i => hexToRgb((palette[i] ?? palette[0])!)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Particle data — computed once at mount, captured by worklet closure
  const particles = useMemo(
    () => makeParticles(particleCount, palette, rarity, quality),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Shared values ──────────────────────────────────────────────────────────
  const clock    = useSharedValue(0);
  const isActive = useSharedValue(false);
  const emitX    = useSharedValue(center?.x ?? W * 0.5);
  const emitY    = useSharedValue(center?.y ?? H * 0.5);

  // Ring shockwave progress + alpha (up to 3 rings)
  const r1P = useSharedValue(0); const r1A = useSharedValue(0);
  const r2P = useSharedValue(0); const r2A = useSharedValue(0);
  const r3P = useSharedValue(0); const r3A = useSharedValue(0);

  // Canvas-layer shake
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  // Sync emitter position when prop changes
  useEffect(() => {
    if (center) { emitX.value = center.x; emitY.value = center.y; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.x, center?.y]);

  // ── Trigger / reset ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      cancelAnimation(clock);
      clock.value = 0;
      isActive.value = false;
      return;
    }

    cancelAnimation(clock);
    clock.value = 0;
    isActive.value = true;

    // Main particle clock: 0 → 1 over DURATION_S
    clock.value = withTiming(1, {
      duration: DURATION_S * 1000,
      easing: Easing.out(Easing.quad),
    }, (done) => {
      isActive.value = false;
      if (done && onComplete) runOnJS(onComplete)();
    });

    // Ring shockwaves
    const rDur = 700;
    r1P.value = 0; r1A.value = 0.92;
    r1P.value = withTiming(1, { duration: rDur, easing: Easing.out(Easing.cubic) });
    r1A.value = withDelay(80,  withTiming(0, { duration: rDur }));

    if (nRings >= 2) {
      r2P.value = 0; r2A.value = 0.72;
      r2P.value = withDelay(130, withTiming(1, { duration: rDur, easing: Easing.out(Easing.cubic) }));
      r2A.value = withDelay(210, withTiming(0, { duration: rDur }));
    }

    if (nRings >= 3) {
      r3P.value = 0; r3A.value = 0.50;
      r3P.value = withDelay(260, withTiming(1, { duration: rDur, easing: Easing.out(Easing.cubic) }));
      r3A.value = withDelay(340, withTiming(0, { duration: rDur }));
    }

    // Canvas-layer shake
    if (shakeAmp > 0.5) {
      const sa = shakeAmp;
      shakeX.value = withSequence(
        withTiming( sa,         { duration: 35 }),
        withTiming(-sa * 0.65,  { duration: 55 }),
        withTiming( sa * 0.38,  { duration: 50 }),
        withTiming(-sa * 0.20,  { duration: 50 }),
        withTiming(0,           { duration: 80 }),
      );
      shakeY.value = withSequence(
        withTiming( sa * 0.42,  { duration: 40 }),
        withTiming(-sa * 0.28,  { duration: 55 }),
        withTiming( sa * 0.16,  { duration: 50 }),
        withTiming(0,           { duration: 90 }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── GPU picture — runs on UI thread, zero bridge crossings ────────────────
  // Rings are drawn first (behind), particles on top — both in one recorder pass.
  const explosionPic = useDerivedValue(() => {
    'worklet';
    const t  = clock.value;
    const cx = emitX.value;
    const cy = emitY.value;

    const recorder = Skia.PictureRecorder();
    const skCanvas = recorder.beginRecording(Skia.XYWHRect(0, 0, W, H));

    // ── 1. Ring shockwaves ──────────────────────────────────────────────────
    const rp = Skia.Paint();
    rp.setAntiAlias(true);
    rp.setStyle(1 /* Stroke */);
    rp.setBlendMode(BlendMode.Plus);

    const drawRingInline = (progress: number, alpha: number, rgb0: number, rgb1: number, rgb2: number, strokeBase: number) => {
      'worklet';
      if (alpha < 0.02 || progress <= 0.01) return;
      const a = alpha > 1 ? 255 : Math.floor(alpha * 255);
      rp.setColor(((((a << 24) | (rgb0 << 16) | (rgb1 << 8) | rgb2) >>> 0) as unknown as SkColor));
      rp.setStrokeWidth(strokeBase * (1 - progress * 0.55));
      skCanvas.drawCircle(cx, cy, progress * maxR, rp);
    };

    const rg0 = ringRgb[0]!; const rg1 = ringRgb[1]!; const rg2 = ringRgb[2]!;
    drawRingInline(r1P.value, r1A.value, rg0[0], rg0[1], rg0[2], 3.8);
    if (nRings >= 2) drawRingInline(r2P.value, r2A.value, rg1[0], rg1[1], rg1[2], 3.2);
    if (nRings >= 3) drawRingInline(r3P.value, r3A.value, rg2[0], rg2[1], rg2[2], 2.6);

    // ── 2. Particles ────────────────────────────────────────────────────────
    if (isActive.value || t > 0) {
      const pp = Skia.Paint();
      pp.setAntiAlias(true);
      pp.setBlendMode(BlendMode.Plus);

      for (let i = 0; i < particles.length; i++) {
        const p      = particles[i]!;
        const localT = t - p.delay;
        if (localT <= 0 || localT > p.life) continue;

        const lifeFrac = 1 - localT / p.life;
        const tSec     = localT * DURATION_S;
        const px       = cx + p.x0 + p.vx * tSec;
        const py       = cy + p.y0 + p.vy * tSec + 0.5 * p.grav * tSec * tSec;

        let radius: number;
        let alpha: number;

        if (p.type === 2) {               // core bloom: sin bell curve
          const bell = Math.sin(Math.PI * lifeFrac);
          radius = p.size * bell;
          alpha  = p.a255 * bell;
        } else {                          // burst + ember: linear fade²
          radius = p.size * lifeFrac;
          alpha  = p.a255 * lifeFrac * lifeFrac;
        }

        if (radius < 0.4 || alpha < 1) continue;

        const a  = alpha > 255 ? 255 : Math.floor(alpha);
        pp.setColor(((((a << 24) | (p.cr << 16) | (p.cg << 8) | p.cb) >>> 0) as unknown as SkColor));
        skCanvas.drawCircle(px, py, radius, pp);
      }
    }

    return recorder.finishRecordingAsPicture();
  });

  // ── Canvas-layer shake ─────────────────────────────────────────────────────
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={explosionPic} />
      </Canvas>
    </Animated.View>
  );
}
