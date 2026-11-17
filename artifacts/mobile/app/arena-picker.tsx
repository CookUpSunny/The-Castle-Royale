import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from '@/components/PressableScale';
import { ARENAS, AVATARS, CARD_SKINS, useCosmetics } from '@/contexts/CosmeticsContext';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import { prematchIllustratedSkins } from '@/lib/cardSkins';
import { GRANDSCAPE_MIRROR_PACK } from '@/lib/grandscapeMirrorPack';
import { grandscapeCardBackSource, grandscapeMarketingSource } from '@/lib/grandscapeMirrorImages';
import { useGrandscapePack } from '@/lib/useGrandscapePack';
import {
  confirmLoadout,
  shownLoadout,
  type ConfirmedLoadout,
} from '@/lib/loadoutSelection';
import { useSubscription } from '@/lib/revenuecat';
import ArenaBackground from '@/components/ArenaBackground';
import BackButton from '@/components/BackButton';
import { CardBack } from '@/components/Card';
import PaywallModal from '@/components/PaywallModal';
import { useDuoWindow } from '@/hooks/useDuoWindow';


const OUTLINE_OFFSETS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

type OutlinedTextProps = React.ComponentProps<typeof Text> & {
  outlineColor?: string;
  outlineWidth?: number;
};

function GrandscapePackTile({
  width,
  artWidth,
  artHeight,
  highlighted,
  priceLabel,
  status,
  onPress,
}: {
  width: number;
  artWidth: number;
  artHeight: number;
  highlighted: boolean;
  priceLabel: string;
  status: 'equipped' | 'owned' | 'available' | 'unavailable' | 'checking';
  onPress: () => void;
}) {
  const back = grandscapeCardBackSource();
  const marketing = grandscapeMarketingSource();
  const art = back ?? marketing;
  const caption = highlighted
    ? '✓  SELECTED'
    : status === 'checking'
      ? 'CHECKING…'
      : status === 'available'
        ? 'TAP TO BUY'
        : status === 'unavailable'
          ? 'UNAVAILABLE'
          : 'TAP TO EQUIP';
  return (
    <PressableScale
      testID="grandscape-mirror-pack-tile"
      onPress={onPress}
      style={[
        styles.cardBackTile,
        {
          width,
          borderColor: highlighted ? '#ffd700' : 'rgba(255,255,255,0.10)',
          borderWidth: highlighted ? 2.5 : 1,
          opacity: status === 'unavailable' || status === 'checking' ? 0.72 : 1,
        },
      ]}
    >
      <View style={[styles.packArtFrame, { width: artWidth, height: artHeight, borderRadius: Math.max(6, artWidth * 0.08) }]}>
        {art ? (
          <Image
            source={art}
            style={{ width: artWidth, height: artHeight }}
            contentFit="contain"
            accessibilityLabel={GRANDSCAPE_MIRROR_PACK.name}
          />
        ) : (
          <Text style={styles.packArtMark}>GM</Text>
        )}
      </View>
      <Text style={[styles.cardBackName, { color: highlighted ? '#ffd700' : '#f4efe4' }]} numberOfLines={2}>
        {GRANDSCAPE_MIRROR_PACK.name}
      </Text>
      {status === 'owned' || status === 'equipped' ? null : (
        <Text style={styles.packPrice}>{priceLabel}</Text>
      )}
      <Text style={styles.selectedBadgeText}>{caption}</Text>
    </PressableScale>
  );
}

function OutlinedText({ style, outlineColor = 'white', outlineWidth = 1, children, ...rest }: OutlinedTextProps) {
  return (
    <View>
      {OUTLINE_OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          style={[style, { position: 'absolute', color: outlineColor, left: dx * outlineWidth, top: dy * outlineWidth }]}
          {...rest}
        >
          {children}
        </Text>
      ))}
      <Text style={style} {...rest}>{children}</Text>
    </View>
  );
}

export default function ArenaPickerScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { arena, setArena, avatarId, setAvatar, cardSkin, setCardSkin, hydrated } = useCosmetics();
  const { quickPlayBot, joinQueue, connectionStatus, gameView, isInQueue } = useGame();
  const { isSubscribed } = useSubscription();
  const pack = useGrandscapePack();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [avatarOverride, setAvatarOverride] = useState<typeof avatarId | null>(null);
  const [arenaOverride, setArenaOverride] = useState<typeof arena | null>(null);
  const [cardOverride, setCardOverride] = useState<typeof cardSkin | null>(null);
  const [packOverride, setPackOverride] = useState<boolean | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>(undefined);
  const pendingEnterRef = useRef(false);

  const loadoutInput = {
    hydrated,
    storedAvatar: avatarId,
    storedArena: arena,
    storedCard: cardSkin,
    avatarOverride,
    arenaOverride,
    cardOverride,
  };
  const shown = shownLoadout(loadoutInput);
  const selectedAvatar = shown.avatar;
  const selectedArena = shown.arena;
  const selectedCard = shown.card;
  const illustratedIds = new Set<string>(prematchIllustratedSkins());
  const cardChoices = CARD_SKINS.filter((skin) => illustratedIds.has(skin.id));
  const packHighlighted = packOverride === false
    ? false
    : (packOverride === true || pack.storedPack === 'grandscape-mirror')
      && (pack.owns || (pack.storeLoading && pack.storedPack === 'grandscape-mirror'));

  const lastNavigatedGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameView && gameView.gameId !== lastNavigatedGameIdRef.current) {
      lastNavigatedGameIdRef.current = gameView.gameId;
      router.replace('/game-loading');
    }
  }, [gameView]);

  useEffect(() => {
    if (isInQueue) router.replace('/matchmaking');
  }, [isInQueue]);

  const doEnterArena = (confirmed: ConfirmedLoadout) => {
    setArena(confirmed.arena);
    setAvatar(confirmed.avatar);
    setCardSkin(confirmed.card, isSubscribed);
    if (packOverride === true && pack.owns) pack.equip();
    else if (packOverride === false) pack.unequip();
    if (mode === 'bot') {
      quickPlayBot();
      router.replace('/game-loading?mode=bot');
    } else if (mode === 'private') {
      router.replace('/private-room');
    } else {
      joinQueue();
    }
  };

  const promptAndEnter = (confirmed: ConfirmedLoadout) => {
    const avatarName = AVATARS.find((a) => a.id === confirmed.avatar)?.name ?? 'Your character';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${avatarName} enters the arena. Ready?`)) {
        doEnterArena(confirmed);
      }
      return;
    }
    Alert.alert(
      'Ready to Battle?',
      `${avatarName} will enter the arena. You can't change your loadout mid-match.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'ENTER THE ARENA', onPress: () => doEnterArena(confirmed) },
      ],
    );
  };

  const handleConfirm = () => {
    if (connectionStatus !== 'connected') return;
    const confirmed = confirmLoadout(loadoutInput);
    if (!confirmed) {
      pendingEnterRef.current = true;
      return;
    }
    pendingEnterRef.current = false;
    promptAndEnter(confirmed);
  };

  useEffect(() => {
    if (!pendingEnterRef.current || connectionStatus !== 'connected') return;
    const confirmed = confirmLoadout(loadoutInput);
    if (!confirmed) return;
    pendingEnterRef.current = false;
    promptAndEnter(confirmed);
  }, [hydrated, avatarId, arena, cardSkin, avatarOverride, arenaOverride, cardOverride, packOverride, pack.owns, connectionStatus, isSubscribed, mode]);

  const duo = useDuoWindow();
  const book = duo.mode === 'wide';
  const shortFold = duo.mode === 'compact' && duo.height < 700;
  const paneWidth = book ? (width - duo.creaseBand) / 2 : width - insets.left - insets.right;
  const maxContentWidth = Math.min(paneWidth - 32, 460);
  const arenaCardWidth = Math.min(paneWidth * 0.9, 420);
  const avatarCardWidth = Math.min(arenaCardWidth, book ? 280 : 420);
  const avatarSnapInterval = avatarCardWidth + 14;
  const avatarCarouselPad = Math.max(12, (paneWidth - avatarCardWidth) / 2);
  const webTopPad = Platform.OS === 'web' ? 8 : 0;
  const cardPreviewWidth = Math.round(Math.min(Math.max(200, paneWidth * 0.78), 320) / 2);
  const cardScale = cardPreviewWidth / 56;
  const cardSnap = cardPreviewWidth + 36;

  const onGrandscapePress = async () => {
    if (packHighlighted && pack.owns) {
      setPackOverride(false);
      return;
    }
    if (pack.storeLoading && !pack.owns) return;
    if (pack.owns) {
      setPackOverride(true);
      return;
    }
    if (pack.shop.canPurchase) {
      try {
        const result = await pack.buy();
        if (result === 'purchased') setPackOverride(true);
      } catch (err) {
        Alert.alert('Purchase failed', err instanceof Error ? err.message : 'Please try again.');
      }
      return;
    }
    Alert.alert('Unavailable', 'Grandscape Mirror Pack is not available from the App Store yet.');
  };

  const selectedAvatarData = AVATARS.find((a) => a.id === selectedAvatar);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0030', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, flexDirection: book ? 'row' : 'column', minHeight: 0 }}>
      <View style={{ flex: 1, minHeight: 0 }}>
      <View style={[styles.header, { paddingTop: insets.top + webTopPad + 8, paddingLeft: insets.left + 16, paddingRight: 16 }]}>
        <BackButton label="← BACK" onPress={() => router.back()} labelStyle={styles.backLabelShadow} />
        <Text style={[styles.title, { color: colors.foreground, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }]}>YOUR LOADOUT</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }]}>
          {mode === 'bot' ? 'Quick Play · Bot' : mode === 'private' ? 'Private Room · Pick Your Look' : 'Ranked Match'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CHARACTER SELECTION ─────────────────────────────────────── */}
        <View style={[styles.section, { width: maxContentWidth }]}>
          <Text style={[styles.sectionLabel, { color: colors.neonGold }]}>
            ✦  PICK YOUR CHARACTER
          </Text>
        </View>

        {/* Full-width snap carousel */}
        <View style={{ width: paneWidth }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={avatarSnapInterval}
            snapToAlignment="center"
            contentContainerStyle={{
              paddingHorizontal: avatarCarouselPad,
              gap: 14,
            }}
          >
            {AVATARS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              // Baked cards already carry their own title, border and scene.
              const bakedCard = av.selectionFrame != null || av.framed === true;
              const pickerSource = av.selectionFrame ?? av.portrait;
              return (
                <PressableScale
                  key={av.id}
                  onPress={() => setAvatarOverride(av.id)}
                  style={[
                    styles.avatarCard,
                    {
                      width: avatarCardWidth,
                      height: shortFold ? 168 : 240,
                      borderColor: isSelected ? av.color : bakedCard ? 'transparent' : 'rgba(255,255,255,0.10)',
                      borderWidth: isSelected ? 2.5 : bakedCard ? 0 : 1,
                      shadowColor: av.color,
                      shadowOpacity: isSelected ? 0.85 : 0,
                      shadowRadius: 20,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: isSelected ? 14 : 0,
                    },
                  ]}
                >
                  {bakedCard ? null : (
                  <LinearGradient
                    colors={['transparent', 'rgba(255,255,255,0.30)']}
                    start={{ x: 0, y: 0.45 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  )}
                  <Image
                    source={pickerSource}
                    style={styles.avatarImage}
                    contentFit="contain"
                    accessibilityLabel={av.name}
                  />
                  {isSelected ? (
                    <View style={[styles.selectedBadge, { position: 'absolute', top: 10, right: 10 }]}>
                      <Text style={styles.selectedBadgeText}>✓  SELECTED</Text>
                    </View>
                  ) : null}
                  {bakedCard ? null : (
                  <View style={styles.avatarNameWrap}>
                    <Text style={[styles.avatarName, { color: isSelected ? av.color : '#1a0030' }]}>
                      {av.name}
                    </Text>
                    <OutlinedText style={[styles.avatarQuote, { color: 'rgba(20,0,50,0.65)' }]} numberOfLines={1}>
                      "{av.quote}"
                    </OutlinedText>
                  </View>
                  )}
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {AVATARS.map((av) => (
            <View
              key={av.id}
              style={[
                styles.dot,
                {
                  backgroundColor: selectedAvatar === av.id ? av.color : 'rgba(255,255,255,0.22)',
                  width: selectedAvatar === av.id ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* ── CARD BACK — after character, before the match ───────────── */}
        <View style={[styles.section, { width: maxContentWidth }]}>
          <Text style={[styles.sectionLabel, { color: colors.neonGold }]}>
            ✦  PICK YOUR CARD BACK
          </Text>
        </View>
        <View style={{ width: paneWidth }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={cardSnap}
            snapToAlignment="center"
            contentContainerStyle={[styles.cardBackRow, { paddingHorizontal: Math.max(16, (paneWidth - cardPreviewWidth) / 2) }]}
          >
            <GrandscapePackTile
              width={cardPreviewWidth}
              artWidth={56 * cardScale}
              artHeight={78 * cardScale}
              highlighted={packHighlighted}
              priceLabel={pack.shop.priceLabel}
              status={pack.storeLoading && !pack.owns ? 'checking' : pack.shop.status}
              onPress={() => { void onGrandscapePress(); }}
            />
            {cardChoices.map((skin) => {
              const isSelected = !packHighlighted && selectedCard === skin.id;
              return (
                <PressableScale
                  key={skin.id}
                  onPress={() => {
                    setPackOverride(false);
                    setCardOverride(skin.id);
                  }}
                  style={[
                    styles.cardBackTile,
                    {
                      width: cardPreviewWidth,
                      borderColor: isSelected ? '#ffd700' : 'rgba(255,255,255,0.10)',
                      borderWidth: isSelected ? 2.5 : 1,
                    },
                  ]}
                >
                  <CardBack size="md" skinOverride={skin.id} scale={cardScale} />
                  <Text style={[styles.cardBackName, { color: isSelected ? '#ffd700' : '#f4efe4' }]} numberOfLines={2}>
                    {skin.name}
                  </Text>
                  {isSelected ? <Text style={styles.selectedBadgeText}>✓  SELECTED</Text> : null}
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* ── ARENA SELECTION ─────────────────────────────────────────── */}
        <View style={[styles.section, { width: maxContentWidth }]}>
          <Text style={[styles.sectionLabel, { color: colors.neonGold }]}>
            ✦  PICK YOUR ARENA
          </Text>
        </View>

        {ARENAS.map((arenaItem) => {
          const isSelected = selectedArena === arenaItem.id;
          const isLocked = arenaItem.premium && !isSubscribed;

          return (
            <PressableScale
              key={arenaItem.id}
              onPress={() => {
                if (isLocked) {
                  setPaywallFeature(`Unlock the "${arenaItem.name}" arena`);
                  setPaywallVisible(true);
                  return;
                }
                setArenaOverride(arenaItem.id);
              }}
              style={[
                styles.arenaCard,
                {
                  width: arenaCardWidth,
                  height: shortFold ? 148 : 200,
                  borderColor: isSelected ? '#ffd700' : 'rgba(255,255,255,0.10)',
                  borderWidth: isSelected ? 2.5 : 1,
                  opacity: isLocked ? 0.62 : 1,
                },
              ]}
            >
              <View style={StyleSheet.absoluteFill}>
                <ArenaBackground arenaOverride={arenaItem.id} />
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.82)']}
                start={{ x: 0, y: 0.3 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <View style={styles.arenaCardInner}>
                <View style={styles.arenaBadgeRow}>
                  {isLocked ? (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>🔒  PREMIUM</Text>
                    </View>
                  ) : isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓  SELECTED</Text>
                    </View>
                  ) : null}
                </View>

                <View>
                  <Text style={styles.arenaName}>{arenaItem.name}</Text>
                  <Text style={styles.arenaDesc} numberOfLines={2}>
                    {arenaItem.description.split('\n')[0]}
                  </Text>
                </View>
              </View>
            </PressableScale>
          );
        })}
      </ScrollView>
      </View>

      {book ? <View pointerEvents="none" style={{ width: duo.creaseBand }} /> : null}

      <View style={[book ? styles.confirmSide : styles.confirmBar, { paddingBottom: insets.bottom + 18, paddingLeft: book ? 24 : insets.left + 24, paddingRight: insets.right + 24 }]}>
        <PressableScale
          onPress={handleConfirm}
          disabled={connectionStatus !== 'connected'}
          style={styles.confirmOuter}
        >
          <LinearGradient
            colors={
              connectionStatus === 'connected'
                ? ['#f5e070', '#d4a820', '#f5e070']
                : ['#3a3020', '#1e1a0a', '#3a3020']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmPill}
          >
            <Text
              style={[
                styles.confirmText,
                connectionStatus !== 'connected' && { color: '#5a5030' },
              ]}
            >
              {connectionStatus === 'connected' ? 'ENTER THE ARENA' : 'CONNECTING...'}
            </Text>
          </LinearGradient>
        </PressableScale>
        {book ? (
          <Text style={[styles.subtitle, { color: colors.mutedForeground, marginTop: 16 }]}>
            Play stays free. Memberships are cosmetic.
          </Text>
        ) : null}
      </View>
      </View>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureLabel={paywallFeature}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  subtitle: { fontSize: 11, letterSpacing: 2, marginTop: 5, textAlign: 'center' },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 14,
  },
  section: {
    paddingHorizontal: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 10,
    marginLeft: 2,
  },
  avatarCard: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  avatarImage: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarNameWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  avatarName: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fff',
    marginBottom: 4,
  },
  avatarQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardBackRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardBackTile: {
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  cardBackName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  packArtFrame: {
    overflow: 'hidden',
    backgroundColor: '#07000f',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packArtMark: {
    color: '#ffd700',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  packPrice: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  arenaCard: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  arenaCardInner: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  arenaBadgeRow: {
    alignItems: 'flex-end',
  },
  lockBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  lockBadgeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  selectedBadge: {
    backgroundColor: 'rgba(255,215,0,0.22)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  selectedBadgeText: {
    color: '#ffd700',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  arenaName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  arenaDesc: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  confirmSide: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
  },
  confirmBar: {
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: 'rgba(7,0,15,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  backLabelShadow: {
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  confirmOuter: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  confirmPill: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  confirmText: {
    color: '#1a0e00',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
