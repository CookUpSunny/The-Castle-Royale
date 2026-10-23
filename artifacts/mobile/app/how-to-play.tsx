import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CardMosaic from '@/components/CardMosaic';
import RulebookContent from '@/components/RulebookContent';
import { useDuoWindow } from '@/hooks/useDuoWindow';
import { topContentInset } from '@/lib/duoLayout';

type Phase = 'mosaic' | 'dissolve' | 'rulebook';

export default function HowToPlayScreen() {
  const insets = useSafeAreaInsets();
  const duo = useDuoWindow();
  const book = duo.mode === 'wide';
  const [phase, setPhase] = useState<Phase>('mosaic');
  const dissolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentOpacity = useSharedValue(0);

  const handleAssembled = useCallback(() => {
    setPhase('dissolve');
    contentOpacity.value = withTiming(1, { duration: 520 });
    dissolveTimer.current = setTimeout(() => {
      setPhase('rulebook');
    }, 620);
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, contentStyle, book && { width: duo.creaseStart, right: undefined }]}>
        <RulebookContent bottomInset={insets.bottom} topInset={topContentInset(insets.top, Platform.OS)} />
      </Animated.View>
      {book ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: duo.creaseEnd, right: 0, justifyContent: 'center', paddingHorizontal: 28 }}>
          <Text style={{ color: '#f0d78c', fontSize: 28, fontWeight: '800' }}>The Rules</Text>
          <Text style={{ color: '#d5c8ea', fontSize: 16, lineHeight: 22, marginTop: 8 }}>
            Every player uses the same cards. Memberships do not change a match.
          </Text>
        </View>
      ) : null}

      {phase !== 'rulebook' && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <CardMosaic
            onAssembled={handleAssembled}
            dissolving={phase === 'dissolve'}
          />
        </View>
      )}

      {phase === 'rulebook' && (
        <View
          style={[styles.backBar, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <Text style={styles.backText}>← BACK</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f0f13',
  },
  backBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15,15,19,0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  backText: {
    color: '#f5e642',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
