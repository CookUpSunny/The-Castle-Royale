import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { jackpotArenaHtml } from '@/components/jackpotArenaHtml';
import { jackpotArenaLandscapeHtml } from '@/components/jackpotArenaLandscapeHtml';
import {
  JACKPOT_BURST_SCRIPT,
  JACKPOT_FELT,
  JACKPOT_LIVE_FADE_MS,
  JACKPOT_LIVE_FAIL_MS,
  JACKPOT_ORIGIN_WHITELIST,
  isJackpotLiveMessage,
  jackpotBackdrop,
  jackpotLoadAllowed,
  jackpotPage,
  shouldMountJackpotWebView,
  withJackpotLiveSignal,
} from '@/lib/jackpotArena';

const STILL = require('../assets/arenas/jackpot-still.jpg');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Live Jackpot felt. The HTML and its tuned values are the owner's file.
 * The still is the Reduce Motion and failure fallback only. While the page
 * starts, the felt color holds, and the page fades in after it has drawn.
 */
export function JackpotFelt({ burstToken = 0 }: { burstToken?: number }) {
  const webRef = useRef<WebView>(null);
  const seenBurst = useRef(0);
  const liveRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [live, setLive] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduceMotion(value);
    }).catch(() => {
      if (alive) setReduceMotion(false);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => sub.remove();
  }, []);

  const { width, height } = useWindowDimensions();
  const page = jackpotPage(width, height);
  const html = useMemo(
    () => withJackpotLiveSignal(page === 'landscape' ? jackpotArenaLandscapeHtml : jackpotArenaHtml),
    [page],
  );

  useEffect(() => {
    liveRef.current = false;
    setFailed(false);
    setLive(false);
  }, [page]);

  const backdrop = jackpotBackdrop({ reduceMotion, failed });
  const mount = shouldMountJackpotWebView({
    arenaActive: true,
    appActive,
    reduceMotion: reduceMotion !== false,
    failed,
  });

  useEffect(() => {
    opacity.set(withTiming(live ? 1 : 0, {
      duration: live ? JACKPOT_LIVE_FADE_MS : 0,
      easing: EASE_OUT,
      reduceMotion: ReduceMotion.Never,
    }));
  }, [live, opacity]);

  useEffect(() => {
    if (!mount || live) return;
    const timer = setTimeout(() => {
      if (!liveRef.current) setFailed(true);
    }, JACKPOT_LIVE_FAIL_MS);
    return () => clearTimeout(timer);
  }, [live, mount, page]);

  const liveStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const fire = () => {
    webRef.current?.injectJavaScript(JACKPOT_BURST_SCRIPT);
  };

  useEffect(() => {
    if (burstToken > seenBurst.current) {
      seenBurst.current = burstToken;
      fire();
    }
  }, [burstToken]);

  const markLive = (event: WebViewMessageEvent) => {
    if (!isJackpotLiveMessage(event.nativeEvent.data) || liveRef.current) return;
    liveRef.current = true;
    setLive(true);
  };

  return (
    <View style={styles.felt} pointerEvents="none">
      {backdrop === 'still' ? (
        <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : null}
      {mount ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, liveStyle]}>
          <WebView
            key={page}
            ref={webRef}
            source={{ html, baseUrl: 'about:blank' }}
            style={styles.web}
            pointerEvents="none"
            originWhitelist={[...JACKPOT_ORIGIN_WHITELIST]}
            onShouldStartLoadWithRequest={(request: WebViewNavigation) => jackpotLoadAllowed(request.url)}
            onError={() => setFailed(true)}
            onHttpError={() => setFailed(true)}
            onMessage={markLive}
            onLoadEnd={() => {
              if (seenBurst.current > 0) fire();
            }}
            javaScriptEnabled
            domStorageEnabled={false}
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            setSupportMultipleWindows={false}
            allowsLinkPreview={false}
            androidLayerType="hardware"
            setBuiltInZoomControls={false}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  felt: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: JACKPOT_FELT,
  },
  web: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
