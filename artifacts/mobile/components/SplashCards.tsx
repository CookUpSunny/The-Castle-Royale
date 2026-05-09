import { LinearGradient } from 'expo-linear-gradient';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const CARD_W = 62;
const CARD_H = 88;
const CARD_COUNT = 17;
const GOLD_COUNT = 3;

// Entrance timing
const STAGGER_MS = 120;    // delay between successive card entrances
const FLIP_DUR   = 300;    // scaleX flip duration per card
// Total entrance duration before golden cycle may start
const ENTRANCE_TOTAL_MS = (CARD_COUNT - 1) * STAGGER_MS + FLIP_DUR; // ≈ 2 220 ms

const REVEAL_INTERVAL = 3200;
const REVEAL_HOLD     = 1600;
const PROXIMITY       = 160;

const SUITS: readonly string[] = ['♥', '♦', '♣', '♠'];
const RED_SUITS = new Set(['♥', '♦']);

const RANK_POOL: string[] = [];
[
  { r: 'A', w: 18 }, { r: 'K', w: 18 }, { r: 'Q', w: 18 }, { r: 'J', w: 16 },
  { r: '10', w: 5 }, { r: '9', w: 4 }, { r: '8', w: 3 }, { r: '7', w: 3 },
  { r: '6', w: 3 }, { r: '5', w: 2 }, { r: '4', w: 2 }, { r: '3', w: 2 }, { r: '2', w: 2 },
].forEach(({ r, w }) => { for (let i = 0; i < w; i++) RANK_POOL.push(r); });
const pickRank = () => RANK_POOL[Math.floor(Math.random() * RANK_POOL.length)];

interface CardSpec {
  id: number;
  isGolden: boolean;
  rank: string;
  suit: string;
  homeX: number;
  homeY: number;
  depth: number;
  initRot: number;
  entranceDelay: number;
  driftAmpX: number; driftDurX: number;
  driftAmpY: number; driftDurY: number;
  rotAmp: number;    rotDur: number;
  breathAmp: number; breathDur: number;
  shineDelay: number;
}

function buildSpecs(): CardSpec[] {
  const { width: W, height: H } = Dimensions.get('window');
  const goldenSet = new Set<number>();
  while (goldenSet.size < GOLD_COUNT) goldenSet.add(Math.floor(Math.random() * CARD_COUNT));

  // Vertical column down the screen centre.
  // Card centres distributed evenly from PAD_TOP to H - PAD_BOT.
  const PAD_TOP = 70;
  const PAD_BOT = 70;
  const usableH = H - PAD_TOP - PAD_BOT;
  const spacing = CARD_COUNT > 1 ? usableH / (CARD_COUNT - 1) : usableH;

  return Array.from({ length: CARD_COUNT }, (_, i) => {
    // Alternate left/right so neighbouring cards don't perfectly overlap.
    const side = i % 2 === 0 ? 1 : -1;
    const sideJitter = side * (6 + Math.random() * 10);
    const yJitter    = (Math.random() - 0.5) * (spacing * 0.22);

    const homeX = W / 2 + sideJitter;
    const homeY = Math.max(
      CARD_H / 2 + 8,
      Math.min(H - CARD_H / 2 - 8, PAD_TOP + i * spacing + yJitter),
    );

    const dAmpX = 8  + Math.random() * 10;
    const dAmpY = 6  + Math.random() * 10;
    const rAmp  = 2  + Math.random() * 4;

    return {
      id: i,
      isGolden: goldenSet.has(i),
      rank: pickRank(),
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
      homeX,
      homeY,
      depth: 0.55 + Math.random() * 0.45,
      initRot: side * (2 + Math.random() * 5),
      entranceDelay: i * STAGGER_MS,
      driftAmpX: dAmpX,
      driftDurX: 3800 + Math.random() * 2800,
      driftAmpY: dAmpY,
      driftDurY: 3400 + Math.random() * 3000,
      rotAmp: rAmp,
      rotDur: 4000 + Math.random() * 3000,
      breathAmp: 0.015 + Math.random() * 0.02,
      breathDur: 3000 + Math.random() * 2200,
      shineDelay: 600  + Math.random() * 2800,
    };
  });
}

// ─── Golden shine sweep ───────────────────────────────────────────────────────
function GoldenShine({ delay }: { delay: number }) {
  const x = useSharedValue(-CARD_W);

  useEffect(() => {
    x.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(CARD_W * 1.8, { duration: 480, easing: Easing.out(Easing.quad) })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: -8,
    left: x.value,
    width: CARD_W * 0.28,
    height: CARD_H + 16,
    transform: [{ rotate: '22deg' }],
  }));

  return (
    <Animated.View style={style} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(255,252,180,0.72)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

export interface CardHandle {
  flipTo: (faceUp: boolean) => void;
}

const FloatingCard = forwardRef<CardHandle, { spec: CardSpec }>(({ spec }, ref) => {
  const offsetX    = useSharedValue(0);
  const offsetY    = useSharedValue(0);
  const rot        = useSharedValue(spec.initRot);
  const breath     = useSharedValue(1);
  const flipSX     = useSharedValue(0);    // 0 = collapsed; entrance flips to 1
  const revSc      = useSharedValue(1);
  const glowOp     = useSharedValue(spec.isGolden ? 0.2 : 0);
  const entranceOp = useSharedValue(0);    // transparent until card's entrance fires

  const faceUpRef  = useRef(false);        // all cards start face-down
  const mountedRef = useRef(true);
  const [faceUp, setFaceUp] = useState(false);

  const baseScale   = 0.74 + spec.depth * 0.26;
  const cardOpacity = 0.44 + spec.depth * 0.51;

  // Idle loops must wait until this card's own entrance has finished.
  const IDLE_DELAY = spec.entranceDelay + FLIP_DUR + 160;

  useEffect(() => {
    mountedRef.current = true;

    // ── Entrance: fade in, then scaleX flip back → face ──────────────────────
    entranceOp.value = withDelay(
      spec.entranceDelay,
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
    );
    flipSX.value = withDelay(
      spec.entranceDelay,
      withTiming(1, { duration: FLIP_DUR, easing: Easing.out(Easing.cubic) }),
    );
    // Swap to face-up when the card is "edge-on" (halfway through the flip).
    const faceTimer = setTimeout(() => {
      if (mountedRef.current) {
        setFaceUp(true);
        faceUpRef.current = true;
      }
    }, spec.entranceDelay + FLIP_DUR / 2);

    // ── Idle loops — deferred until after entrance ────────────────────────────
    offsetX.value = withDelay(IDLE_DELAY, withRepeat(
      withSequence(
        withTiming( spec.driftAmpX, { duration: spec.driftDurX, easing: Easing.inOut(Easing.sin) }),
        withTiming(-spec.driftAmpX, { duration: spec.driftDurX, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));
    offsetY.value = withDelay(IDLE_DELAY, withRepeat(
      withSequence(
        withTiming(-spec.driftAmpY, { duration: spec.driftDurY, easing: Easing.inOut(Easing.sin) }),
        withTiming( spec.driftAmpY, { duration: spec.driftDurY, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));
    rot.value = withDelay(IDLE_DELAY, withRepeat(
      withSequence(
        withTiming( spec.rotAmp, { duration: spec.rotDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(-spec.rotAmp, { duration: spec.rotDur, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));
    breath.value = withDelay(IDLE_DELAY, withRepeat(
      withSequence(
        withTiming(1 + spec.breathAmp, { duration: spec.breathDur, easing: Easing.inOut(Easing.sin) }),
        withTiming(1 - spec.breathAmp, { duration: spec.breathDur, easing: Easing.inOut(Easing.sin) }),
      ), -1, false,
    ));

    if (spec.isGolden) {
      glowOp.value = withDelay(IDLE_DELAY, withRepeat(
        withSequence(
          withTiming(0.55, { duration: 1600 }),
          withTiming(0.25, { duration: 1600 }),
        ), -1, false,
      ));
    }

    return () => {
      clearTimeout(faceTimer);
      mountedRef.current = false;
      cancelAnimation(entranceOp);
      cancelAnimation(offsetX);
      cancelAnimation(offsetY);
      cancelAnimation(rot);
      cancelAnimation(breath);
      cancelAnimation(glowOp);
      cancelAnimation(flipSX);
      cancelAnimation(revSc);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    flipTo: (toFaceUp: boolean) => {
      if (faceUpRef.current === toFaceUp) return;
      faceUpRef.current = toFaceUp;

      flipSX.value = withSequence(
        withTiming(0, { duration: 210, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 210, easing: Easing.out(Easing.quad) }),
      );
      setTimeout(() => { if (mountedRef.current) setFaceUp(toFaceUp); }, 210);

      if (spec.isGolden) {
        if (toFaceUp) {
          revSc.value = withTiming(1.18, { duration: 320, easing: Easing.out(Easing.back) });
          cancelAnimation(glowOp);
          glowOp.value = withTiming(1, { duration: 180 });
        } else {
          revSc.value = withTiming(1, { duration: 280 });
          cancelAnimation(glowOp);
          glowOp.value = withRepeat(
            withSequence(
              withTiming(0.55, { duration: 1600 }),
              withTiming(0.25, { duration: 1600 }),
            ), -1, false,
          );
        }
      }
    },
  }));

  const wrapStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: spec.homeX - CARD_W / 2 + offsetX.value,
    top:  spec.homeY - CARD_H / 2 + offsetY.value,
    width: CARD_W,
    height: CARD_H,
    opacity: cardOpacity * entranceOp.value,
    pointerEvents: 'none' as const,
    transform: [
      { rotate: `${rot.value}deg` },
      { scale: baseScale * breath.value * revSc.value },
    ],
  }));

  const flipStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: flipSX.value }],
  }));

  const textColor = spec.isGolden
    ? '#07000f'
    : RED_SUITS.has(spec.suit) ? '#E11D48' : '#1a0f2e';

  return (
    <Animated.View style={wrapStyle}>
      <Animated.View style={[styles.cardBox, flipStyle]}>
        {faceUp ? (
          <LinearGradient
            colors={spec.isGolden
              ? (['#A87B1F', '#F0C758', '#FFE89A', '#F0C758', '#A87B1F'] as const)
              : (['#FFFCF2', '#F0E8D0'] as const)}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.face}
          >
            <Text style={[styles.cornerTL, { color: textColor }]}>{spec.rank}</Text>
            <Text style={[styles.suitCenter, { color: textColor }]}>{spec.suit}</Text>
            <Text style={[styles.cornerBR, { color: textColor }]}>{spec.rank}</Text>
            {spec.isGolden && <GoldenShine delay={spec.shineDelay} />}
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={spec.isGolden
              ? (['#3D2A0A', '#0A0612', '#3D2A0A'] as const)
              : (['#1F0F3D', '#070412', '#1F0F3D'] as const)}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.face}
          >
            <View style={[styles.backInner, spec.isGolden ? styles.backInnerGold : styles.backInnerPurple]} />
            <Text style={[styles.crownText, spec.isGolden ? styles.crownGold : styles.crownPurple]}>
              ♛
            </Text>
          </LinearGradient>
        )}
      </Animated.View>
    </Animated.View>
  );
});

FloatingCard.displayName = 'FloatingCard';

export default function SplashCards() {
  const specs    = useMemo(buildSpecs, []);
  const cardRefs = useRef(specs.map(() => React.createRef<CardHandle>()));

  const goldenIndices = useMemo(
    () => specs.reduce<number[]>((acc, s, i) => (s.isGolden ? [...acc, i] : acc), []),
    [specs],
  );

  const cycleIdxRef = useRef(0);
  const cycleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const runCycle = () => {
      const goldenIdx = goldenIndices[cycleIdxRef.current % goldenIndices.length];
      cycleIdxRef.current++;
      const golden = specs[goldenIdx];

      const nearby = specs.filter(c => {
        if (c.isGolden) return false;
        const dx = c.homeX - golden.homeX;
        const dy = c.homeY - golden.homeY;
        return Math.sqrt(dx * dx + dy * dy) <= PROXIMITY;
      });

      cardRefs.current[goldenIdx]?.current?.flipTo(true);
      nearby.forEach(c => cardRefs.current[c.id]?.current?.flipTo(false));

      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        cardRefs.current[goldenIdx]?.current?.flipTo(false);
        nearby.forEach(c => cardRefs.current[c.id]?.current?.flipTo(true));
      }, REVEAL_HOLD);

      cycleTimer.current = setTimeout(runCycle, REVEAL_INTERVAL);
    };

    // Golden cycle only fires after all entrance animations have completed.
    cycleTimer.current = setTimeout(runCycle, ENTRANCE_TOTAL_MS + 800);

    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [specs, goldenIndices]);

  const sorted = useMemo(() => [...specs].sort((a, b) => a.depth - b.depth), [specs]);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {sorted.map(spec => (
        <FloatingCard key={spec.id} spec={spec} ref={cardRefs.current[spec.id]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBox: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 9,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 10,
  },
  face: {
    flex: 1,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 7,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 7,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
    transform: [{ rotate: '180deg' }],
  },
  suitCenter: {
    fontSize: 28,
    lineHeight: 34,
  },
  backInner: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  backInnerPurple: { borderColor: 'rgba(168,85,247,0.5)' },
  backInnerGold:   { borderColor: 'rgba(240,199,88,0.55)' },
  crownText: {
    fontSize: 24,
    lineHeight: 30,
  },
  crownGold: {
    color: '#F0C758',
    textShadowColor: 'rgba(240,199,88,0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  crownPurple: {
    color: '#A855F7',
    textShadowColor: 'rgba(168,85,247,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
