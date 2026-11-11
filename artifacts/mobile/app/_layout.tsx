import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AdBreakHost from '@/components/AdBreakHost';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import RevenueCatIdentity from '@/components/RevenueCatIdentity';
import { CosmeticsProvider } from '@/contexts/CosmeticsContext';
import { GameProvider } from '@/contexts/GameContext';
import { GameCenterProvider, useGameCenter } from '@/contexts/GameCenterContext';
import { MusicProvider, useMusicPlayer } from '@/contexts/MusicContext';
import { initializeAds } from '@/lib/mobileAds';
import { initializeRevenueCat, SubscriptionProvider } from '@/lib/revenuecat';
import {
  FONT_GATE_TIMEOUT_MS,
} from '@/lib/splashPhase';
import {
  installStartupErrorHandler,
  shouldShowStartupErrors,
  StartupErrorScreen,
  useStartupError,
} from '@/lib/startupError';

installStartupErrorHandler();

void SplashScreen.preventAutoHideAsync().catch(() => {});

try {
  initializeRevenueCat();
} catch (err) {
  console.warn('RevenueCat unavailable:', err instanceof Error ? err.message : err);
}

void initializeAds();

const queryClient = new QueryClient();

function GameProviderBridge({ children }: { children: React.ReactNode }) {
  const { profile } = useGameCenter();
  // GameProvider stays mounted above the navigator and is not keyed on window
  // size, so a Duo fold or resize keeps the match in context.
  return (
    <GameProvider gameCenterId={profile?.gameCenterId ?? null}>
      <View style={{ flex: 1 }}>
        <RevenueCatIdentity gameCenterId={profile?.gameCenterId ?? null} />
        {children}
        <AdBreakHost />
      </View>
    </GameProvider>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: '#07000f' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="mode-select" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="how-to-play" options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="arena-picker" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="matchmaking" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="private-room" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="game-loading" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="game" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="victory" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="store" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="legal" options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="board-preview" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}

/** One Apple Music dialog after the intro is gone and home is on screen. */
function AppleMusicHomePrompt({ splashDone }: { splashDone: boolean }) {
  const { promptAppleMusicOnce } = useMusicPlayer();
  const started = useRef(false);

  useEffect(() => {
    if (!splashDone || started.current) return;
    started.current = true;
    const timer = setTimeout(() => {
      try {
        promptAppleMusicOnce();
      } catch {
        // The prompt function is responsible for its own failures.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [splashDone, promptAppleMusicOnce]);

  return null;
}

function RootLayoutBody() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [fontWaitExpired, setFontWaitExpired] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFontWaitExpired(true), FONT_GATE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const appReady = Boolean(fontsLoaded || fontError || fontWaitExpired);

  useEffect(() => {
    if (!appReady) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [appReady]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#07000f' }}>
          <KeyboardProvider>
            <MusicProvider>
              <AppleMusicHomePrompt splashDone={appReady} />
              <SubscriptionProvider>
                <CosmeticsProvider>
                  <GameCenterProvider>
                    <GameProviderBridge>
                      {/* Fonts normally load under the intro. A hung font load must not hide the home screen. */}
                      {appReady && <RootLayoutNav />}
                    </GameProviderBridge>
                  </GameCenterProvider>
                </CosmeticsProvider>
              </SubscriptionProvider>
            </MusicProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const startupError = useStartupError();
  if (startupError && shouldShowStartupErrors()) {
    return <StartupErrorScreen error={startupError} />;
  }

  return (
    <ErrorBoundary FallbackComponent={StartupErrorScreen}>
      <RootLayoutBody />
    </ErrorBoundary>
  );
}
