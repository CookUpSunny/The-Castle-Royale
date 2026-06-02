import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const CARD_W = 48;
const CARD_H = 68;
const CARD_COUNT = 88;

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
  { rank: '♦', suit: '', rankColor: '#e8b84b', suitColor: '#e8b84b', bg: '#080500', border: '#e8b84b', faceDown: true },
];

interface MosaicCellProps {
  delay: number;
  card: CardData;
  dissolving: boolean;
  left: number;
  top: number;
  rotate: number;
}

function MosaicCell({ delay, card, dissolving, left, top, rotate }: MosaicCellProps) {
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
    transform: [
      { rotate: `${rotate}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.cellWrap, { left, top }, animStyle]}>
      <View
        style={[
          styles.miniCard,
          {
            width: CARD_W,
            height: CARD_H,
            backgroundColor: card.bg,
            borderColor: card.border,
          },
          card.faceDown && styles.faceDownCard,
        ]}
      >
        {card.faceDown ? (
          <Text style={[styles.cardSuit, { color: card.rankColor, fontSize: 18 }]}>{card.rank}</Text>
        ) : (
          <>
            <Text style={[styles.cardRank, { color: card.rankColor }]} numberOfLines={1}>
              {card.rank}
            </Text>
            {card.suit ? (
              <Text style={[styles.cardSuit, { color: card.suitColor }]}>{card.suit}</Text>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

interface CardMosaicProps {
  onAssembled: () => void;
  dissolving: boolean;
}

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export default function CardMosaic({ onAssembled, dissolving }: CardMosaicProps) {
  const { width, height } = useWindowDimensions();
  const assembledRef = useRef(false);

  const cellData = useMemo(() => {
    const rand = seededRand(width * 1000 + height);
    const data: { delay: number; card: CardData; left: number; top: number; rotate: number }[] = [];
    let maxDelay = 0;

    // Build a cycling pool (repeats until CARD_COUNT) then Fisher-Yates shuffle
    // so every card type appears proportionally rather than random-with-replacement.
    const source: CardData[] = Array.from({ length: CARD_COUNT }, (_, i) => CARD_POOL[i % CARD_POOL.length]!);
    for (let i = source.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = source[i]!; source[i] = source[j]!; source[j] = tmp;
    }
    // Guarantee no two consecutive cards share the same rank (swap forward if needed)
    for (let i = 1; i < source.length; i++) {
      if (source[i]!.rank === source[i - 1]!.rank) {
        for (let j = i + 1; j < source.length; j++) {
          if (source[j]!.rank !== source[i - 1]!.rank) {
            const tmp = source[i]!; source[i] = source[j]!; source[j] = tmp;
            break;
          }
        }
      }
    }
    const shuffled = source;

    for (let i = 0; i < CARD_COUNT; i++) {
      const delay = rand() * 1400;
      if (delay > maxDelay) maxDelay = delay;
      const left = rand() * (width - CARD_W - 8) + 4;
      const top = rand() * (height - CARD_H - 8) + 4;
      const rotate = (rand() - 0.5) * 30;
      data.push({ delay, card: shuffled[i]!, left, top, rotate });
    }
    return { cells: data, maxDelay };
  }, [width, height]);

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
          left={item.left}
          top={item.top}
          rotate={item.rotate}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  cellWrap: {
    position: 'absolute',
  },
  miniCard: {
    borderRadius: 6,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    paddingVertical: 3,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
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
