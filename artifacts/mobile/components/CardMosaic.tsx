import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const CELL_W = 50;
const CELL_H = 72;

interface CardData {
  rank: string;
  suit: string;
  rankColor: string;
  suitColor: string;
  bg: string;
  border: string;
  faceDown: boolean;
}

const CARD_POOL: CardData[] = [
  { rank: 'A', suit: '♠', rankColor: '#111', suitColor: '#111', bg: '#faf8f2', border: '#bbb', faceDown: false },
  { rank: 'K', suit: '♥', rankColor: '#cc0000', suitColor: '#cc0000', bg: '#faf8f2', border: '#cc0000', faceDown: false },
  { rank: 'Q', suit: '♦', rankColor: '#cc0000', suitColor: '#cc0000', bg: '#faf8f2', border: '#cc0000', faceDown: false },
  { rank: 'J', suit: '♣', rankColor: '#111', suitColor: '#111', bg: '#faf8f2', border: '#bbb', faceDown: false },
  { rank: '10', suit: '♠', rankColor: '#111', suitColor: '#111', bg: '#fff0f0', border: '#ff3d3d', faceDown: false },
  { rank: '2', suit: '★', rankColor: '#7a6000', suitColor: '#9a7800', bg: '#fffce0', border: '#f5e642', faceDown: false },
  { rank: '?', suit: '', rankColor: '#b44fff', suitColor: '#b44fff', bg: '#1a1a2e', border: 'rgba(180,79,255,0.5)', faceDown: true },
];

interface MosaicCellProps {
  delay: number;
  card: CardData;
  dissolving: boolean;
}

function MosaicCell({ delay, card, dissolving }: MosaicCellProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 180 }));
  }, []);

  useEffect(() => {
    if (dissolving) {
      scale.value = withTiming(0, { duration: 500 });
    }
  }, [dissolving]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cellWrap, animStyle]}>
      <View
        style={[
          styles.miniCard,
          {
            backgroundColor: card.bg,
            borderColor: card.border,
          },
          card.faceDown && styles.faceDownCard,
        ]}
      >
        <Text style={[styles.cardRank, { color: card.rankColor }]} numberOfLines={1}>
          {card.rank}
        </Text>
        {card.suit ? (
          <Text style={[styles.cardSuit, { color: card.suitColor }]}>{card.suit}</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

interface CardMosaicProps {
  onAssembled: () => void;
  dissolving: boolean;
}

export default function CardMosaic({ onAssembled, dissolving }: CardMosaicProps) {
  const { width, height } = useWindowDimensions();
  const assembledRef = useRef(false);

  const cols = Math.ceil(width / CELL_W);
  const rows = Math.ceil(height / CELL_H);
  const total = cols * rows;

  const cellData = useMemo(() => {
    const data: { delay: number; card: CardData }[] = [];
    let maxDelay = 0;
    for (let i = 0; i < total; i++) {
      const delay = Math.random() * 1400;
      if (delay > maxDelay) maxDelay = delay;
      data.push({ delay, card: CARD_POOL[i % CARD_POOL.length] });
    }
    return { cells: data, maxDelay };
  }, [total]);

  useEffect(() => {
    if (assembledRef.current) return;
    assembledRef.current = true;
    const timer = setTimeout(() => {
      onAssembled();
    }, cellData.maxDelay + 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { width, height }]}>
      {cellData.cells.map((item, i) => (
        <MosaicCell
          key={i}
          delay={item.delay}
          card={item.card}
          dissolving={dissolving}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  cellWrap: {
    width: CELL_W,
    height: CELL_H,
    padding: 2,
  },
  miniCard: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  faceDownCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRank: {
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 14,
  },
  cardSuit: {
    fontSize: 11,
    alignSelf: 'center',
    flex: 1,
    textAlignVertical: 'center',
    textAlign: 'center',
    width: '100%',
  },
});
