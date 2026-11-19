import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import ShopDoorway, { type ShopDoorwayBeat } from '@/components/ShopDoorway';
import {
  SHOP_DOORWAY_MS,
  canEnterShop,
  canLeaveShop,
  exitOrientationTarget,
  exitShouldCover,
  shouldAnimateShopEntrance,
  waitForPresentation,
  type DoorwayPhase,
  type OrientationWaitDeps,
  type PresentationDeps,
} from '@/lib/shopDoorway';

/**
 * Root-level shop transition. The overlay sits outside the scaled app tree
 * so it stays full-screen while the shop eases from 1.08 to 1 underneath.
 * The landscape lock itself stays in RoyalShop, which remembers the lock to
 * restore. Navigating while this overlay is opaque is what triggers it.
 */

export type ShopOrigin = { x: number; y: number } | null;

interface ShopEntranceApi {
  enterShop: (origin: ShopOrigin) => void;
  leaveShop: () => void;
  /** Landscape shop has laid out and its background can be shown. */
  reportShopScene: (ready: boolean) => void;
  /** The screen under the shop has laid out in portrait. */
  reportReturnScene: (ready: boolean) => void;
}

const ShopEntranceContext = createContext<ShopEntranceApi | null>(null);

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Measurable = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

/** Starts the doorway from a button's window center. A missed measure still enters. */
export function openShopFrom(node: Measurable | null, enter: (origin: ShopOrigin) => void): void {
  let started = false;
  const go = (origin: ShopOrigin) => {
    if (started) return;
    started = true;
    enter(origin);
  };
  const timer = setTimeout(() => go(null), 180);
  if (!node) return;
  node.measureInWindow((x, y, width, height) => {
    clearTimeout(timer);
    if (width <= 0 || height <= 0) go(null);
    else go({ x: x + width / 2, y: y + height / 2 });
  });
}

interface Run {
  id: number;
  beat: ShopDoorwayBeat;
  reduced: boolean;
  origin: ShopOrigin;
}

function sceneDeps(
  isSceneReady: () => boolean,
  listeners: Set<() => void>,
): PresentationDeps {
  return {
    ...orientationDeps(),
    isSceneReady,
    subscribeSceneReady: (onReady) => {
      listeners.add(onReady);
      return () => {
        listeners.delete(onReady);
      };
    },
  };
}

function orientationDeps(): OrientationWaitDeps {
  return {
    getSize: () => {
      const { width, height } = Dimensions.get('window');
      return { width, height };
    },
    subscribeDimensions: (onSize) => {
      const sub = Dimensions.addEventListener('change', ({ window }) => {
        onSize(window.width, window.height);
      });
      return () => sub.remove();
    },
    subscribeOrientation: (onLandscape) => {
      try {
        const sub = ScreenOrientation.addOrientationChangeListener((event) => {
          const orientation = event.orientationInfo.orientation;
          if (
            orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
            || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
          ) {
            onLandscape(true);
            return;
          }
          if (
            orientation === ScreenOrientation.Orientation.PORTRAIT_UP
            || orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
          ) {
            onLandscape(false);
            return;
          }
          onLandscape(null);
        });
        return () => sub.remove();
      } catch {
        return () => {};
      }
    },
  };
}

function leaveRoute() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function ShopEntranceProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const reducedRef = useRef(false);
  reducedRef.current = reducedMotion === true;
  const phaseRef = useRef<DoorwayPhase>('idle');
  const entryPortrait = useRef<boolean | null>(null);
  const runSerial = useRef(0);
  const shopReady = useRef(false);
  const returnReady = useRef(false);
  const shopListeners = useRef(new Set<() => void>());
  const returnListeners = useRef(new Set<() => void>());
  const [run, setRun] = useState<Run | null>(null);
  const contentScale = useSharedValue(1);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.get() }],
  }));

  useEffect(() => {
    if (!run || run.reduced) {
      if (!run) contentScale.set(1);
      return;
    }
    if (run.beat === 'reveal' || run.beat === 'exit-reveal') {
      const duration = run.beat === 'reveal' ? SHOP_DOORWAY_MS.reveal : SHOP_DOORWAY_MS.exitReveal;
      contentScale.set(1.025);
      contentScale.set(withTiming(1, {
        duration,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.Never,
      }));
    }
  }, [contentScale, run]);

  const finishRun = useCallback((id: number) => {
    if (runSerial.current !== id) return;
    const wasExit = phaseRef.current === 'exit-reveal';
    phaseRef.current = 'idle';
    if (wasExit) entryPortrait.current = null;
    contentScale.set(1);
    setRun(null);
  }, [contentScale]);

  const onCovered = useCallback(() => {
    const id = runSerial.current;
    if (phaseRef.current === 'enter') {
      phaseRef.current = 'covered';
      shopReady.current = false;
      const pending = waitForPresentation(
        'landscape',
        SHOP_DOORWAY_MS.orientationCap,
        sceneDeps(() => shopReady.current, shopListeners.current),
        {
          quietMs: Platform.OS === 'web' ? 40 : undefined,
          settleMs: Platform.OS === 'web' ? 0 : SHOP_DOORWAY_MS.settle,
        },
      );
      router.push('/store');
      void pending.then(() => {
        if (runSerial.current !== id || phaseRef.current !== 'covered') return;
        phaseRef.current = 'reveal';
        setRun((current) => (current && current.id === id ? { ...current, beat: 'reveal' } : current));
      });
      return;
    }
    if (phaseRef.current === 'exit') {
      phaseRef.current = 'exit-covered';
      contentScale.set(1);
      returnReady.current = false;
      const { width, height } = Dimensions.get('window');
      const target = exitOrientationTarget(width, height);
      const quietMs = Platform.OS === 'web'
        ? 40
        : entryPortrait.current === null
          ? SHOP_DOORWAY_MS.exitQuiet
          : undefined;
      const pending = waitForPresentation(
        target,
        SHOP_DOORWAY_MS.orientationCap,
        sceneDeps(() => returnReady.current, returnListeners.current),
        {
          quietMs,
          settleMs: Platform.OS === 'web' ? 0 : SHOP_DOORWAY_MS.settle,
        },
      );
      leaveRoute();
      void pending.then(() => {
        if (runSerial.current !== id || phaseRef.current !== 'exit-covered') return;
        phaseRef.current = 'exit-reveal';
        setRun((current) => (current && current.id === id ? { ...current, beat: 'exit-reveal' } : current));
      });
    }
  }, [contentScale]);

  const onFinished = useCallback(() => {
    finishRun(runSerial.current);
  }, [finishRun]);

  const enterShop = useCallback((origin: ShopOrigin) => {
    if (!canEnterShop(phaseRef.current)) return;
    const { width, height } = Dimensions.get('window');
    if (!shouldAnimateShopEntrance(width, height)) {
      entryPortrait.current = false;
      router.push('/store');
      return;
    }
    entryPortrait.current = true;
    shopReady.current = false;
    phaseRef.current = 'enter';
    const id = runSerial.current + 1;
    runSerial.current = id;
    contentScale.set(1);
    setRun({
      id,
      beat: 'enter',
      reduced: reducedRef.current,
      origin,
    });
  }, [contentScale]);

  const leaveShop = useCallback(() => {
    if (!canLeaveShop(phaseRef.current)) return;
    const { width, height } = Dimensions.get('window');
    if (!exitShouldCover(entryPortrait.current, width, height)) {
      entryPortrait.current = null;
      leaveRoute();
      return;
    }
    returnReady.current = false;
    phaseRef.current = 'exit';
    const id = runSerial.current + 1;
    runSerial.current = id;
    setRun({
      id,
      beat: 'exit',
      reduced: reducedRef.current,
      origin: null,
    });
  }, []);

  const reportShopScene = useCallback((ready: boolean) => {
    if (shopReady.current === ready) return;
    shopReady.current = ready;
    shopListeners.current.forEach((listener) => listener());
  }, []);

  const reportReturnScene = useCallback((ready: boolean) => {
    if (returnReady.current === ready) return;
    returnReady.current = ready;
    returnListeners.current.forEach((listener) => listener());
  }, []);

  const api = useMemo(
    () => ({ enterShop, leaveShop, reportShopScene, reportReturnScene }),
    [enterShop, leaveShop, reportReturnScene, reportShopScene],
  );

  return (
    <ShopEntranceContext.Provider value={api}>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.root, contentStyle]} pointerEvents="box-none">
          {children}
        </Animated.View>
        {run ? (
          <ShopDoorway
            key={run.id}
            beat={run.beat}
            reduced={run.reduced}
            origin={run.origin}
            onCovered={onCovered}
            onFinished={onFinished}
          />
        ) : null}
      </View>
    </ShopEntranceContext.Provider>
  );
}

export function useShopEntrance(): ShopEntranceApi {
  const api = useContext(ShopEntranceContext);
  if (!api) {
    throw new Error('useShopEntrance must be used within ShopEntranceProvider');
  }
  return api;
}

/** Portrait layout of the screen the shop returns to. */
export function useShopReturnLayout() {
  const { reportReturnScene } = useShopEntrance();
  return (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    reportReturnScene(height > width && width > 0);
  };
}

const styles = {
  root: { flex: 1 },
} as const;
