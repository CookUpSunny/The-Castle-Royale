import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface ActionButtonsProps {
  canPickup: boolean;
  hasBurn: boolean;
  hasReset: boolean;
  canFastPlay: boolean;
  isMyTurn: boolean;
  onPickup: () => void;
  onPlayBurn: () => void;
  onPlayReset: () => void;
  onFastPlay?: () => void;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  accentColor: string;
  onPress: () => void;
  enabled: boolean;
  /** Override icon glyph size (plain arrows read better slightly larger than emoji). */
  iconFontSize?: number;
  /** Stronger chrome + padding so the icon/label don't kiss the pill edge. */
  paddedFrame?: boolean;
  /** Tighter tracking for longer labels (e.g. TAKE PILE) so glyphs stay inside the border. */
  labelLetterSpacing?: number;
  /** Shrink label slightly if needed so it never clips the pill (iOS/Android). */
  labelAdjustsSize?: boolean;
}

const ACTION_ICON_FONT = 13;
const DEFAULT_LABEL_TRACKING = 0.8;

function ActionButton({
  icon,
  label,
  accentColor,
  onPress,
  enabled,
  iconFontSize,
  paddedFrame,
  labelLetterSpacing,
  labelAdjustsSize,
}: ActionButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: enabled ? 1 : 0.3,
  }));

  const handlePress = () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    scale.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withTiming(1.05, { duration: 120 }),
      withTiming(1, { duration: 80 }),
    );
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={handlePress} disabled={!enabled}>
        <View
          style={[
            styles.buttonShell,
            paddedFrame ? styles.buttonShellPadded : null,
            {
              borderColor: enabled ? accentColor : '#2a163e',
              shadowColor: enabled ? accentColor : 'transparent',
            },
          ]}
        >
          <Text
            style={[styles.icon, { fontSize: iconFontSize ?? ACTION_ICON_FONT, color: enabled ? accentColor : '#7a6a90' }]}
            allowFontScaling={false}
          >
            {icon}
          </Text>
          <Text
            style={[
              styles.label,
              labelAdjustsSize ? { flexShrink: 1, minWidth: 0 } : null,
              {
                color: enabled ? '#ffffff' : '#7a6a90',
                letterSpacing: labelLetterSpacing ?? DEFAULT_LABEL_TRACKING,
              },
            ]}
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit={!!labelAdjustsSize}
            minimumFontScale={labelAdjustsSize ? 0.82 : 1}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ActionButtons({
  canPickup,
  hasBurn,
  hasReset,
  canFastPlay,
  isMyTurn,
  onPickup,
  onPlayBurn,
  onPlayReset,
  onFastPlay,
}: ActionButtonsProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <ActionButton
        icon="🔥"
        label="BURN"
        accentColor="#ff7f00"
        onPress={onPlayBurn}
        enabled={isMyTurn && hasBurn}
      />
      <ActionButton
        icon="2"
        label="RESET"
        accentColor={colors.neonPurple}
        onPress={onPlayReset}
        enabled={isMyTurn && hasReset}
      />
      {/* FAST PLAY is an EXTRA option on top of TAKE PILE — never a replacement.
          Previously these two shared a slot, which meant the pickup button
          disappeared whenever the player happened to hold a matching value
          for the top card, leaving them frozen if they didn't want to fast-play. */}
      {canFastPlay && isMyTurn && onFastPlay ? (
        <ActionButton
          icon="⚡"
          label="FAST PLAY"
          accentColor="#fde047"
          onPress={onFastPlay}
          enabled={true}
          paddedFrame
          labelLetterSpacing={0.35}
          labelAdjustsSize
        />
      ) : null}
      <ActionButton
        icon="↓"
        iconFontSize={15}
        label="TAKE PILE"
        accentColor="#ef4444"
        onPress={onPickup}
        enabled={isMyTurn && canPickup}
        paddedFrame
        labelLetterSpacing={0.35}
        labelAdjustsSize
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  buttonShell: {
    minWidth: 64,
    alignSelf: 'flex-start',
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#0d0020cc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  /** Used for TAKE PILE / FAST PLAY — thicker border + more inset; wide enough for longest label. */
  buttonShellPadded: {
    minWidth: 90,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderRadius: 9,
    gap: 5,
  },
  icon: {
    fontSize: ACTION_ICON_FONT,
    fontWeight: '900',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: DEFAULT_LABEL_TRACKING,
    includeFontPadding: false,
  },
});
