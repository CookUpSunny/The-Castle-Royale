import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import CardMosaic from '@/components/CardMosaic';
import { RULEBOOK_HTML } from '@/lib/rulebookHtml';

type Phase = 'mosaic' | 'dissolve' | 'rulebook';

export default function HowToPlayScreen() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('mosaic');
  const dissolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webOpacity = useSharedValue(0);

  const handleAssembled = useCallback(() => {
    setPhase('dissolve');
    webOpacity.value = withTiming(1, { duration: 520 });
    dissolveTimer.current = setTimeout(() => {
      setPhase('rulebook');
    }, 620);
  }, []);

  const webStyle = useAnimatedStyle(() => ({
    opacity: webOpacity.value,
  }));

  return (
    <View style={styles.root}>
      <View style={styles.webContainer}>
        <Animated.View style={[StyleSheet.absoluteFill, webStyle]}>
          <WebView
            source={{ html: RULEBOOK_HTML }}
            style={styles.webView}
            javaScriptEnabled
            originWhitelist={['*']}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          />
        </Animated.View>
      </View>

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
  webContainer: {
    flex: 1,
  },
  webView: {
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
