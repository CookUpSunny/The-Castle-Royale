import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Card from '@/components/Card';
import type { Card as CardType, LastEvent } from '@/contexts/GameContext';
import type { LayoutRect } from '@/components/CardPlayFlight';
import { lastEventIdentityKey } from '@/lib/lastEventDedupe';
import CinematicSpotlight, { type SpotlightStrength } from '@/components/CinematicSpotlight';
import HandPlaceOverlay from '@/components/HandPlaceOverlay';

const SM = { w: 40, h: 56 };

function centerOf(r: LayoutRect | null): { x: number; y: number } | null {
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

function spotlightFromEvent(ev: LastEvent): SpotlightStrength {
  if (ev.type === 'normal' || ev.type === 'reset') return 'soft';
  return 'off';
}

/**
 * 3D tilt helpers — all inline math from progress t so they run on the UI
 * thread without extra Reanimated SVs.
 *
 * rotateX: parabola through (0, 9°) → (0.61, −6°) → (1, 0°)
 *   Derived: a=42, b=−51, c=9 → f(t) = 42t²−51t+9
 *
 * rotateY: sin(π·t) banking in the direction of travel; sideDir = +1 (self)
 *   or −1 (opponent). Peaks at t=0.5, returns to 0 at landing.
 */
function tiltRotX(t: number): number {
  'worklet';
  return 42 * t * t - 51 * t + 9;
}

function tiltRotY(t: number, sideDir: number): number {
  'worklet';
  return Math.sin(Math.PI * t) * 8 * sideDir;
}

/**
 * Orchestrates a cinematic play timeline (spotlight + optional hand + flight +
 * impact ring). Presentation-only; authoritative game state still comes from
 * `gameView`.
 */
export default function CinematicPlay({
  gameId,
  lastEvent,
  myPlayerId,
  pileRect,
  selfHandRect,
  opponentZoneRect,
  onAvatarPulse,
  initialLastKey,
}: {
  gameId: string;
  lastEvent: LastEvent | undefined;
  myPlayerId: string;
  pileRect: LayoutRect | null;
  selfHandRect: LayoutRect | null;
  opponentZoneRect: LayoutRect | null;
  onAvatarPulse: (side: 'self' | 'opponent') => void;
  initialLastKey?: string | null;
}) {
  const [flight, setFlight] = useState<{ card: CardType; key: string; side: 'self' | 'opponent' } | null>(null);
  const lastKeyRef = useRef<string | null>(initialLastKey ?? null);

  // Skip the gameId reset on first mount so the pre-seeded initialLastKey is
  // honoured. Subsequent gameId changes (joining a new game without unmounting)
  // still clear the key so the new game's first event plays correctly.
  const isFirstMountRef = useRef(true);

  const trigger = useSharedValue(0);
  const progress = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const ex = useSharedValue(0);
  const ey = useSharedValue(0);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const impact = useSharedValue(0);

  // sideDir: +1 for self (right bank), -1 for opponent (left bank).
  // Used inside useAnimatedStyle worklets to drive rotateY direction.
  const sideDir = useSharedValue(1);

  const [spotTrigger, setSpotTrigger] = useState(0);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    lastKeyRef.current = null;
  }, [gameId]);

  useEffect(() => {
    const ev = lastEvent;
    const card = ev?.card;
    if (!ev || !card) return;
    if (ev.type === 'pickup' || ev.wasFaceDown) return;
    if (ev.type !== 'normal' && ev.type !== 'reset') return;

    const key = lastEventIdentityKey(gameId, ev);
    if (lastKeyRef.current === key) return;

    const side: 'self' | 'opponent' = ev.playerId === myPlayerId ? 'self' : 'opponent';
    const start = centerOf(side === 'self' ? selfHandRect : opponentZoneRect);
    const end = centerOf(pileRect);
    if (!start || !end) return;

    lastKeyRef.current = key;
    onAvatarPulse(side);

    const arcLift = 84;
    const ctrlX = (start.x + end.x) / 2 + (side === 'self' ? 18 : -18);
    const ctrlY = Math.min(start.y, end.y) - Math.max(arcLift, Math.abs(start.y - end.y) * 0.35);

    sx.value = start.x - SM.w / 2;
    sy.value = start.y - SM.h / 2;
    ex.value = end.x - SM.w / 2;
    ey.value = end.y - SM.h / 2;
    cx.value = ctrlX - SM.w / 2;
    cy.value = ctrlY - SM.h / 2;
    progress.value = 0;
    impact.value = 0;
    sideDir.value = side === 'self' ? 1 : -1;

    setFlight({ card, key, side });
    setSpotTrigger((n) => n + 1);

    const finish = () => {
      setFlight((cur) => (cur?.key === key ? null : cur));
    };

    const flightMs = 480;
    const anticipationMs = 90;

    trigger.value = trigger.value + 1;
    progress.value = withSequence(
      // Easing.in accelerates into the pullback so velocity carries through
      // into the launch — eliminates the near-zero velocity stutter that
      // Easing.out caused at the anticipation→flight handoff.
      withTiming(-0.10, { duration: anticipationMs, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: flightMs, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        impact.value = withSequence(
          withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
        );
        runOnJS(finish)();
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated SVs are mutated here, not read as deps
  }, [gameId, lastEvent, myPlayerId, pileRect, selfHandRect, opponentZoneRect, onAvatarPulse]);

  const spotlightStrength: SpotlightStrength = flight
    ? (lastEvent ? spotlightFromEvent(lastEvent) : 'soft')
    : 'off';

  const enableHand = !!flight && flight.side === 'self' && (lastEvent?.type === 'normal' || lastEvent?.type === 'reset');

  // Lead card — full 3D tilt driven inline from progress.value.
  // rotateX: parabola 12° → −8° → 0°   rotateY: sin-bank in travel direction.
  const flightStyle0 = useAnimatedStyle(() => {
    const rawT = progress.value;
    const t = rawT < 0 ? 0 : rawT;
    const omt = 1 - t;
    const bx = omt * omt * sx.value + 2 * omt * t * cx.value + t * t * ex.value;
    const by = omt * omt * sy.value + 2 * omt * t * cy.value + t * t * ey.value;
    const fade = t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1;

    const ant = rawT < 0 ? rawT / -0.10 : 0;
    const antX = ant * (sideDir.value > 0 ? -10 : 10);
    const antY = ant * 8;

    const punch = impact.value;
    const baseScale = 0.9 + t * 0.14;

    const rX = tiltRotX(t);
    const rY = tiltRotY(t, sideDir.value);

    return {
      position: 'absolute',
      left: bx + antX,
      top: by + antY,
      opacity: fade,
      transform: [
        { perspective: 800 },
        { rotateX: `${rX}deg` },
        { rotateY: `${rY}deg` },
        { rotate: `${t * 16}deg` },
        { scale: baseScale + punch * 0.08 },
      ],
      zIndex: 120,
      elevation: 30,
    };
  });

  // Trail ghost copies — same tilt formulas at ~40% intensity so they read as
  // the same physical card smearing through space rather than flat sprites.
  const trailStyle = (dt: number) =>
    useAnimatedStyle(() => {
      const rawT = progress.value;
      const t0 = rawT < 0 ? 0 : rawT;
      const t = Math.max(0, Math.min(1, t0 - dt));
      const omt = 1 - t;
      const bx = omt * omt * sx.value + 2 * omt * t * cx.value + t * t * ex.value;
      const by = omt * omt * sy.value + 2 * omt * t * cy.value + t * t * ey.value;
      const o = (1 - t0) * 0.16;

      const rX = tiltRotX(t) * 0.4;
      const rY = tiltRotY(t, sideDir.value) * 0.4;

      return {
        position: 'absolute',
        left: bx,
        top: by,
        opacity: o,
        transform: [
          { perspective: 800 },
          { rotateX: `${rX}deg` },
          { rotateY: `${rY}deg` },
          { rotate: `${t * 18}deg` },
          { scale: 0.9 + t * 0.14 },
        ],
        zIndex: 110,
      };
    });

  const trail1 = trailStyle(0.06);
  const trail2 = trailStyle(0.12);

  if (!flight) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <CinematicSpotlight targetRect={pileRect} strength={spotlightStrength} trigger={spotTrigger} />
      <HandPlaceOverlay targetRect={pileRect} enabled={enableHand} trigger={spotTrigger} />

      {/* Motion blur illusion */}
      <Animated.View style={trail2}>
        <Card card={flight.card} size="sm" />
      </Animated.View>
      <Animated.View style={trail1}>
        <Card card={flight.card} size="sm" />
      </Animated.View>

      <Animated.View style={flightStyle0}>
        <Card card={flight.card} size="sm" />
      </Animated.View>

    </View>
  );
}
