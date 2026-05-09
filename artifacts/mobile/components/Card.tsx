import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { type Card as CardType, getCardLabel, getSuitSymbol, isRedSuit } from '@/contexts/GameContext';
import { type CardSkinId, type ArenaId, useCosmetics } from '@/contexts/CosmeticsContext';
import { useColors } from '@/hooks/useColors';

const ARENA_FELT_SHADOW: Record<ArenaId, string> = {
  greenTable: '#082008',
  classic:    '#6a2e00',
  cosmic:     '#200850',
  royal:      '#503800',
  lightning:  '#003040',
  matrix:     '#003810',
};

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  onLongPress?: () => void;
  isPlayable?: boolean;
  disabled?: boolean;
  multiplicity?: number;
  style?: object;
}

const SIZES = {
  sm: { width: 40, height: 56, fontSize: 11, suitSize: 12, lineHeight: 13, suitLineHeight: 14 },
  md: { width: 56, height: 78, fontSize: 14, suitSize: 16, lineHeight: 17, suitLineHeight: 19 },
  lg: { width: 66, height: 92, fontSize: 17, suitSize: 20, lineHeight: 21, suitLineHeight: 24 },
};

/**
 * Card back. Visual style follows the player's selected cosmetic skin from
 * the 10-deck Card Style Visual Kit. A `skinOverride` lets previews force a
 * specific skin (e.g. the locked-but-still-previewable skins in the modal)
 * regardless of the player's saved selection.
 */
export function CardBack({
  size = 'md',
  style,
  skinOverride,
}: {
  size?: 'sm' | 'md' | 'lg';
  style?: object;
  skinOverride?: CardSkinId;
}) {
  const cosmetics = useCosmetics();
  const skin = skinOverride ?? cosmetics.cardSkin;
  return <SkinnedCardBack skin={skin} size={size} style={style} />;
}

interface SkinnedCardBackProps {
  skin: CardSkinId;
  size: 'sm' | 'md' | 'lg';
  style?: object;
}

/**
 * Theme tokens for each card skin: outer/inner colors, border, glow, and an
 * optional center symbol. Pure data — keeps each skin's look in one place.
 */
interface SkinTheme {
  bg: string;            // outer card body color
  innerBg: string;       // inner panel color
  border: string;        // card border color
  innerBorder: string;   // inner panel border color
  glow: string;          // shadow / glow color
  symbol: string;        // center symbol (suit, snowflake, flower, etc.)
  symbolColor: string;
  /** Optional accent rendered behind the symbol (gradient feel). */
  accent?: string;
  /** True if this skin should show twinkling stars (cosmic family). */
  hasStars?: boolean;
}

const SKIN_THEMES: Record<CardSkinId, SkinTheme> = {
  'neon-glow':       { bg: '#1a0535', innerBg: '#2a0d4a', border: '#d946ef', innerBorder: '#a855f7', glow: '#d946ef', symbol: '♠', symbolColor: '#f0abfc', accent: '#7c3aed' },
  'royal-gold':      { bg: '#1a0a05', innerBg: '#0d0703', border: '#fbbf24', innerBorder: '#fbbf24', glow: '#fbbf24', symbol: '♛', symbolColor: '#fbbf24' },
  'crystal-ice':     { bg: '#0a1f3a', innerBg: '#082848', border: '#7dd3fc', innerBorder: '#38bdf8', glow: '#7dd3fc', symbol: '❄', symbolColor: '#bae6fd' },
  'sakura-blossom':  { bg: '#3a1530', innerBg: '#4a1a3e', border: '#fb7185', innerBorder: '#f9a8d4', glow: '#f9a8d4', symbol: '✿', symbolColor: '#fda4af' },
  'inferno-flame':   { bg: '#3a0a05', innerBg: '#4a0d05', border: '#f97316', innerBorder: '#ea580c', glow: '#fb923c', symbol: '♠', symbolColor: '#fdba74', accent: '#dc2626' },
  'midnight-void':   { bg: '#02000a', innerBg: '#1a0a3a', border: '#a78bfa', innerBorder: '#7c3aed', glow: '#a78bfa', symbol: '✦', symbolColor: '#c4b5fd', hasStars: true },
  'emerald-prestige':{ bg: '#052e1a', innerBg: '#064e2e', border: '#fbbf24', innerBorder: '#10b981', glow: '#10b981', symbol: '♦', symbolColor: '#fbbf24', accent: '#059669' },
  'pearl-white':     { bg: '#f5f0e8', innerBg: '#fafafa', border: '#d4c5a9', innerBorder: '#e7d9bc', glow: '#fef3c7', symbol: '♠', symbolColor: '#a8a29e' },
  'cyber-punk':      { bg: '#0a0218', innerBg: '#1a0535', border: '#22d3ee', innerBorder: '#d946ef', glow: '#22d3ee', symbol: '♠', symbolColor: '#67e8f9', accent: '#a21caf' },
  'vintage-casino':  { bg: '#3a2a18', innerBg: '#5c4528', border: '#a16207', innerBorder: '#78350f', glow: '#92400e', symbol: '♠', symbolColor: '#fcd34d' },
};

function SkinnedCardBack({ skin, size, style }: SkinnedCardBackProps) {
  const dims = SIZES[size];
  const theme = SKIN_THEMES[skin];
  const { arena } = useCosmetics();
  const feltShadowColor = ARENA_FELT_SHADOW[arena] ?? '#0a0a0a';

  // Slow border-glow pulse — applied to every skin so the deck always feels
  // alive. Intensity varies a bit so light skins (Pearl) don't look bloomed.
  const glow = useSharedValue(0.4);
  useEffect(() => {
    const peak = skin === 'pearl-white' ? 0.45 : 0.85;
    const trough = skin === 'pearl-white' ? 0.15 : 0.35;
    glow.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(trough, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(glow);
  }, [glow, skin]);

  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glow.value }));

  // Cosmic family gets a randomized starfield rendered inside the card.
  const stars = useMemo<CosmicStarSpec[]>(() => {
    if (!theme.hasStars) return [];
    const count = size === 'sm' ? 8 : size === 'md' ? 12 : 16;
    return Array.from({ length: count }).map(() => ({
      left: 4 + Math.random() * (dims.width - 10),
      top: 4 + Math.random() * (dims.height - 10),
      size: 0.8 + Math.random() * 1.6,
      delay: Math.floor(Math.random() * 1800),
      bright: 0.5 + Math.random() * 0.5,
    }));
  }, [theme.hasStars, size, dims.width, dims.height]);

  return (
    <View
      style={[
        {
          borderRadius: 6,
          shadowColor: feltShadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.55,
          shadowRadius: 6,
          elevation: 6,
        },
        style,
      ]}
    >
    <Animated.View
      style={[
        styles.cardBase,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderWidth: 1.5,
          borderRadius: 6,
          shadowColor: theme.glow,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
        glowStyle,
      ]}
    >
      {/* Optional accent blob — gives skins like Inferno / Cyber a richer feel. */}
      {theme.accent ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: dims.height * 0.25,
            left: dims.width * 0.15,
            width: dims.width * 0.7,
            height: dims.height * 0.5,
            borderRadius: dims.width * 0.5,
            backgroundColor: theme.accent,
            opacity: 0.4,
          }}
        />
      ) : null}

      {/* Inner panel — frames the symbol. */}
      <View
        style={[
          styles.cardBackInner,
          { borderColor: theme.innerBorder, backgroundColor: theme.innerBg },
        ]}
      >
        <Text
          style={[
            styles.cardBackSymbol,
            { color: theme.symbolColor, fontSize: dims.suitSize + 4, opacity: 0.85 },
          ]}
        >
          {theme.symbol}
        </Text>
      </View>

      {/* Twinkling stars layer (cosmic family only). Drawn on top of the
          inner panel so the symbol still reads cleanly. */}
      {stars.map((s, i) => (
        <CardStar key={i} {...s} />
      ))}
    </Animated.View>
    </View>
  );
}

interface CosmicStarSpec {
  left: number;
  top: number;
  size: number;
  delay: number;
  bright: number;
}

function CardStar({ left, top, size, delay, bright }: CosmicStarSpec) {
  const opacity = useSharedValue(0.2);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(bright, { duration: 700 + Math.floor(Math.random() * 500), easing: Easing.inOut(Easing.quad) }),
          withTiming(0.1, { duration: 700 + Math.floor(Math.random() * 500), easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity, delay, bright]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#ffffff',
          shadowColor: '#fff',
          shadowOpacity: 0.9,
          shadowRadius: size * 1.8,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        },
        style,
      ]}
    />
  );
}

export default function Card({ card, faceDown, size = 'md', onPress, onLongPress, isPlayable, disabled, multiplicity, style }: CardProps) {
  const colors = useColors();
  const { arena } = useCosmetics();
  const dims = SIZES[size];

  // ── ALL hooks must be called unconditionally before any early return ──────
  const scale = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const multiPulse = useSharedValue(1);

  // Derive glow colour from card value so the worklets below can reference it
  // as a stable shared value rather than a JS closure variable.
  const isFaceUp = !faceDown && !!card;
  const isSpecial2 = isFaceUp && card!.value === 2;
  const isSpecial10 = isFaceUp && card!.value === 10;
  let glowColor: string = 'transparent';
  if (isSpecial2) glowColor = colors.neonPurple;
  if (isSpecial10) glowColor = colors.neonOrange;
  if (isPlayable) glowColor = colors.neonGold;

  const glowShared = useSharedValue(glowColor);
  const playableShared = useSharedValue(!!isPlayable);

  // Keep shared values in sync with props without violating hooks rules.
  useEffect(() => {
    glowShared.value = glowColor;
    playableShared.value = !!isPlayable;
  }, [glowColor, isPlayable, glowShared, playableShared]);

  // Pulsing luminescence — breathes between 35 % and 100 % opacity so playable
  // cards have a living, gold-shimmering halo rather than a static shadow.
  useEffect(() => {
    if (isPlayable) {
      shimmer.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: 900,  easing: Easing.inOut(Easing.quad) }),
          withTiming(0.35, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(shimmer);
      shimmer.value = 0;
    }
    return () => cancelAnimation(shimmer);
  }, [isPlayable, shimmer]);

  useEffect(() => {
    if (multiplicity && multiplicity > 1) {
      multiPulse.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(multiPulse);
      multiPulse.value = 1;
    }
    return () => cancelAnimation(multiPulse);
  }, [multiplicity, multiPulse]);

  const animStyle = useAnimatedStyle(() => {
    const playable = playableShared.value;
    const glow = glowShared.value;
    const op = playable ? 0.55 + shimmer.value * 0.45 : (glow !== 'transparent' ? 0.9 : 0);
    return {
      transform: [{ scale: scale.value }],
      shadowOpacity: op,
      shadowRadius: playable ? 14 + shimmer.value * 20 : 8,
    };
  });

  const multiBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: multiPulse.value }],
  }));

  const handlePressIn = () => { scale.value = withTiming(0.92, { duration: 80 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 12, stiffness: 200 }); };

  // ── Early return for face-down / missing card (AFTER all hooks) ────────────
  if (faceDown || !card) {
    // When the face-down back is rendered with an onPress handler (e.g. the
    // final blind face-down stage at the end of the castle), wrap it in a
    // Pressable so taps actually fire.
    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Reveal face-down card"
          hitSlop={8}
        >
          <CardBack size={size} style={style} />
        </Pressable>
      );
    }
    return <CardBack size={size} style={style} />;
  }

  // card is guaranteed non-null past this point.
  const isRed = isRedSuit(card.suit);
  const label = getCardLabel(card.value);
  const suitSym = getSuitSymbol(card.suit);
  let borderColor = '#3a1a5e';
  if (isSpecial2) borderColor = colors.neonPurple;
  if (isSpecial10) borderColor = colors.neonOrange;

  const feltShadowColor = ARENA_FELT_SHADOW[arena] ?? '#0a0a0a';

  return (
    <View
      style={[
        {
          borderRadius: 6,
          shadowColor: feltShadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
          elevation: 5,
        },
        style,
      ]}
    >
    <Animated.View
      style={[
        {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 8,
          elevation: glowColor !== 'transparent' ? 20 : 2,
          borderRadius: 6,
        },
        animStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || (!onPress && !onLongPress)}
        style={[
          styles.cardBase,
          {
            width: dims.width,
            height: dims.height,
            backgroundColor: '#f8f4ff',
            borderColor,
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ]}
      >
        <View style={styles.cardCornerTL}>
          <Text style={[styles.cardValue, { fontSize: dims.fontSize, lineHeight: dims.lineHeight, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
            {label}
          </Text>
          <Text style={[styles.cardSuit, { fontSize: dims.suitSize, lineHeight: dims.suitLineHeight, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
            {suitSym}
          </Text>
        </View>
        <Text style={[styles.cardCenter, { fontSize: dims.suitSize + 6, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
          {suitSym}
        </Text>
        <View style={styles.cardCornerBR}>
          <Text style={[styles.cardValue, { fontSize: dims.fontSize, lineHeight: dims.lineHeight, color: isRed ? '#dc2626' : '#1a1a2e', transform: [{ rotate: '180deg' }] }]}>
            {label}
          </Text>
        </View>
        {isSpecial2 && (
          <View style={[styles.specialBadge, { backgroundColor: '#7c3aed' }]}>
            <Text style={styles.specialText}>R</Text>
          </View>
        )}
        {isSpecial10 && (
          <View style={[styles.specialBadge, { backgroundColor: '#ea580c' }]}>
            <Text style={styles.specialText}>B</Text>
          </View>
        )}
        {multiplicity && multiplicity > 1 ? (
          <View style={styles.multiplicityWrap} pointerEvents="none">
            <Animated.View style={[styles.multiplicityBadge, { backgroundColor: colors.neonGold, borderColor: '#0d001a' }, multiBadgeStyle]}>
              <Text style={styles.multiplicityText}>x{multiplicity}</Text>
            </Animated.View>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCornerTL: {
    position: 'absolute',
    top: 3,
    left: 4,
    alignItems: 'center',
  },
  cardCornerBR: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    alignItems: 'center',
  },
  cardValue: {
    fontWeight: '700',
  },
  cardSuit: {},
  cardCenter: {
    opacity: 0.25,
  },
  cardBackInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4a1a7a',
    backgroundColor: '#0d0020',
  },
  cardBackSymbol: {
    color: '#6b21a8',
    opacity: 0.6,
  },
  specialBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
  },
  multiplicityWrap: {
    position: 'absolute',
    bottom: -9,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  multiplicityBadge: {
    minWidth: 24,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiplicityText: {
    color: '#1a0535',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
