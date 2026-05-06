import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Card from '@/components/Card';
import type { Card as CardType, LastEvent } from '@/contexts/GameContext';
import BurnEffect from '@/components/BurnEffect';
import { lastEventIdentityKey } from '@/lib/lastEventDedupe';

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function centerOf(r: LayoutRect | null): { x: number; y: number } | null {
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

const SM = { w: 40, h: 56 };

interface CardPlayFlightProps {
  gameId: string;
  lastEvent: LastEvent | undefined;
  myPlayerId: string;
  pileRect: LayoutRect | null;
  selfHandRect: LayoutRect | null;
  opponentZoneRect: LayoutRect | null;
  onAvatarPulse: (side: 'self' | 'opponent') => void;
  onImpact?: (ev: LastEvent) => void;
}

/**
 * Decorative duplicate card flying hand/opp → discard pile. Authoritative
 * pile state still comes from `gameView`; this is presentation-only.
 */
export default function CardPlayFlight({
  gameId,
  lastEvent,
  myPlayerId,
  pileRect,
  selfHandRect,
  opponentZoneRect,
  onAvatarPulse,
  onImpact,
}: CardPlayFlightProps) {
  const [flight, setFlight] = useState<{ card: CardType; key: string } | null>(null);
  const progress = useSharedValue(0);
  const impact = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const ex = useSharedValue(0);
  const ey = useSharedValue(0);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const lastKeyRef = useRef<string | null>(null);
  const [impactVisible, setImpactVisible] = useState(false);

  useEffect(() => {
    lastKeyRef.current = null;
  }, [gameId]);

  useEffect(() => {
    const ev = lastEvent;
    const card = ev?.card;
    if (!ev || !card) return;
    if (ev.type === 'pickup' || ev.wasFaceDown) return;
    if (ev.type !== 'normal' && ev.type !== 'reset' && ev.type !== 'burn' && ev.type !== 'set_complete') return;

    const key = lastEventIdentityKey(gameId, ev);
    if (lastKeyRef.current === key) return;

    const side: 'self' | 'opponent' = ev.playerId === myPlayerId ? 'self' : 'opponent';
    const start = centerOf(side === 'self' ? selfHandRect : opponentZoneRect);
    const end = centerOf(pileRect);
    if (!start || !end) return;

    lastKeyRef.current = key;
    onAvatarPulse(side);

    const isBig = ev.type === 'burn' || ev.type === 'set_complete' || (ev.playedCount ?? 1) >= 2;
    const arcLift = isBig ? 124 : 84;
    const ctrlX = (start.x + end.x) / 2 + (side === 'self' ? 18 : -18);
    const ctrlY = Math.min(start.y, end.y) - Math.max(arcLift, Math.abs(start.y - end.y) * (isBig ? 0.5 : 0.35));

    sx.value = start.x - SM.w / 2;
    sy.value = start.y - SM.h / 2;
    ex.value = end.x - SM.w / 2;
    ey.value = end.y - SM.h / 2;
    cx.value = ctrlX - SM.w / 2;
    cy.value = ctrlY - SM.h / 2;
    progress.value = 0;
    impact.value = 0;

    setFlight({ card, key });

    const finish = () => {
      setFlight((cur) => (cur?.key === key ? null : cur));
    };
    const showImpact = () => {
      setImpactVisible(true);
      setTimeout(() => setImpactVisible(false), 700);
      if (onImpact) onImpact(ev);
    };

    progress.value = withSequence(
      withTiming(-0.14, { duration: 110, easing: Easing.out(Easing.cubic) }),
      withTiming(
        1,
        { duration: isBig ? 480 : 420, easing: Easing.inOut(Easing.cubic) },
        (finished) => {
          if (!finished) return;
          impact.value = withSequence(
            withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
          );
          runOnJS(showImpact)();
          runOnJS(finish)();
        },
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated SVs are mutated inside, not deps
  }, [gameId, lastEvent, myPlayerId, pileRect, selfHandRect, opponentZoneRect, onAvatarPulse, onImpact]);

  const animStyle = useAnimatedStyle(() => {
    const rawT = progress.value;
    const t = rawT < 0 ? 0 : rawT;
    const omt = 1 - t;
    const bx = omt * omt * sx.value + 2 * omt * t * cx.value + t * t * ex.value;
    const by = omt * omt * sy.value + 2 * omt * t * cy.value + t * t * ey.value;
    const fade = t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1;
    const ant = rawT < 0 ? rawT / -0.14 : 0;
    const antX = ant * -10;
    const antY = ant * 8;
    return {
      position: 'absolute',
      left: bx + antX,
      top: by + antY,
      opacity: fade,
      transform: [{ rotate: `${t * 16}deg` }, { scale: 0.9 + t * 0.14 + impact.value * 0.08 }],
      zIndex: 100,
      elevation: 20,
    };
  });

  if (!flight) return null;

  const impactColor =
    lastEvent?.type === 'burn' || lastEvent?.type === 'set_complete'
      ? '#ff7f00'
      : lastEvent?.type === 'reset'
        ? '#c084fc'
        : '#ffd700';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={animStyle}>
        <Card card={flight.card} size="sm" />
      </Animated.View>
      <BurnEffect visible={impactVisible} color={impactColor} center={centerOf(pileRect)} />
    </View>
  );
}
