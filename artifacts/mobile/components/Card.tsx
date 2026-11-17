import React, { useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
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
import { EASE_OUT } from '@/lib/motion';
import { type Card as CardType, getCardLabel, getSuitSymbol, isRedSuit } from '@/contexts/GameContext';
import { type CardSkinId, type ArenaId, useCosmetics } from '@/contexts/CosmeticsContext';
import { CARD_BACK_IMAGES } from '@/lib/cardBackImages';
import { isImageCardSkinId, type ProceduralCardSkinId } from '@/lib/cardSkins';
import { grandscapeCardBackSource, grandscapeFaceSource } from '@/lib/grandscapeMirrorImages';
import { useGlowClock } from '@/components/GlowClock';
import { cardBackStarsTwinkle, haloOpacity } from '@/lib/glow';
import { useColors } from '@/hooks/useColors';

const ARENA_FELT_SHADOW: Record<ArenaId, string> = {
  greenTable: '#082008',
  classic:    '#6a2e00',
  cosmic:     '#200850',
  royal:      '#503800',
  lightning:  '#003040',
  matrix:      '#003810',
  rainbowRoad: '#180830',
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
  /** Uniform face size. 1 keeps every existing card the same size. */
  layoutScale?: number;
}

const SIZES = {
  sm: { width: 40, height: 56, fontSize: 11, suitSize: 12, lineHeight: 13, suitLineHeight: 14 },
  md: { width: 56, height: 78, fontSize: 14, suitSize: 16, lineHeight: 17, suitLineHeight: 19 },
  lg: { width: 66, height: 92, fontSize: 17, suitSize: 20, lineHeight: 21, suitLineHeight: 24 },
};

/**
 * Card back. Procedural skins keep the 10-deck Card Style Visual Kit.
 * Image skins paint the full owner artwork with resizeMode contain so the
 * design is not stretched or cropped. A `skinOverride` lets previews force a
 * specific skin (e.g. the locked-but-still-previewable skins in the modal)
 * regardless of the player's saved selection.
 */
export function CardBack({
  size = 'md',
  style,
  skinOverride,
  scale = 1,
  live = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  style?: object;
  skinOverride?: CardSkinId;
  /** Uniform scale of the back art. 1 keeps every existing card the same size. */
  scale?: number;
  /** The top draw-deck card. Every other back is a static glow. */
  live?: boolean;
}) {
  const cosmetics = useCosmetics();
  const skin = skinOverride ?? cosmetics.cardSkin ?? 'royal-gold';
  // A forced preview keeps that back. The equipped pack replaces the live back
  // only, and only when its artwork is actually bundled.
  const packBack = !skinOverride && cosmetics.cardFacePackActive === 'grandscape-mirror'
    ? grandscapeCardBackSource()
    : null;
  if (packBack) {
    return (
      <ImageCardBack
        source={packBack}
        size={size}
        style={style}
        scale={scale}
        testID="card-back-grandscape-mirror"
      />
    );
  }
  return <SkinnedCardBack skin={skin} size={size} style={style} scale={scale} live={live} />;
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

const SKIN_THEMES: Record<ProceduralCardSkinId, SkinTheme> = {
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

function SkinnedCardBack({ skin, size, style, scale = 1, live = false }: SkinnedCardBackProps & { scale?: number; live?: boolean }) {
  if (isImageCardSkinId(skin)) {
    return (
      <ImageCardBack
        source={CARD_BACK_IMAGES[skin]}
        size={size}
        style={style}
        scale={scale}
        testID={`card-back-${skin}`}
      />
    );
  }
  return (
    <ProceduralCardBack
      skin={skin}
      size={size}
      style={style}
      scale={scale}
      live={live}
      testID={`card-back-${skin}`}
    />
  );
}

/**
 * Owner artwork, full front. Contain keeps the original aspect inside the
 * same card slot the procedural backs use, so filigree is not cropped and
 * the picture is not stretched. Procedural skins never reach this path.
 */
function ImageCardBack({
  source,
  size,
  style,
  scale,
  testID,
}: {
  source: ImageSourcePropType;
  size: 'sm' | 'md' | 'lg';
  style?: object;
  scale: number;
  testID: string;
}) {
  const base = SIZES[size];
  const width = base.width * scale;
  const height = base.height * scale;
  const radius = 6 * scale;
  const { arena } = useCosmetics();
  const feltShadowColor = ARENA_FELT_SHADOW[arena] ?? '#0a0a0a';

  return (
    <View
      testID={testID}
      style={[
        {
          borderRadius: radius,
          shadowColor: feltShadowColor,
          shadowOffset: { width: 0, height: 4 * scale },
          shadowOpacity: 0.55,
          shadowRadius: 6 * scale,
          elevation: 6,
        },
        style,
      ]}
    >
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: '#07000f',
        }}
      >
        <Image
          source={source}
          resizeMode="contain"
          fadeDuration={0}
          style={{ width, height }}
          accessibilityIgnoresInvertColors
        />
      </View>
    </View>
  );
}

function ProceduralCardBack({
  skin,
  size,
  style,
  scale = 1,
  live = false,
  testID,
}: {
  skin: ProceduralCardSkinId;
  size: 'sm' | 'md' | 'lg';
  style?: object;
  scale?: number;
  live?: boolean;
  testID: string;
}) {
  const base = SIZES[size];
  const dims = {
    width: base.width * scale,
    height: base.height * scale,
    fontSize: base.fontSize * scale,
    suitSize: base.suitSize * scale,
    lineHeight: base.lineHeight * scale,
    suitLineHeight: base.suitLineHeight * scale,
  };
  const theme = SKIN_THEMES[skin];
  const { arena } = useCosmetics();
  const feltShadowColor = ARENA_FELT_SHADOW[arena] ?? '#0a0a0a';

  const clock = useGlowClock();
  const restGlow = skin === 'pearl-white' ? 0.3 : 0.6;
  const liveStyle = useAnimatedStyle(() => ({
    opacity: live ? haloOpacity(clock.value, true) : restGlow,
  }));

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
      testID={testID}
      style={[
        {
          borderRadius: 6 * scale,
          shadowColor: feltShadowColor,
          shadowOffset: { width: 0, height: 4 * scale },
          shadowOpacity: 0.55,
          shadowRadius: 6 * scale,
          elevation: 6,
        },
        style,
      ]}
    >
    <View
      style={[
        styles.cardBase,
        {
          width: dims.width,
          height: dims.height,
          backgroundColor: theme.bg,
          borderColor: theme.border,
          borderWidth: 1.5 * scale,
          borderRadius: 6 * scale,
          shadowColor: theme.glow,
          shadowOpacity: restGlow,
          shadowRadius: 8 * scale,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
      ]}
    >
      {live ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -4,
              right: -4,
              top: -4,
              bottom: -4,
              borderRadius: 8 * scale,
              shadowColor: theme.glow,
              shadowOpacity: 0.9,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
            },
            liveStyle,
          ]}
        />
      ) : null}
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
          {
            borderColor: theme.innerBorder,
            backgroundColor: theme.innerBg,
            margin: 4 * scale,
            borderRadius: 4 * scale,
            borderWidth: 1 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.cardBackSymbol,
            { color: theme.symbolColor, fontSize: (base.suitSize + 4) * scale, opacity: 0.85 },
          ]}
        >
          {theme.symbol}
        </Text>
      </View>

      {/* Twinkling stars layer (cosmic family only). Drawn on top of the
          inner panel so the symbol still reads cleanly. */}
      {stars.map((s, i) => (
        <CardStar key={i} {...s} twinkle={cardBackStarsTwinkle(size)} />
      ))}
    </View>
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

function CardStar({ left, top, size, delay, bright, twinkle }: CosmicStarSpec & { twinkle: boolean }) {
  const opacity = useSharedValue(twinkle ? 0.2 : bright * 0.7);
  useEffect(() => {
    if (!twinkle) return;
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
  }, [opacity, delay, bright, twinkle]);

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

export default function Card({ card, faceDown, size = 'md', onPress, onLongPress, isPlayable, disabled, multiplicity, style, layoutScale = 1 }: CardProps) {
  const colors = useColors();
  const { arena, cardFacePackActive } = useCosmetics();
  const dims = SIZES[size];
  const faceW = dims.width * layoutScale;
  const faceH = dims.height * layoutScale;
  const fontSize = dims.fontSize * layoutScale;
  const suitSize = dims.suitSize * layoutScale;
  const lineHeight = dims.lineHeight * layoutScale;
  const suitLineHeight = dims.suitLineHeight * layoutScale;

  // ── ALL hooks must be called unconditionally before any early return ──────
  const scale = useSharedValue(1);
  const multiPulse = useSharedValue(1);
  const clock = useGlowClock();

  // Derive glow colour from card value so the worklets below can reference it
  // as a stable shared value rather than a JS closure variable.
  const isFaceUp = !faceDown && !!card;
  const isSpecial2 = isFaceUp && card!.value === 2;
  const isSpecial10 = isFaceUp && card!.value === 10;
  let glowColor: string = 'transparent';
  if (isSpecial2) glowColor = colors.neonPurple;
  if (isSpecial10) glowColor = colors.neonOrange;
  if (isPlayable) glowColor = colors.neonGold;

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

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity(clock.value, !!isPlayable),
  }));

  const multiBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: multiPulse.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.97, { duration: 120, easing: EASE_OUT });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 160, easing: EASE_OUT });
  };

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
  const faceArt = cardFacePackActive === 'grandscape-mirror' ? grandscapeFaceSource(card) : null;
  const faceLabel = `${label} of ${suitSym}`;

  return (
    <View
      style={[
        {
          borderRadius: 6 * layoutScale,
          shadowColor: feltShadowColor,
          shadowOffset: { width: 0, height: 4 * layoutScale },
          shadowOpacity: 0.5,
          shadowRadius: 6 * layoutScale,
          elevation: 5,
        },
        style,
      ]}
    >
    <Animated.View style={animStyle}>
      {isPlayable || glowColor !== 'transparent' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -6,
              right: -6,
              top: -6,
              bottom: -6,
              borderRadius: 12,
              shadowColor: isPlayable ? colors.neonGold : glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 12,
            },
            haloStyle,
          ]}
        />
      ) : null}
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || (!onPress && !onLongPress)}
        accessibilityLabel={faceLabel}
        style={[
          styles.cardBase,
          {
            width: faceW,
            height: faceH,
            backgroundColor: '#f8f4ff',
            borderColor,
            borderWidth: 1.5,
            borderRadius: 6 * layoutScale,
          },
        ]}
      >
        {faceArt ? (
          <Image
            source={faceArt}
            resizeMode="contain"
            fadeDuration={0}
            style={{ width: faceW, height: faceH }}
            accessibilityIgnoresInvertColors
            testID="card-face-grandscape-mirror"
          />
        ) : (
          <>
            <View style={[styles.cardCornerTL, { top: 3 * layoutScale, left: 4 * layoutScale }]}>
              <Text style={[styles.cardValue, { fontSize, lineHeight, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
                {label}
              </Text>
              <Text style={[styles.cardSuit, { fontSize: suitSize, lineHeight: suitLineHeight, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
                {suitSym}
              </Text>
            </View>
            <Text style={[styles.cardCenter, { fontSize: suitSize + 6 * layoutScale, color: isRed ? '#dc2626' : '#1a1a2e' }]}>
              {suitSym}
            </Text>
            <View style={[styles.cardCornerBR, { bottom: 3 * layoutScale, right: 4 * layoutScale }]}>
              <Text style={[styles.cardValue, { fontSize, lineHeight, color: isRed ? '#dc2626' : '#1a1a2e', transform: [{ rotate: '180deg' }] }]}>
                {label}
              </Text>
            </View>
          </>
        )}
        {isSpecial2 && (
          <View style={[styles.specialBadge, { backgroundColor: '#7c3aed', width: 12 * layoutScale, height: 12 * layoutScale, borderRadius: 6 * layoutScale }]}>
            <Text style={[styles.specialText, { fontSize: 7 * layoutScale }]}>R</Text>
          </View>
        )}
        {isSpecial10 && (
          <View style={[styles.specialBadge, { backgroundColor: '#ea580c', width: 12 * layoutScale, height: 12 * layoutScale, borderRadius: 6 * layoutScale }]}>
            <Text style={[styles.specialText, { fontSize: 7 * layoutScale }]}>B</Text>
          </View>
        )}
      </Pressable>
      {multiplicity && multiplicity > 1 ? (
        <View style={styles.multiplicityWrap} pointerEvents="none">
          <Animated.View style={[styles.multiplicityBadge, { backgroundColor: colors.neonGold, borderColor: '#0d001a' }, multiBadgeStyle]}>
            <Text style={styles.multiplicityText}>x{multiplicity}</Text>
          </Animated.View>
        </View>
      ) : null}
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
    top: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
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
