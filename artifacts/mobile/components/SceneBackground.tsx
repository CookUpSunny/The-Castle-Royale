import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
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
  return ['#120010', '#22002a', '#07000f'];
}

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
  const arenaTint = useMemo(() => getArenaTint(arena), [arena]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[...sceneBaseGradient(sceneId)]} style={StyleSheet.absoluteFill} />

      <StaticLayer variant={variant} layerId="L0_far" pack={pack} mode="backdrop" />

      <LinearGradient colors={[...arenaTint]} style={StyleSheet.absoluteFill} />

      {sceneId === 'flamingoCasino' ? <FlamingoAmbience /> : null}
      {sceneId === 'waterfallCavern' ? <WaterfallAmbience /> : null}
      {sceneId === 'olympusThrone' ? <OlympusAmbience /> : null}
      {sceneId === 'cosmicSanctum' ? <CosmicAmbience /> : null}

      <CasinoTableFloor variant={variant} pack={pack} />

      <StaticLayer variant={variant} layerId="L3_fx" pack={pack} opacity={0.55} mode="particles" />

      <LinearGradient colors={[...vignette]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

function CasinoTableFloor({
  variant,
  pack,
}: {
  variant: SceneVariant;
  pack: ReturnType<typeof getScenePack>;
}) {
  const source = pack.layers[variant]?.L2_table ?? null;
  const heightPct = variant === 'landscape' ? '64%' : '52%';
  const blendStyle = { mixBlendMode: 'screen' } as unknown as ViewStyle;

  if (!source) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: heightPct as unknown as number,
        },
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

function CosmicAmbience() {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity: 0.28 }]} pointerEvents="none">
      <LinearGradient
        colors={['rgba(120,80,255,0.22)', 'rgba(180,40,255,0.08)', 'rgba(60,20,180,0.20)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
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
