import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import { ARENA_TABLE_TINT } from '@/lib/sceneAssets';
import {
  type SceneId,
  type SceneLayerId,
  type SceneVariant,
  getScenePack,
} from '@/lib/scenePacks';

function getArenaTint(arena: keyof typeof ARENA_TABLE_TINT): readonly [string, string, string] {
  const v = ARENA_TABLE_TINT[arena] ?? ARENA_TABLE_TINT.classic;
  return (v ?? ['rgba(88,28,135,0.35)', 'rgba(7,0,15,0.25)', 'rgba(88,28,135,0.4)']) as readonly [string, string, string];
}

function variantFromDimensions(w: number, h: number): SceneVariant {
  return w > h ? 'landscape' : 'portrait';
}

const SCREEN_BLEND_LAYERS: ReadonlySet<SceneLayerId> = new Set(['L1_mid', 'L3_fx']);

function sceneBaseGradient(sceneId: SceneId): readonly [string, string, string] {
  if (sceneId === 'waterfallCavern') return ['#01130e', '#032b1f', '#000a07'];
  if (sceneId === 'olympusThrone')   return ['#0d0a00', '#1a1400', '#0a0800'];
  if (sceneId === 'cosmicSanctum')   return ['#000008', '#050010', '#000005'];
  if (sceneId === 'flamingoFloor')   return ['#1a0008', '#2d0015', '#0f0006'];
  if (sceneId === 'matrixArena')     return ['#001a08', '#000e04', '#000000'];
  // casinoGreen
  return ['#120010', '#22002a', '#07000f'];
}

// ── Cosmic Sanctum blackhole HTML — adapted from the design brief ─────────────
const COSMIC_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #030008; }

    .arena-bg {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse at 50% 45%, rgba(120,0,180,0.55) 0%, rgba(40,0,80,0.70) 30%, rgba(3,0,8,0.90) 65%, #030008 100%),
        conic-gradient(from 200deg at 50% 45%, #0a0018 0deg, #1a0040 60deg, #0d0030 120deg, #050015 180deg, #1a0040 240deg, #0a0018 360deg);
      animation: bgPulse 7s ease-in-out infinite;
      z-index: -10;
    }

    .blackhole-glow {
      position: fixed;
      left: 50%; top: 45%;
      width: 42vmin; height: 42vmin;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: radial-gradient(circle,
        rgba(255,255,255,.95) 0%,
        rgba(220,160,255,.65) 10%,
        rgba(160,40,255,.38) 24%,
        rgba(40,0,80,.15) 42%,
        transparent 65%);
      filter: blur(10px);
      animation: pulseCore 2.8s ease-in-out infinite;
      mix-blend-mode: screen;
      z-index: -8;
    }

    .spiral {
      position: fixed;
      left: 50%; top: 45%;
      width: 120vmax; height: 120vmax;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(180,60,255,.22) 45deg,
        transparent 90deg,
        rgba(255,120,255,.28) 145deg,
        transparent 210deg,
        rgba(80,180,255,.18) 285deg,
        transparent 360deg
      );
      filter: blur(18px);
      animation: spin 18s linear infinite;
      mix-blend-mode: screen;
      z-index: -7;
    }

    .grid {
      position: fixed;
      inset: -50%;
      background-image:
        linear-gradient(rgba(180,80,255,.14) 1px, transparent 1px),
        linear-gradient(90deg, rgba(180,80,255,.14) 1px, transparent 1px);
      background-size: 70px 70px;
      transform-origin: center;
      animation: gridVacuum 10s linear infinite;
      opacity: .38;
      mix-blend-mode: screen;
      z-index: -6;
    }

    .stars {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 20% 25%, white 0 1px, transparent 2px),
        radial-gradient(circle at 70% 20%, white 0 1px, transparent 2px),
        radial-gradient(circle at 80% 70%, white 0 1px, transparent 2px),
        radial-gradient(circle at 35% 80%, white 0 1px, transparent 2px),
        radial-gradient(circle at 55% 50%, white 0 1px, transparent 2px);
      opacity: .6;
      animation: starPull 5s linear infinite;
      z-index: -5;
    }

    .particles {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: -4;
    }

    .particle {
      position: absolute;
      width: 4px; height: 4px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 0 12px #d86cff, 0 0 22px #8f3cff;
      animation: fallIn linear infinite;
    }

    @keyframes bgPulse {
      0%, 100% { filter: brightness(1) saturate(1.1); transform: scale(1); }
      50%       { filter: brightness(1.18) saturate(1.45); transform: scale(1.035); }
    }
    @keyframes pulseCore {
      0%, 100% { transform: translate(-50%,-50%) scale(.92); opacity: .65; }
      50%       { transform: translate(-50%,-50%) scale(1.12); opacity: 1; }
    }
    @keyframes spin {
      from { transform: translate(-50%,-50%) rotate(0deg) scale(1); }
      to   { transform: translate(-50%,-50%) rotate(360deg) scale(1.05); }
    }
    @keyframes gridVacuum {
      from { transform: rotate(0deg) scale(1.25); background-position: 0 0; }
      to   { transform: rotate(360deg) scale(.75); background-position: 140px 140px; }
    }
    @keyframes starPull {
      from { transform: scale(1.1) rotate(0deg); opacity: .8; }
      to   { transform: scale(.55) rotate(30deg); opacity: .15; }
    }
    @keyframes fallIn {
      0%   { transform: translate(var(--x), var(--y)) scale(1); opacity: 1; }
      100% { transform: translate(50vw, 45vh) scale(.1); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="arena-bg"></div>
  <div class="blackhole-glow"></div>
  <div class="spiral"></div>
  <div class="grid"></div>
  <div class="stars"></div>
  <div class="particles">
    <span class="particle" style="--x:10vw;--y:10vh;animation-duration:4s;"></span>
    <span class="particle" style="--x:80vw;--y:15vh;animation-duration:6s;"></span>
    <span class="particle" style="--x:20vw;--y:75vh;animation-duration:5s;"></span>
    <span class="particle" style="--x:90vw;--y:80vh;animation-duration:7s;"></span>
    <span class="particle" style="--x:50vw;--y:5vh;animation-duration:3.5s;"></span>
  </div>
</body>
</html>`;

// ── Matrix rain HTML — embedded verbatim from the design brief ────────────────
const MATRIX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #020802; }
    canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block;
      background: radial-gradient(circle at center, rgba(0,255,90,0.18), transparent 35%),
                  linear-gradient(180deg, #001a08 0%, #000000 100%); }
  </style>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const chars = 'アァカサタナハマヤャラワガザダバパ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ\u2660\u2663\u2665\u2666';
    const fontSize = 20;
    let drops = [], speeds = [], columns;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth, h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.floor(w / fontSize);
      drops  = Array.from({ length: columns }, () => Math.random() * -100);
      speeds = Array.from({ length: columns }, () => 0.5 + Math.random() * 2.2);
    }

    function draw() {
      ctx.fillStyle = 'rgba(0,8,2,0.13)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = fontSize + 'px monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < columns; i++) {
        const x = i * fontSize + fontSize / 2;
        const y = drops[i] * fontSize;
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.shadowBlur = 18; ctx.shadowColor = '#ffffff'; ctx.fillStyle = '#ffffff';
        ctx.fillText(ch, x, y);
        for (let t = 1; t < 12; t++) {
          const tc = chars[Math.floor(Math.random() * chars.length)];
          const alpha = 1 - t / 12;
          ctx.shadowBlur = 8 * alpha; ctx.shadowColor = '#00ff66';
          ctx.fillStyle = 'rgba(0,' + (180 - t * 8) + ',70,' + alpha + ')';
          ctx.fillText(tc, x, y - t * fontSize);
        }
        drops[i] += speeds[i] * 0.35;
        if (y > window.innerHeight + Math.random() * 500) {
          drops[i] = Math.random() * -50;
          speeds[i] = 0.5 + Math.random() * 2.2;
        }
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
  </script>
</body>
</html>`;

export default function SceneBackground({ sceneOverride }: { sceneOverride?: SceneId }) {
  const { width, height } = useWindowDimensions();
  const { arena, scene } = useCosmetics();
  const sceneId = sceneOverride ?? scene;
  const variant = useMemo(() => variantFromDimensions(width, height), [width, height]);
  const pack = useMemo(() => getScenePack(sceneId), [sceneId]);

  const vignette = useMemo(
    () => ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.55)'] as const,
    [],
  );
  const arenaTint = useMemo(() => getArenaTint(arena as keyof typeof ARENA_TABLE_TINT), [arena]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...sceneBaseGradient(sceneId)]} style={StyleSheet.absoluteFill} />

      <StaticLayer variant={variant} layerId="L0_far" pack={pack} mode="backdrop" />

      {sceneId === 'matrixArena' ? <MatrixAmbience /> : null}

      <LinearGradient colors={[...arenaTint]} style={StyleSheet.absoluteFill} />

      {sceneId === 'casinoGreen' ? <FlamingoAmbience /> : null}
      {sceneId === 'waterfallCavern' ? <WaterfallAmbience /> : null}
      {sceneId === 'olympusThrone' ? <OlympusAmbience /> : null}
      {sceneId === 'cosmicSanctum' ? <CosmicAmbience /> : null}
      {sceneId === 'flamingoFloor' ? <FlamingoFloorAmbience /> : null}

      <StaticLayer variant={variant} layerId="L3_fx" pack={pack} opacity={0.55} mode="particles" />

      <LinearGradient colors={[...vignette]} style={StyleSheet.absoluteFill} />
    </View>
  );
}


type ParallaxMode = 'default' | 'backdrop' | 'particles';

function StaticLayer({
  variant,
  layerId,
  pack,
  opacity = 1,
  mode = 'default',
}: {
  variant: SceneVariant;
  layerId: SceneLayerId;
  pack: ReturnType<typeof getScenePack>;
  opacity?: number;
  mode?: ParallaxMode;
}) {
  const source = pack.layers[variant]?.[layerId] ?? null;

  const blendStyle: ViewStyle | undefined = SCREEN_BLEND_LAYERS.has(layerId)
    ? ({ mixBlendMode: 'screen' } as unknown as ViewStyle)
    : undefined;

  // Static scale so the image fully covers (same as the animated version at neutral position)
  const scale = mode === 'backdrop' ? 1.1 : mode === 'particles' ? 1.1 : 1.06;

  if (!source) return null;

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity }, blendStyle]}
      pointerEvents="none"
    >
      <View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
        <Image source={source} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" transition={0} />
      </View>
    </View>
  );
}

function MatrixAmbience() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        source={{ html: MATRIX_HTML }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        pointerEvents="none"
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

function FlamingoAmbience() {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(251,113,133,0.16)', 'rgba(251,191,36,0.10)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function FlamingoFloorAmbience() {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.32 }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(255,20,120,0.20)', 'rgba(220,40,100,0.08)', 'rgba(255,80,160,0.18)']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function CosmicAmbience() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <WebView
        source={{ html: COSMIC_HTML }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        pointerEvents="none"
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

function OlympusAmbience() {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.30 }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(251,191,36,0.18)', 'rgba(255,255,255,0.06)', 'rgba(251,191,36,0.12)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

function WaterfallAmbience() {
  return (
    <>
      <View style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} pointerEvents="none">
        <LinearGradient
          colors={[
            'rgba(180,255,230,0.0)',
            'rgba(180,255,230,0.14)',
            'rgba(255,255,255,0.06)',
            'rgba(180,255,230,0.0)',
          ]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={[StyleSheet.absoluteFill, { opacity: 0.22 }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(200,255,240,0.10)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </>
  );
}
