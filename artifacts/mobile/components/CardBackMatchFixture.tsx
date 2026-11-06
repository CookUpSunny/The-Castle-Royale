import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ActionButtons from '@/components/ActionButtons';
import BackButton from '@/components/BackButton';
import CardComponent, { CardBack } from '@/components/Card';
import GlowPile from '@/components/GlowPile';
import PlayerHand from '@/components/PlayerHand';
import SceneBackground from '@/components/SceneBackground';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import { type Card as CardType } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import DrawPileStack from '@/components/DrawPileStack';
import { IMAGE_CARD_BACKS, isCardSkinId, type CardSkinId } from '@/lib/cardSkins';

/** Same portrait draw-deck scale as the live match in game.tsx. */
const DRAW_DECK_SCALE = 1.3;
const DRAW_DECK_CARD_W = 60 * DRAW_DECK_SCALE;
const DRAW_DECK_CARD_H = 84 * DRAW_DECK_SCALE;
const DRAW_DECK_PEEK = 2 * DRAW_DECK_SCALE;
const DRAW_DECK_BACK_SCALE = DRAW_DECK_CARD_W / 40;

const DISCARD: CardType[] = [{ id: 'discard', value: 12, suit: 'H' }];
const OPPONENT_FACE_UP: CardType[] = [
  { id: 'of1', value: 11, suit: 'S' },
  { id: 'of2', value: 6, suit: 'D' },
  { id: 'of3', value: 4, suit: 'C' },
];
const HAND: CardType[] = [
  { id: 'h1', value: 9, suit: 'H' },
  { id: 'h2', value: 10, suit: 'S' },
  { id: 'h3', value: 5, suit: 'D' },
  { id: 'h4', value: 2, suit: 'C' },
];
const FACE_UP: CardType[] = [
  { id: 'fu1', value: 8, suit: 'S' },
  { id: 'fu2', value: 3, suit: 'H' },
  { id: 'fu3', value: 7, suit: 'C' },
];

/**
 * Dev-only portrait match. Equips `skin` and Cosmic Sanctum through the
 * cosmetics context, then paints the draw deck with CardBack and no override
 * so it inherits the equipped skin the same way the live match does.
 * `gallery` shows one of each image back in the opponent hand.
 */
export default function CardBackMatchFixture({
  skin = 'royal-gold',
  gallery = false,
}: {
  skin?: string;
  gallery?: boolean;
}) {
  const requested: CardSkinId = isCardSkinId(skin) ? skin : 'royal-gold';
  const { cardSkin, arena, setCardSkin, setArena } = useCosmetics();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  const ready = arena === 'cosmic' && cardSkin === requested;

  useEffect(() => {
    if (arena !== 'cosmic') setArena('cosmic');
    if (cardSkin !== requested) setCardSkin(requested);
  }, [arena, cardSkin, requested, setArena, setCardSkin]);

  const opponentBacks: CardSkinId[] = gallery
    ? IMAGE_CARD_BACKS.map((entry) => entry.id)
    : [requested, requested, requested, requested];

  return (
    <View testID={ready ? 'match-fixture-ready' : 'match-fixture'} style={styles.root}>
      <SceneBackground />
      {ready ? (
        <View
          style={[
            styles.layout,
            {
              paddingTop: insets.top + 6,
              paddingBottom: insets.bottom || 12,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          <View style={styles.topNav}>
            <BackButton label="← EXIT" onPress={() => {}} />
          </View>

          {wide ? (
            <View style={styles.wideRow}>
              <View style={styles.wideActions}><ActionButtons canPickup isMyTurn onPickup={() => {}} /></View>
              <View style={styles.wideCenter}>
                <View style={[styles.opponent, styles.opponentWide]}>
                  <View style={styles.backRow}>
                    {opponentBacks.slice(0, 4).map((id, i) => (
                      <View key={`${id}-${i}`} style={{ marginLeft: i === 0 ? 0 : -18 }}>
                        <CardBack size="sm" skinOverride={gallery ? id : undefined} />
                      </View>
                    ))}
                  </View>
                </View>
                <GlowPile pile={DISCARD} />
                <View style={styles.hand}>
                  <PlayerHand
                    hand={HAND}
                    faceUp={FACE_UP}
                    faceDownCount={0}
                    faceDownIds={[]}
                    discardPile={DISCARD}
                    isMyTurn
                    onPlayCard={() => {}}
                    onPlayCards={() => {}}
                    availableWidth={Math.max(280, width - 240)}
                  />
                </View>
              </View>
              <View style={styles.wideDeck}>
                <DrawPileStack count={24} />
              </View>
            </View>
          ) : (
            <>
          <View style={styles.opponent}>
            <View style={[styles.backRow, gallery && styles.galleryRow]}>
              {opponentBacks.map((id, i) => (
                <View key={`${id}-${i}`} style={gallery ? undefined : { marginLeft: i === 0 ? 0 : -22 }}>
                  <CardBack size="sm" skinOverride={gallery ? id : undefined} />
                </View>
              ))}
            </View>
            <View style={styles.backRow}>
              {[0, 1, 2].map((i) => (
                <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 0 : -18 }} />
              ))}
            </View>
            <View style={styles.backRow}>
              {OPPONENT_FACE_UP.map((card, i) => (
                <CardComponent key={card.id} card={card} size="sm" style={{ marginLeft: i === 0 ? 0 : -16 }} />
              ))}
            </View>
            <View style={styles.tag}>
              <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                {opponentBacks.length} HAND · {OPPONENT_FACE_UP.length} FACE-UP · 3 FACE-DOWN
              </Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.pileNudge} />
            <View style={styles.pileRow}>
              <View style={styles.pileSide} />
              <GlowPile pile={DISCARD} />
              <View style={styles.deckSlot}>
                <DeckBadge count={24} />
              </View>
            </View>
            <ActionButtons canPickup isMyTurn onPickup={() => {}} />
          </View>

          <View style={styles.hand}>
            <PlayerHand
              hand={HAND}
              faceUp={FACE_UP}
              faceDownCount={3}
              faceDownIds={['fd1', 'fd2', 'fd3']}
              discardPile={DISCARD}
              isMyTurn
              onPlayCard={() => {}}
              onPlayCards={() => {}}
            />
          </View>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function DeckBadge({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={styles.deckBadge}>
      <View style={styles.deckStack}>
        {[2, 1, 0].map((layer) => (
          <View
            key={layer}
            style={{
              position: 'absolute',
              top: (2 - layer) * DRAW_DECK_PEEK,
              left: (2 - layer) * DRAW_DECK_PEEK,
            }}
          >
            <CardBack size="sm" scale={DRAW_DECK_BACK_SCALE} />
          </View>
        ))}
      </View>
      <View style={styles.deckTag}>
        <Text style={[styles.deckTitle, { color: colors.neonGold }]}>DRAW DECK</Text>
        <Text style={[styles.deckCount, { color: colors.foreground }]}>{count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07000f' },
  layout: { flex: 1 },
  topNav: { paddingHorizontal: 14, paddingBottom: 2 },
  opponent: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 12,
    marginTop: 6,
    gap: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3a1a5e',
    backgroundColor: '#1a053560',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  galleryRow: {
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
  },
  tag: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a1a5e',
    backgroundColor: '#10002850',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  table: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 6,
  },
  tableWide: {
    paddingTop: 0,
    width: '100%',
  },
  wideRow: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  wideActions: {
    width: 118,
    alignSelf: 'stretch',
  },
  wideCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  opponentWide: {
    marginTop: 0,
    marginHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 4,
  },
  wideDeck: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pileNudge: { height: 16, width: 1 },
  pileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  pileSide: { flex: 1, minWidth: 0 },
  deckSlot: { flex: 1, minWidth: 0, alignItems: 'flex-end', paddingRight: 2 },
  deckBadge: { alignItems: 'center', gap: 6 },
  deckStack: {
    width: DRAW_DECK_CARD_W + 2 * DRAW_DECK_PEEK,
    height: DRAW_DECK_CARD_H + 2 * DRAW_DECK_PEEK,
    position: 'relative',
  },
  deckTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a1a5e',
    backgroundColor: '#10002850',
    alignItems: 'center',
  },
  deckTitle: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  deckCount: { fontSize: 13, fontWeight: '900' },
  hand: { width: '100%', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 2, flexShrink: 0 },
});
