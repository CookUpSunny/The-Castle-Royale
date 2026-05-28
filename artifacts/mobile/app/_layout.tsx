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
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import SplashIntro from '@/components/SplashIntro';
import { CosmeticsProvider } from '@/contexts/CosmeticsContext';
import { GameProvider } from '@/contexts/GameContext';
import { GameCenterProvider, useGameCenter } from '@/contexts/GameCenterContext';
import { MusicProvider } from '@/contexts/MusicContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function GameProviderBridge({ children }: { children: React.ReactNode }) {
  const { profile } = useGameCenter();
  return (
    <GameProvider gameCenterId={profile?.gameCenterId ?? null}>
      {children}
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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [showIntro, setShowIntro] = useState(true);

  // Hide native splash immediately — our dark-grey JS intro takes over from here.
  // Do NOT wait for font loading; the intro overlay covers the screen during that time.
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  const appReady = fontsLoaded || fontError;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <MusicProvider>
                <CosmeticsProvider>
                  <GameCenterProvider>
                    <GameProviderBridge>
                      {/* Render navigator only once fonts are ready; intro overlay covers during load */}
                      {appReady && <RootLayoutNav />}
                      {showIntro && (
                        <SplashIntro onDone={() => setShowIntro(false)} />
                      )}
                    </GameProviderBridge>
                  </GameCenterProvider>
                </CosmeticsProvider>
              </MusicProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
