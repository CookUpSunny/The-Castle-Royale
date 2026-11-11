import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

interface SplashIntroProps {
  onDone: () => void;
}

export default function SplashIntro({ onDone }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();

  const imageOpacity = useRef(new Animated.Value(0)).current;
  const blackOpacity = useRef(new Animated.Value(0)).current;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const settledRef = useRef(false);

  const finish = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDoneRef.current();
  }, []);

  const playOut = useCallback(() => {
    if (settledRef.current) return;
    Animated.timing(blackOpacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => finish());
    // Native completion callbacks can be dropped on device. Don't wait on them.
    const backup = setTimeout(finish, 900);
    return () => clearTimeout(backup);
  }, [blackOpacity, finish]);

  useEffect(() => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    let clearBackup = () => {};
    const exitTimer = setTimeout(() => {
      clearBackup = playOut() ?? (() => {});
    }, 4000);

    return () => {
      clearTimeout(exitTimer);
      clearBackup();
    };
  }, [playOut, imageOpacity]);

  const imageWidth = Math.round((941 / 1672) * height);

  return (
    <Pressable
      onPress={finish}
      style={[styles.container, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
    >
      <View style={[StyleSheet.absoluteFill, styles.darkBg]} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}>
        <Image
          source={require('../assets/splash/splash_hero.png')}
          style={{
            position: 'absolute',
            left: (width - imageWidth) / 2 - 24,
            top: 0,
            width: imageWidth,
            height,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, { opacity: blackOpacity }]}
        pointerEvents="none"
      />

      <View style={styles.loadingRow} pointerEvents="none">
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  darkBg: {
    backgroundColor: '#1a1a1a',
  },
  blackOverlay: {
    backgroundColor: '#000000',
  },
  loadingRow: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '500',
  },
});
