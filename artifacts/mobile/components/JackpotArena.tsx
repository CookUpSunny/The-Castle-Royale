import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { jackpotArenaHtml } from '@/components/jackpotArenaHtml';
import { jackpotArenaLandscapeHtml } from '@/components/jackpotArenaLandscapeHtml';
import {
  JACKPOT_BURST_SCRIPT,
  JACKPOT_FELT,
  JACKPOT_ORIGIN_WHITELIST,
  jackpotLoadAllowed,
  jackpotPage,
  shouldMountJackpotWebView,
} from '@/lib/jackpotArena';

const STILL = require('../assets/arenas/jackpot-still.jpg');

/**
 * Live Jackpot felt. The HTML and its tuned values are the owner's file.
 * The still sits underneath so a slow or failed WebView never flashes black.
 */
export function JackpotFelt({ burstToken = 0 }: { burstToken?: number }) {
  const webRef = useRef<WebView>(null);
  const seenBurst = useRef(0);
  const [failed, setFailed] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduceMotion(value);
    }).catch(() => {
      if (live) setReduceMotion(false);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      live = false;
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
  const html = page === 'landscape' ? jackpotArenaLandscapeHtml : jackpotArenaHtml;

  useEffect(() => {
    setFailed(false);
  }, [page]);

  const mount = shouldMountJackpotWebView({
    arenaActive: true,
    appActive,
    reduceMotion: reduceMotion !== false,
    failed,
  });

  const fire = () => {
    webRef.current?.injectJavaScript(JACKPOT_BURST_SCRIPT);
  };

  useEffect(() => {
    if (burstToken > seenBurst.current) {
      seenBurst.current = burstToken;
      fire();
    }
  }, [burstToken]);

  return (
    <View style={styles.felt} pointerEvents="none">
      <Image source={STILL} style={StyleSheet.absoluteFill} contentFit="cover" />
      {mount ? (
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
