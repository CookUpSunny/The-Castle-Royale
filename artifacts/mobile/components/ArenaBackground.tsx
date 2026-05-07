import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import type { ArenaId } from '@/contexts/CosmeticsContext';

interface ArenaBackgroundProps {
  arenaOverride?: ArenaId;
}

export const ARENA_IMAGES: Partial<Record<ArenaId, number>> = {
  classic:   require('@/assets/arenas/flamingo_floor.png') as number,
  cosmic:    require('@/assets/arenas/cosmic_sanctum.png') as number,
  royal:     require('@/assets/arenas/olympus_throne.png') as number,
  lightning: require('@/assets/arenas/oasis_cave.png') as number,
};

export default function ArenaBackground({ arenaOverride }: ArenaBackgroundProps) {
  const { arena } = useCosmetics();
  const which = arenaOverride ?? arena;

  if (which === 'greenTable') return <GreenTableArena />;
  if (which === 'cosmic')    return <CosmicArena />;
  if (which === 'royal')     return <RoyalArena />;
  if (which === 'lightning') return <LightningArena />;
  return <ClassicArena />;
}

const ARENA_BLEND: Record<ArenaId, readonly [string, string, string, string, string]> = {
  greenTable: [
    'transparent',
    'rgba(20,90,40,0.14)',
    'rgba(20,90,40,0.24)',
    'rgba(20,90,40,0.14)',
    'transparent',
  ],
  classic: [
    'transparent',
    'rgba(200,50,120,0.18)',
    'rgba(200,50,120,0.30)',
    'rgba(200,50,120,0.18)',
    'transparent',
  ],
  royal: [
    'transparent',
    'rgba(180,110,10,0.18)',
    'rgba(180,110,10,0.28)',
    'rgba(180,110,10,0.18)',
    'transparent',
  ],
  cosmic: [
    'transparent',
    'rgba(60,30,180,0.20)',
    'rgba(60,30,180,0.32)',
    'rgba(60,30,180,0.20)',
    'transparent',
  ],
  lightning: [
    'transparent',
    'rgba(10,140,130,0.16)',
    'rgba(10,140,130,0.26)',
    'rgba(10,140,130,0.16)',
    'transparent',
  ],
};

const ARENA_PHOTO_LABELS: Partial<Record<ArenaId, string>> = {
  classic:   'FLAMINGO FLOOR',
  cosmic:    'COSMIC SANCTUM',
  royal:     'OLYMPUS THRONE',
  lightning: 'OASIS IN THE CAVE',
};

const ARENA_FALLBACK_COLORS: Record<ArenaId, readonly [string, string, string]> = {
  greenTable: ['#0a2e14', '#0d3b1a', '#0a2e14'],
  classic:    ['#3d0a28', '#5c1040', '#8a1050'],
  cosmic:     ['#0d0520', '#1a0840', '#100530'],
  royal:      ['#1e1200', '#3a2200', '#2a1a00'],
  lightning:  ['#031a1a', '#062e28', '#041f1c'],
};

function ArenaPhotoBase({ arenaId }: { arenaId: ArenaId }) {
  const fallback = ARENA_FALLBACK_COLORS[arenaId];
  const label = ARENA_PHOTO_LABELS[arenaId];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Fallback gradient — always visible; photo renders on top when available */}
      <LinearGradient
        colors={[...fallback]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={ARENA_IMAGES[arenaId]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />
      {/* Muted fallback label — tiny caps top-left; ensures arenas are identifiable
          even when the photo asset is a transparent placeholder */}
      {label ? (
        <View style={styles.photoLabelContainer} pointerEvents="none">
          <Text style={styles.photoLabel}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function TableEdgeBlend({ arenaId }: { arenaId: ArenaId }) {
  const blendColors = ARENA_BLEND[arenaId];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[...blendColors]}
        locations={[0, 0.22, 0.5, 0.78, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', blendColors[2], 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Casino Green Table (default arena — pure-code, no photo, fully static)
// ---------------------------------------------------------------------------

function GreenTableArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#0a2e14', '#0d3b1a', '#0a2e14']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Felt texture: faint horizontal weave lines */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.00)',
          'rgba(255,255,255,0.015)',
          'rgba(255,255,255,0.00)',
          'rgba(255,255,255,0.015)',
          'rgba(255,255,255,0.00)',
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Overhead spotlight — warm cream glow from above center */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.65 }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,245,200,0.28)', 'rgba(255,235,160,0.12)', 'transparent']}
          locations={[0, 0.35, 0.7]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(255,245,200,0.10)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Diagonal shimmer — static mid-point */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.13 }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Wood rail glow */}
      <LinearGradient
        colors={['rgba(120,60,10,0.32)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.18 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(120,60,10,0.32)', 'transparent']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.82 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(120,60,10,0.24)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.12, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(120,60,10,0.24)', 'transparent']}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0.88, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Corner vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.35)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Classic (Flamingo Floor)
// ---------------------------------------------------------------------------

function ClassicArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ArenaPhotoBase arenaId="classic" />
      <TableEdgeBlend arenaId="classic" />
      <LinearGradient
        colors={['rgba(255,20,160,0.18)', 'transparent', 'rgba(255,80,180,0.14)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Royal (Olympus Throne)
// ---------------------------------------------------------------------------

function RoyalArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ArenaPhotoBase arenaId="royal" />
      <TableEdgeBlend arenaId="royal" />
      <LinearGradient
        colors={['rgba(255,240,180,0.35)', 'transparent', 'rgba(251,191,36,0.20)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cosmic (Cosmic Sanctum)
// ---------------------------------------------------------------------------

function CosmicArena() {
  const stars = useMemo(() => {
    const arr: { left: string; top: string; size: number; opacity: number }[] = [];
    for (let i = 0; i < 36; i++) {
      arr.push({
        left: `${(i * 37 + 11) % 100}%`,
        top: `${(i * 53 + 7) % 100}%`,
        size: 1 + (i % 3) * 0.9,
        opacity: 0.45 + (i % 5) * 0.11,
      });
    }
    return arr;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ArenaPhotoBase arenaId="cosmic" />
      <TableEdgeBlend arenaId="cosmic" />
      {/* Static nebula glow */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.42 }]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(120,80,255,0.28)', 'rgba(60,30,160,0.14)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,80,200,0.14)', 'transparent', 'rgba(80,200,255,0.14)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {/* Static stars */}
      {stars.map((s, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: s.left as unknown as number,
            top: s.top as unknown as number,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#ffffff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Lightning Storm (Oasis in the Cave) — static, no bolt/cloud animation
// ---------------------------------------------------------------------------

function LightningArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ArenaPhotoBase arenaId="lightning" />
      <TableEdgeBlend arenaId="lightning" />
      <LinearGradient
        colors={['rgba(20,180,120,0.16)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />
      {/* Static cloud blobs */}
      <View pointerEvents="none" style={{ position: 'absolute', left: '5%',  top: '4%',  width: 260, height: 90,  borderRadius: 50, backgroundColor: 'rgba(100,80,200,0.28)', opacity: 0.55 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: '40%', top: '10%', width: 310, height: 100, borderRadius: 55, backgroundColor: 'rgba(80,60,180,0.22)',   opacity: 0.55 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: '60%', top: '2%',  width: 240, height: 80,  borderRadius: 44, backgroundColor: 'rgba(120,90,220,0.30)',  opacity: 0.55 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  darkOverlay: {
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  photoLabelContainer: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  photoLabel: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
