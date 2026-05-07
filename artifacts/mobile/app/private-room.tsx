import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import { PortalSpinner } from '@/components/PortalSpinner';
import BackButton from '@/components/BackButton';

type Mode = 'menu' | 'host' | 'join';

/** Cycles a caption through a list of phrases for the portal loading state. */
function CyclingCaption({ phrases, color }: { phrases: string[]; color: string }) {
  const [idx, setIdx] = useState(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    const t = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 350, easing: Easing.in(Easing.quad) }),
      );
      setTimeout(() => setIdx((i) => (i + 1) % phrases.length), 360);
    }, 1900);
    return () => clearInterval(t);
  }, [phrases.length]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[style, { fontSize: 12, fontWeight: '700', letterSpacing: 3, color, textAlign: 'center' }]}>
      {phrases[idx]}
    </Animated.Text>
  );
}

export default function PrivateRoomScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    createRoom,
    joinRoom,
    cancelRoom,
    hostedRoomCode,
    roomError,
    clearRoomError,
    gameView,
    connectionStatus,
  } = useGame();

  const [mode, setMode] = useState<Mode>('menu');
  const [codeInput, setCodeInput] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  /** True between submitting a join code and the server replying with game_start or room_error. */
  const [isJoining, setIsJoining] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Once a game starts, jump to the game screen.
  useEffect(() => {
    if (gameView) router.replace('/game');
  }, [gameView]);

  // Clear any stale error on mode change.
  useEffect(() => {
    clearRoomError();
  }, [mode, clearRoomError]);

  // Server replied with an error — drop out of the joining portal back to the input.
  useEffect(() => {
    if (roomError) setIsJoining(false);
  }, [roomError]);

  // If the host backs out (cancelRoom), fall back to menu so they don't see a stale code.
  useEffect(() => {
    if (mode === 'host' && !hostedRoomCode) {
      // small grace window — createRoom is async
      const t = setTimeout(() => {
        if (!hostedRoomCode) setMode('menu');
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [mode, hostedRoomCode]);

  const goCreate = () => {
    setMode('host');
    createRoom();
  };

  const goJoin = () => {
    setCodeInput('');
    setMode('join');
  };

  const goBackToMenu = () => {
    if (mode === 'host' && hostedRoomCode) cancelRoom();
    setMode('menu');
  };

  const showCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyFeedback(null), 1800);
  };

  const handleShare = async () => {
    if (!hostedRoomCode) return;
    const message = `Join my Castle Royale match! Room code: ${hostedRoomCode}`;
    try {
      if (Platform.OS === 'web') {
        // Try native share first (mobile browsers), then clipboard.
        const navAny = (typeof navigator !== 'undefined' ? navigator : null) as (Navigator & { share?: (d: { text: string }) => Promise<void> }) | null;
        if (navAny?.share) {
          await navAny.share({ text: message });
          return;
        }
        if (navAny?.clipboard?.writeText) {
          await navAny.clipboard.writeText(hostedRoomCode);
          showCopyFeedback('Code copied!');
          return;
        }
        showCopyFeedback('Sharing not available — write the code down.');
      } else {
        await Share.share({ message });
      }
    } catch {
      // user cancelled or share failed — silent
    }
  };

  const handleSubmitCode = () => {
    const cleaned = codeInput.toUpperCase().trim();
    if (cleaned.length === 0) return;
    setIsJoining(true);
    joinRoom(cleaned);
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#200040', '#0a0018', '#07000f']} style={StyleSheet.absoluteFill} />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 28, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.headerRow}>
          <BackButton label="← HOME" onPress={() => { goBackToMenu(); router.replace('/'); }} />
          <View style={{ flex: 1 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>PRIVATE</Text>
        <Text style={[styles.titleSub, { color: colors.neonGold }]}>ROOM</Text>

        {mode === 'menu' && (
          <View style={styles.menuBlock}>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Play with a friend using a 6-character invite code.
            </Text>

            <Pressable
              onPress={goCreate}
              disabled={connectionStatus !== 'connected'}
              style={({ pressed }) => [styles.bigBtnOuter, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} style={styles.bigBtn}>
                <Text style={styles.bigBtnText}>CREATE ROOM</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={goJoin}
              disabled={connectionStatus !== 'connected'}
              style={({ pressed }) => [styles.bigBtnOuter, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={['#7e22ce', '#5b21b6', '#3b1d6e']} style={styles.bigBtn}>
                <Text style={[styles.bigBtnText, { color: '#fff' }]}>JOIN ROOM</Text>
              </LinearGradient>
            </Pressable>

            {connectionStatus !== 'connected' && (
              <Text style={[styles.statusText, { color: '#ef4444' }]}>Reconnecting...</Text>
            )}
          </View>
        )}

        {mode === 'host' && (
          <View style={styles.hostBlock}>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Share this code with your friend
            </Text>

            <View style={styles.codeFrame}>
              <LinearGradient
                colors={['rgba(168,85,247,0.18)', 'rgba(251,191,36,0.10)']}
                style={StyleSheet.absoluteFill}
              />
              {hostedRoomCode ? (
                <Text style={[styles.codeText, { color: colors.neonGold }]} selectable>
                  {hostedRoomCode}
                </Text>
              ) : (
                <Text style={[styles.codeText, { color: colors.mutedForeground }]}>------</Text>
              )}
            </View>

            <Pressable
              onPress={handleShare}
              disabled={!hostedRoomCode}
              style={({ pressed }) => [styles.shareBtn, { borderColor: colors.neonGold }, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.shareBtnText, { color: colors.neonGold }]}>
                {Platform.OS === 'web' ? '⧉  COPY / SHARE' : '↗  SHARE CODE'}
              </Text>
            </Pressable>
            {copyFeedback && (
              <Text style={[styles.copyFeedback, { color: colors.electric }]}>{copyFeedback}</Text>
            )}

            <View style={styles.portalRow}>
              <PortalSpinner size={200} />
              <CyclingCaption
                color={colors.neonGold}
                phrases={['OPENING PORTAL...', 'ALIGNING REALMS...', 'SUMMONING CHALLENGER...', 'WAITING FOR OPPONENT...']}
              />
            </View>

            <Pressable
              onPress={() => { cancelRoom(); setMode('menu'); }}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>CANCEL ROOM</Text>
            </Pressable>
          </View>
        )}

        {mode === 'join' && isJoining && (
          <View style={styles.portalRow}>
            <PortalSpinner size={220} />
            <CyclingCaption
              color={colors.neonGold}
              phrases={['STEPPING THROUGH PORTAL...', 'LINKING DECKS...', 'ENTERING THE ARENA...']}
            />
            <Pressable
              onPress={() => setIsJoining(false)}
              style={[styles.cancelBtn, { borderColor: colors.border, marginTop: 24 }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>CANCEL</Text>
            </Pressable>
          </View>
        )}

        {mode === 'join' && !isJoining && (
          <View style={styles.joinBlock}>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Enter the code your friend sent you
            </Text>

            <TextInput
              value={codeInput}
              onChangeText={(t) => { setCodeInput(t.toUpperCase()); if (roomError) clearRoomError(); }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              placeholder="ABCDEF"
              placeholderTextColor="#5a4a7a"
              style={[styles.codeInput, { color: colors.neonGold, borderColor: colors.neonPurple, backgroundColor: 'rgba(20,5,40,0.6)' }]}
              onSubmitEditing={handleSubmitCode}
              returnKeyType="go"
            />

            {roomError && (
              <Text style={[styles.errorText, { color: '#ef4444' }]}>{roomError}</Text>
            )}

            <Pressable
              onPress={handleSubmitCode}
              disabled={codeInput.trim().length === 0 || connectionStatus !== 'connected'}
              style={({ pressed }) => [
                styles.bigBtnOuter,
                (codeInput.trim().length === 0 || connectionStatus !== 'connected') && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} style={styles.bigBtn}>
                <Text style={styles.bigBtnText}>JOIN GAME</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setMode('menu')}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>BACK</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: 8, marginTop: 8 },
  titleSub: { fontSize: 18, fontWeight: '700', letterSpacing: 6, marginTop: -4, marginBottom: 24 },
  subtitle: { fontSize: 13, letterSpacing: 1.5, textAlign: 'center', marginBottom: 24 },

  menuBlock: { width: '100%', alignItems: 'center', gap: 16, marginTop: 12 },

  hostBlock: { width: '100%', alignItems: 'center', gap: 18 },
  codeFrame: {
    width: '100%',
    height: 110,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  codeText: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 14,
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  shareBtn: { paddingHorizontal: 26, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  shareBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  copyFeedback: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: -8 },
  portalRow: { alignItems: 'center', gap: 18, marginTop: 8 },

  joinBlock: { width: '100%', alignItems: 'center', gap: 16, marginTop: 12 },
  codeInput: {
    width: '100%',
    height: 84,
    borderRadius: 14,
    borderWidth: 2,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorText: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: -6 },

  bigBtnOuter: { width: '100%', borderRadius: 14, overflow: 'hidden', shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 12 },
  bigBtn: { height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  bigBtnText: { color: '#07000f', fontSize: 18, fontWeight: '900', letterSpacing: 4 },

  cancelBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  cancelText: { fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  statusText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 8 },
});
