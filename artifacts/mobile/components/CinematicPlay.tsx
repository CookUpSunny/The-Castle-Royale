import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Card from '@/components/Card';
import type { Card as CardType, LastEvent } from '@/contexts/GameContext';
import type { LayoutRect } from '@/components/CardPlayFlight';
import { lastEventIdentityKey } from '@/lib/lastEventDedupe';
import CinematicSpotlight, { type SpotlightStrength } from '@/components/CinematicSpotlight';
import HandPlaceOverlay from '@/components/HandPlaceOverlay';
import BurnEffect from '@/components/BurnEffect';

const SM = { w: 40, h: 56 };

function centerOf(r: LayoutRect | null): { x: number; y: number } | null {
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

type CinematicKind = 'normal' | 'big';

function kindFromEvent(ev: LastEvent): CinematicKind {
  if (ev.type === 'burn' || ev.type === 'set_complete') return 'big';
  if ((ev.playedCount ?? 1) >= 2) return 'big';
  return 'normal';
}

function spotlightFromEvent(ev: LastEvent): SpotlightStrength {
  if (ev.type === 'burn' || ev.type === 'set_complete') return 'strong';
  if ((ev.playedCount ?? 1) >= 2) return 'strong';
  if (ev.type === 'normal' || ev.type === 'reset') return 'soft';
  return 'off';
}

/**
 * Orchestrates a cinematic play timeline (spotlight + optional hand + flight +
 * impact sparks). Presentation-only; authoritative game state still comes from
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
}: {
  gameId: string;
  lastEvent: LastEvent | undefined;
  myPlayerId: string;
  pileRect: LayoutRect | null;
  selfHandRect: LayoutRect | null;
  opponentZoneRect: LayoutRect | null;
  onAvatarPulse: (side: 'self' | 'opponent') => void;
}) {
  const [flight, setFlight] = useState<{ card: CardType; key: string; side: 'self' | 'opponent'; kind: CinematicKind } | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  const trigger = useSharedValue(0);
  const progress = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const ex = useSharedValue(0);
  const ey = useSharedValue(0);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const impact = useSharedValue(0);

  // 3D rotation shared values — rotateX tilts the card flat during flight,
  // rotateY adds a gentle tumble wobble; both use perspective: 800.
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);

  const [spotTrigger, setSpotTrigger] = useState(0);
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

    const k = kindFromEvent(ev);
    const arcLift = k === 'big' ? 124 : 84;
    const ctrlX = (start.x + end.x) / 2 + (side === 'self' ? 18 : -18);
    const ctrlY = Math.min(start.y, end.y) - Math.max(arcLift, Math.abs(start.y - end.y) * (k === 'big' ? 0.5 : 0.35));

    sx.value = start.x - SM.w / 2;
    sy.value = start.y - SM.h / 2;
    ex.value = end.x - SM.w / 2;
    ey.value = end.y - SM.h / 2;
    cx.value = ctrlX - SM.w / 2;
    cy.value = ctrlY - SM.h / 2;
    progress.value = 0;
    impact.value = 0;
    rotX.value = 0;
    rotY.value = 0;

    setFlight({ card, key, side, kind: k });
    setSpotTrigger((n) => n + 1);

    const finish = () => {
      setFlight((cur) => (cur?.key === key ? null : cur));
      setImpactVisible(false);
    };
    const showImpact = () => {
      setImpactVisible(true);
      setTimeout(() => setImpactVisible(false), 720);
    };

    const flightMs = k === 'big' ? 480 : 420;
    const anticipationMs = 110;

    // rotateX: card tilts from upright → flat during flight.
    // Self side tilts away (+35°); opponent side tilts toward viewer (-35°).
    const rotXTarget = side === 'self' ? 35 : -35;
    rotX.value = withSequence(
      withTiming(0, { duration: anticipationMs }),
      withTiming(rotXTarget, { duration: flightMs, easing: Easing.inOut(Easing.cubic) }),
    );

    // rotateY: gentle 3-segment tumble wobble (0° → 15° → −10° → 0°).
    // Same for both sides — natural spin doesn't depend on which player.
    const seg = Math.floor(flightMs / 3);
    rotY.value = withSequence(
      withTiming(0, { duration: anticipationMs }),
      withTiming(15, { duration: seg, easing: Easing.out(Easing.cubic) }),
      withTiming(-10, { duration: seg, easing: Easing.inOut(Easing.cubic) }),
      withTiming(0, { duration: flightMs - seg * 2, easing: Easing.in(Easing.cubic) }),
    );

    // Timeline:
    // - 0..~120ms anticipation
    // - ~120..520ms flight
    trigger.value = trigger.value + 1;
    progress.value = withSequence(
      withTiming(-0.14, { duration: anticipationMs, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: flightMs, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (!finished) return;
        impact.value = withSequence(
          withTiming(1, { duration: 90, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }),
        );
        // Landing settle: card springs back to flat on the table.
        rotX.value = withSpring(0, { damping: 18, stiffness: 200 });
        rotY.value = withSpring(0, { damping: 20, stiffness: 220 });
        runOnJS(showImpact)();
        runOnJS(finish)();
      }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated SVs are mutated here, not read as deps
  }, [gameId, lastEvent, myPlayerId, pileRect, selfHandRect, opponentZoneRect, onAvatarPulse]);

  const spotlightStrength: SpotlightStrength = flight
    ? (lastEvent ? spotlightFromEvent(lastEvent) : 'soft')
    : 'off';

  const enableHand = !!flight && flight.side === 'self' && (flight.kind === 'big' || (lastEvent?.type === 'normal' || lastEvent?.type === 'reset'));

  const flightStyle0 = useAnimatedStyle(() => {
    const rawT = progress.value;
    const t = rawT < 0 ? 0 : rawT;
    const omt = 1 - t;
    const bx = omt * omt * sx.value + 2 * omt * t * cx.value + t * t * ex.value;
    const by = omt * omt * sy.value + 2 * omt * t * cy.value + t * t * ey.value;
    const fade = t > 0.92 ? 1 - (t - 0.92) / 0.08 : 1;

    // Anticipation: small pull-back opposite of travel.
    const ant = rawT < 0 ? rawT / -0.14 : 0; // 0..1 during anticipation
    const antX = ant * (flight?.side === 'self' ? -10 : 10);
    const antY = ant * 8;

    // Landing "punch": quick scale bump.
    const punch = impact.value;
    const baseScale = 0.9 + t * 0.14;
    return {
      position: 'absolute',
      left: bx + antX,
      top: by + antY,
      opacity: fade,
      transform: [
        { perspective: 800 },
        { rotateX: `${rotX.value}deg` },
        { rotateY: `${rotY.value}deg` },
        { rotate: `${t * (flight?.kind === 'big' ? 22 : 16)}deg` },
        { scale: baseScale + punch * 0.08 },
      ],
      zIndex: 120,
      elevation: 30,
    };
  });

  // Trail ghost copies get a fixed mid-flight rotateX so they read as motion
  // blur rather than independent perspective layers that fight the lead card.
  const TRAIL_ROT_X = 18; // deg — approximate midpoint of the 0→35 range

  const trailStyle = (dt: number) =>
    useAnimatedStyle(() => {
      const rawT = progress.value;
      const t0 = rawT < 0 ? 0 : rawT;
      const t = Math.max(0, Math.min(1, t0 - dt));
      const omt = 1 - t;
      const bx = omt * omt * sx.value + 2 * omt * t * cx.value + t * t * ex.value;
      const by = omt * omt * sy.value + 2 * omt * t * cy.value + t * t * ey.value;
      const o = (1 - t0) * 0.16;
      return {
        position: 'absolute',
        left: bx,
        top: by,
        opacity: o,
        transform: [
          { perspective: 800 },
          { rotateX: `${TRAIL_ROT_X}deg` },
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

  // Impact FX color roughly matches existing burn palette.
  const impactColor =
    lastEvent?.type === 'burn' || lastEvent?.type === 'set_complete'
      ? '#ff7f00'
      : lastEvent?.type === 'reset'
        ? '#c084fc'
        : '#ffd700';

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

      {/* Impact sparks centered at the target pile */}
      <BurnEffect visible={impactVisible} color={impactColor} center={centerOf(pileRect)} />

      {/* Subtle impact ring (cheap) */}
      <ImpactRing pileRect={pileRect} pulse={spotTrigger} />
    </View>
  );
}

function ImpactRing({ pileRect, pulse }: { pileRect: LayoutRect | null; pulse: number }) {
  const c = centerOf(pileRect);
  const s = useSharedValue(0);
  const o = useSharedValue(0);

  useEffect(() => {
    if (!c) return;
    s.value = 0;
    o.value = 0;
    o.value = withTiming(1, { duration: 80 });
    s.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(1.15, { duration: 220, easing: Easing.in(Easing.cubic) }),
    );
    o.value = withDelay(120, withTiming(0, { duration: 360, easing: Easing.in(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ scale: 0.7 + s.value * 0.7 }],
  }));

  if (!c) return null;
  const size = 120;
  return (
    <View pointerEvents="none" style={[styles.impactWrap, { left: c.x - size / 2, top: c.y - size / 2, width: size, height: size }]}>
      <Animated.View style={[styles.impactRing, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  impactWrap: {
    position: 'absolute',
    zIndex: 105,
  },
  impactRing: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255,220,140,0.7)',
  },
});
