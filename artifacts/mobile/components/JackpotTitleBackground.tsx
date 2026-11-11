import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { jackpotArenaHtml } from '@/components/jackpotArenaHtml';
import { jackpotArenaLandscapeHtml } from '@/components/jackpotArenaLandscapeHtml';

/**
 * JackpotTitleBackground — animated green/gold "JACKPOT" title arena.
 *
 * Self-contained WebGL effect (art + settings baked in) rendered in a WebView, following
 * the same pattern as SceneBackground's MATRIX_HTML. Orientation-aware: the portrait arena
 * (spinning ticker ring) upright, auto-swapping to the landscape arena (counter-rotating
 * suit rings) when the device is rotated — mirroring SceneBackground's portrait/landscape
 * variant selection via useWindowDimensions.
 *
 * Internals: a measured-frame-time render governor caps the effect at 60fps, scales
 * resolution and quality down under load and back up with headroom, and pauses when
 * offscreen/backgrounded. WebGL context loss (normal on iOS under heat/memory pressure) is
 * recovered automatically. DPR capped at 2 for smooth 60fps on phones.
 *
 * Usage (as a full-screen background behind the title UI):
 *   const jackpot = useRef<JackpotTitleBackgroundRef>(null);
 *   <JackpotTitleBackground ref={jackpot} />
 *   // ...on a win:
 *   jackpot.current?.jackpot();
 */
export interface JackpotTitleBackgroundRef {
  /** Fire the win celebration burst (works in whichever orientation is showing). */
  jackpot: () => void;
}

interface JackpotTitleBackgroundProps {
  style?: ViewStyle | ViewStyle[];
  /** Allow touches to reach the arena (default false = pass-through background). */
  interactive?: boolean;
  /** Force an orientation instead of auto-detecting from screen dimensions. */
  orientation?: 'auto' | 'portrait' | 'landscape';
}

const JackpotTitleBackground = forwardRef<JackpotTitleBackgroundRef, JackpotTitleBackgroundProps>(
  function JackpotTitleBackground({ style, interactive = false, orientation = 'auto' }, ref) {
    const webRef = useRef<WebView>(null);
    const { width, height } = useWindowDimensions();

    const isLandscape = useMemo(
      () => orientation === 'landscape' || (orientation === 'auto' && width > height),
      [orientation, width, height],
    );

    useImperativeHandle(
      ref,
      () => ({
        jackpot: () => {
          webRef.current?.injectJavaScript(
            'window.castleJackpot && window.castleJackpot(); true;',
          );
        },
      }),
      [],
    );

    return (
      <View
        pointerEvents={interactive ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, style]}
      >
        <WebView
          // key forces a clean remount (fresh WebGL context) on orientation change
          key={isLandscape ? 'land' : 'port'}
          ref={webRef}
          source={{ html: isLandscape ? jackpotArenaLandscapeHtml : jackpotArenaHtml, baseUrl: '' }}
          style={styles.web}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled={false}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
        />
      </View>
    );
  },
);

export default JackpotTitleBackground;

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});
