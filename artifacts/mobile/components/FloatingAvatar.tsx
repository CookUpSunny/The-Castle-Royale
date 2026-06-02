import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import AvatarPlayPulse from '@/components/AvatarPlayPulse';

/**
 * Stand-alone "floating troll" avatar block.
 *
 *           💎          ← per-troll identity gem (badge), peeks above the plate
 *      ┌──◢───◣──┐
 *      │  DANA  │      ← banner-style name plate, holds the player's CUSTOM
 *      └──◥───◤──┘       display name (gold border + inner glow when isActive)
 *        ╭────╮
 *        │ 🧌 │         ← character art (transparent BG, floats free)
 *        ╰────╯
 *      ┌────────┐
 *      │ Lv. 34 │       ← level + XP progress bar
 *      │ ▓▓▓░░  │
 *      └────────┘
 *
 * Replaces the old PlayerInfoCard / NamePlate "card-with-tiny-icon" chrome.
 * Purely presentational — wallet/menu popovers are owned by the parent so
 * the caller can anchor them however it wants on tap.
 */
export interface FloatingAvatarProps {
  /** Player's custom display name (rendered inside the banner-style plate). */
  name: string;
  /** Numeric level shown under the avatar (e.g. 34 -> "Lv. 34"). */
  level: number;
  /** XP progress within the current level, normalized 0..1. */
  xpProgress?: number;
  isActive: boolean;
  /** Used for the menu-dots badge anchor + future popover positioning. */
  align: 'left' | 'right';
  portrait?: ImageSourcePropType | null;
  /**
   * Per-troll signature gem badge (the identity icon for the equipped
   * avatar — green star for Maverick, red ruby for Ronin, etc.). Sits
   * above the name plate and survives a custom display name unchanged.
   */
  gem?: ImageSourcePropType | null;
  /** Increment to fire a one-shot scale-pulse on the avatar art. */
  portraitPulse?: number;
  /** Increment to fire a celebratory vertical bounce (e.g. on deck burn). */
  burnPulse?: number;
  /**
   * Increment to fire the larger "castle reached" celebration on the
   * avatar — taller bounces + gold halo that radiates around the
   * portrait. Used when the player drains a castle layer.
   */
  castlePulse?: number;
  /**
   * Vertical pixel size of the character art. Drives the rest of the layout
   * proportionally so the same component fits both the portrait header
   * (compact) and the landscape side column (taller).
   */
  avatarHeight?: number;
  onPress?: () => void;
  /** Show the small ⋯ affordance over the name plate (typically self only). */
  showMenuDots?: boolean;
}

export default function FloatingAvatar({
  name,
  level,
  xpProgress = 0.4,
  isActive,
  align,
  portrait,
  gem,
  portraitPulse,
  burnPulse,
  castlePulse,
  avatarHeight = 120,
  onPress,
  showMenuDots,
}: FloatingAvatarProps) {
  const colors = useColors();
  const initial = name.charAt(0).toUpperCase();

  // Aspect ratio matches the cropped character PNGs (~410 wide / 665 tall).
  const avatarWidth = Math.round(avatarHeight * (410 / 665));
  // Name plate / level bar widen slightly past the art so text never clips.
  // The min was bumped to 116 (was 92) so common 8–12 char custom display
  // names render at full size before auto-shrinking has to kick in.
  const plateWidth = Math.max(avatarWidth + 18, 116);
  // Gem scales with the plate so it stays in proportion across sizes.
  const gemSize = Math.round(plateWidth * 0.32);

  // XP bar visuals: clamp to 0..1.
  const xp = Math.max(0, Math.min(1, xpProgress));

  const Wrapper: React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }> = onPress
    ? (Pressable as React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }>)
    : View;

  return (
    <Wrapper onPress={onPress} style={styles.root}>
      {/* GEM BADGE — the troll's identity icon, peeks above the plate so
          the gem still reads as "whose troll is this" even after the
          display name is customised by the player. */}
      {gem ? (
        <View style={[styles.gemSlot, { width: gemSize, height: gemSize, marginBottom: -gemSize * 0.35 }]} pointerEvents="none">
          <Image source={gem} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        </View>
      ) : null}

      {/* NAME PLATE — banner-style frame holding the CUSTOM display name. */}
      <View
        style={[
          styles.namePlate,
          {
            width: plateWidth,
            borderColor: isActive ? colors.neonGold : '#7a3f12',
            shadowColor: isActive ? colors.neonGold : 'transparent',
            shadowOpacity: isActive ? 0.85 : 0,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            elevation: isActive ? 8 : 0,
          },
        ]}
      >
        <LinearGradient
          colors={isActive ? ['#3a1a05f0', '#1a0535f5', '#3a1a05f0'] : ['#1a0535f0', '#0d001ad9', '#1a0535f0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Tiny ✦ accents flank the name, mimicking the v2 banner art. */}
        <Text style={[styles.bannerStar, { color: isActive ? colors.neonGold : '#a06a3f' }]}>✦</Text>
        <Text
          style={[
            styles.nameText,
            { color: isActive ? colors.neonGold : '#f1e4ff' },
          ]}
          numberOfLines={1}
          // Long custom names (e.g. up to the 16-char input limit) auto-shrink
          // down to a readable floor instead of getting truncated by `…`. The
          // 0.6 scale lets a 16-char name like "DANATHEDESTROYER" still fit on
          // a single line on the narrowest avatar plate.
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          allowFontScaling={false}
        >
          {name}
        </Text>
        <Text style={[styles.bannerStar, { color: isActive ? colors.neonGold : '#a06a3f' }]}>✦</Text>
        {showMenuDots ? (
          <View
            style={[
              styles.menuDotsBadge,
              align === 'left' ? { right: 4 } : { left: 4 },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.menuDotsText}>⋯</Text>
          </View>
        ) : null}
      </View>

      {/* CHARACTER ART — floats free with transparent BG. Scale-pulse on
          card play, vertical bounce on deck burn, taller bounce + glow
          on castle-layer milestone. */}
      <AvatarPlayPulse
        trigger={portraitPulse ?? 0}
        bounceTrigger={burnPulse ?? 0}
        castleTrigger={castlePulse ?? 0}
        glowColor={colors.neonGold}
        style={{ marginTop: 2 }}
      >
        <View style={{ width: avatarWidth, height: avatarHeight, alignItems: 'center', justifyContent: 'center' }}>
          {portrait ? (
            <Image
              source={portrait}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          ) : (
            <Text
              style={[
                styles.fallbackInitial,
                { color: isActive ? colors.neonGold : colors.neonPurple, fontSize: avatarHeight * 0.45 },
              ]}
            >
              {initial}
            </Text>
          )}
        </View>
      </AvatarPlayPulse>

      {/* LEVEL + XP BAR — sits at the avatar's "feet". */}
      <View
        style={[
          styles.levelBlock,
          {
            width: plateWidth,
            borderColor: isActive ? colors.neonGold : '#3a1a5e',
            backgroundColor: '#0d001ad9',
          },
        ]}
      >
        <Text
          style={[
            styles.levelText,
            { color: isActive ? colors.neonGold : '#e0c8ff' },
          ]}
        >
          Lv. {level}
        </Text>
        <View style={styles.xpTrack}>
          <LinearGradient
            colors={['#ffb347', '#ff7a00']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.xpFill, { width: `${xp * 100}%` }]}
          />
        </View>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 0,
  },
  gemSlot: {
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  namePlate: {
    position: 'relative',
    // Trimmed horizontal padding + tighter star gap so longer custom names
    // get more usable real estate before the auto-shrink kicks in.
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 24,
    overflow: 'hidden',
  },
  nameText: {
    fontSize: 12,
    fontWeight: '900',
    // Slightly tighter tracking so the uppercase name reads as a tight banner
    // rather than spilling out — the previous 1.2 was eating ~10–15% of the
    // plate width on long names before any clipping happened.
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    flexShrink: 1,
  },
  bannerStar: {
    fontSize: 9,
    fontWeight: '900',
    opacity: 0.85,
  },
  menuDotsBadge: {
    position: 'absolute',
    top: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3a1a5e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDotsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e0c8ff',
    lineHeight: 14,
    marginTop: -3,
  },
  fallbackInitial: {
    fontWeight: '900',
  },
  levelBlock: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  xpTrack: {
    width: '92%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a0d4a',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
  },
});
