import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
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

/**
 * Layers whose source images use a near-black (or fully black) negative space
 * around their subject. We composite them with `screen` blend so the black
 * areas reveal the layers below — giving us free parallax silhouettes
 * without an alpha channel.
 *
 * Note: L1_mid silhouette frame is intentionally NOT rendered anymore — the
 * main backdrop scene is meant to read as the dominant cinematic image.
 */
const SCREEN_BLEND_LAYERS: ReadonlySet<SceneLayerId> = new Set(['L1_mid', 'L3_fx']);

function sceneBaseGradient(sceneId: SceneId): readonly [string, string, string] {
  if (sceneId === 'rainbowRoad') return ['#020013', '#090028', '#02000f'];
  if (sceneId === 'waterfallCavern') return ['#01130e', '#032b1f', '#000a07'];
  return ['#120010', '#22002a', '#07000f'];
}

export default function SceneBackground({ sceneOverride }: { sceneOverride?: SceneId }) {
  const { width, height } = useWindowDimensions();
  const { arena, scene } = useCosmetics();
  const sceneId = sceneOverride ?? scene;
  const variant = useMemo(() => variantFromDimensions(width, height), [width, height]);
  const pack = useMemo(() => getScenePack(sceneId), [sceneId]);
  // Slow horizontal "looking around" pan, ~16s per swing.
  const drift = useSharedValue(0);
  // Even slower Ken Burns zoom + vertical drift, ~24s per swing — gives the
  // backdrop a continuous sense of subtle camera breath.
  const kenBurns = useSharedValue(0);
  // Fast twinkle for the rainbow ambience.
  const sparkle = useSharedValue(0);

  useEffect(() => {
    drift.value = 0;
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 16000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(drift);
  }, [drift, sceneId, variant]);

  useEffect(() => {
    kenBurns.value = 0;
    kenBurns.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 24000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 24000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(kenBurns);
  }, [kenBurns, sceneId, variant]);

  useEffect(() => {
    sparkle.value = 0;
    sparkle.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sparkle);
  }, [sparkle, sceneId, variant]);

  const vignette = useMemo(
    () => ['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.04)', 'rgba(0,0,0,0.55)'] as const,
    [],
  );
  const arenaTint = useMemo(() => getArenaTint(arena), [arena]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...sceneBaseGradient(sceneId)]} style={StyleSheet.absoluteFill} />

      {/* Main backdrop — the hero image. Animated with a slow camera pan plus
          a Ken Burns zoom so it feels alive, like you're really there. The
          intermediate L1_mid silhouette is intentionally skipped so the
          backdrop reads as the dominant cinematic image. */}
      <ParallaxLayer
        variant={variant}
        layerId="L0_far"
        pack={pack}
        drift={drift}
        kenBurns={kenBurns}
        mode="backdrop"
      />

      <LinearGradient colors={[...arenaTint]} style={StyleSheet.absoluteFill} />

      {sceneId === 'rainbowRoad' ? <RainbowRoadAmbience sparkle={sparkle} /> : null}
      {sceneId === 'flamingoCasino' ? <FlamingoAmbience drift={drift} /> : null}
      {sceneId === 'waterfallCavern' ? <WaterfallAmbience drift={drift} /> : null}

      {/* Per-scene casino-table foreground — anchored at the bottom so the
          cards always read as resting on a real table, with a felt and trim
          that matches the surrounding scene aesthetic. Mostly grounded with
          only a hair of motion so it doesn't feel like the floor is sliding. */}
      <CasinoTableFloor variant={variant} pack={pack} drift={drift} />

      {/* L3_fx — sparkles / bokeh / mist drifting in front of the table for
          extra ambience. Screen-blended so the black background drops out.
          Drifts opposite to the backdrop for a real parallax depth cue. */}
      <ParallaxLayer
        variant={variant}
        layerId="L3_fx"
        pack={pack}
        drift={drift}
        kenBurns={kenBurns}
        opacity={0.55}
        mode="particles"
      />

      <LinearGradient colors={[...vignette]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

function CasinoTableFloor({
  variant,
  pack,
  drift,
}: {
  variant: SceneVariant;
  pack: ReturnType<typeof getScenePack>;
  drift: SharedValue<number>;
}) {
  const source = pack.layers[variant]?.L2_table ?? null;
  // Smaller table footprint so the cinematic backdrop dominates, AND less
  // of the asset's black "negative space" intrudes into the scene.
  const heightPct = variant === 'landscape' ? '64%' : '52%';
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (drift.value - 0.5) * 4 }, { scale: 1.02 }],
  }));
  if (!source) return null;

  // Each L2_table asset has a "top half fades to pure black" composition.
  // We composite the image with `screen` blend so those black pixels behave
  // as transparent over the animated backdrop — eliminating the dark "block"
  // the user was seeing between the table and the main scene. Bright table
  // details (felt, chrome, neon, gold trim) read essentially unchanged.
  const blendStyle = { mixBlendMode: 'screen' } as unknown as ViewStyle;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: heightPct as unknown as number,
        },
        animStyle,
        blendStyle,
      ]}
    >
      <Image
        source={source}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        contentPosition="bottom"
        transition={0}
      />
    </Animated.View>
  );
}

type ParallaxMode = 'default' | 'backdrop' | 'particles';

function ParallaxLayer({
  variant,
  layerId,
  pack,
  drift,
  kenBurns,
  opacity = 1,
  mode = 'default',
}: {
  variant: SceneVariant;
  layerId: SceneLayerId;
  pack: ReturnType<typeof getScenePack>;
  drift: SharedValue<number>;
  kenBurns?: SharedValue<number>;
  opacity?: number;
  mode?: ParallaxMode;
}) {
  const source = pack.layers[variant]?.[layerId] ?? null;
  const k = pack.parallax[layerId] ?? 0;

  const style = useAnimatedStyle(() => {
    const t = drift.value;
    const kb = kenBurns?.value ?? 0.5;

    if (mode === 'backdrop') {
      // Cinematic camera: noticeable horizontal pan + slow Ken Burns zoom
      // and gentle vertical drift. Scale stays >= 1.08 so we never expose
      // a black border at the edges of the image during the pan.
      const dx = (t - 0.5) * 64;
      const dy = (0.5 - kb) * 36;
      const scale = 1.1 + (kb - 0.5) * 0.06;
      return {
        opacity,
        transform: [{ translateX: dx }, { translateY: dy }, { scale }],
      };
    }

    if (mode === 'particles') {
      // Particles drift in the opposite direction from the backdrop and a
      // bit faster, which makes them feel closer to the viewer.
      const dx = (0.5 - t) * 50;
      const dy = (kb - 0.5) * 28;
      return {
        opacity,
        transform: [{ translateX: dx }, { translateY: dy }, { scale: 1.1 }],
      };
    }

    const dx = (t - 0.5) * 18 * k;
    const dy = (0.5 - t) * 10 * k;
    return {
      opacity,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: 1.06 }],
    };
  }, [k, opacity, mode]);

  if (!source) return null;

  // RN 0.76+ supports mixBlendMode on View. We cast through ViewStyle since
  // older @types/react-native may not yet expose the field.
  const blendStyle: ViewStyle | undefined = SCREEN_BLEND_LAYERS.has(layerId)
    ? ({ mixBlendMode: 'screen' } as unknown as ViewStyle)
    : undefined;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style, blendStyle]} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="center" transition={0} />
    </Animated.View>
  );
}

function RainbowRoadAmbience({ sparkle }: { sparkle: SharedValue<number> }) {
  // The looping rainbow road is now baked into the backdrop image itself, so
  // the JS layer just adds a soft pulsing twinkle to make the scene breathe.
  const s = useAnimatedStyle(() => ({ opacity: 0.30 + sparkle.value * 0.22 }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, s]} pointerEvents="none">
      <LinearGradient
        colors={[
          'rgba(0,229,255,0.10)',
          'rgba(192,132,252,0.10)',
          'rgba(255,215,0,0.08)',
          'rgba(255,127,0,0.08)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}


function FlamingoAmbience({ drift }: { drift: SharedValue<number> }) {
  const shimmer = useAnimatedStyle(() => ({
    opacity: 0.35,
    transform: [{ translateY: (drift.value - 0.5) * 26 }, { scale: 1.12 }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, shimmer]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(251,113,133,0.16)', 'rgba(251,191,36,0.10)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function WaterfallAmbience({ drift }: { drift: SharedValue<number> }) {
  const rays = useAnimatedStyle(() => ({
    opacity: 0.35,
    transform: [{ translateX: (drift.value - 0.5) * 22 }, { scale: 1.1 }],
  }));
  const mist = useAnimatedStyle(() => ({
    opacity: 0.22,
    transform: [{ translateY: (0.5 - drift.value) * 18 }, { scale: 1.15 }],
  }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, rays]} pointerEvents="none">
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
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, mist]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(200,255,240,0.10)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <ButterflyGroup />
    </>
  );
}


/** Single butterfly that drifts in a gentle figure-8 lemniscate path. */
function Butterfly({
  offsetX, offsetY, radius, period, phase,
}: {
  offsetX: number; offsetY: number; radius: number; period: number; phase: number;
}) {
  const t = useSharedValue(phase);
  const flutter = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      Math.floor(Math.abs(phase) * 600),
      withTiming(0.88, { duration: 1400, easing: Easing.out(Easing.cubic) }),
    );
    t.value = withRepeat(
      withTiming(phase + Math.PI * 2, { duration: period, easing: Easing.linear }),
      -1,
      false,
    );
    flutter.value = withRepeat(
      withSequence(
        withTiming(0.62, { duration: 145, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.0,  { duration: 145, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(t);
      cancelAnimation(flutter);
      cancelAnimation(opacity);
    };
  }, [t, flutter, opacity, phase, period]);

  const style = useAnimatedStyle(() => {
    // Lemniscate: x = sin(θ), y = sin(2θ)/2 gives a figure-8 path
    const x = offsetX + Math.sin(t.value) * radius;
    const y = offsetY + Math.sin(t.value * 2) * (radius * 0.48);
    return {
      opacity: opacity.value,
      transform: [
        { translateX: x },
        { translateY: y },
        { scaleX: flutter.value }, // horizontal squash/stretch mimics flapping
      ],
    };
  });

  return (
    <Animated.Text style={[butterflyStyle.icon, style]} pointerEvents="none">
      🦋
    </Animated.Text>
  );
}

const butterflyStyle = StyleSheet.create({
  icon: { position: 'absolute', fontSize: 22, top: 0, left: 0 },
});

/** Three butterflies drifting around the cavern scene. */
function ButterflyGroup() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Butterfly offsetX={55}  offsetY={210} radius={52} period={9200}  phase={0}   />
      <Butterfly offsetX={195} offsetY={300} radius={44} period={11400} phase={2.1} />
      <Butterfly offsetX={295} offsetY={175} radius={58} period={8600}  phase={4.3} />
    </View>
  );
}

