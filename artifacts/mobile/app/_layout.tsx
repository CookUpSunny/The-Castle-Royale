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
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CosmeticsProvider } from '@/contexts/CosmeticsContext';
import { GameProvider } from '@/contexts/GameContext';
import { GameCenterProvider, useGameCenter } from '@/contexts/GameCenterContext';
import { MusicProvider } from '@/contexts/MusicContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Bridge: reads the authenticated Game Center ID (if any) and passes it into
 * GameProvider so the socket layer can include it in join/queue events.
 */
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
      <Stack.Screen name="arena-picker" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="matchmaking" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
      <Stack.Screen name="private-room" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
                      <RootLayoutNav />
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
