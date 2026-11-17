import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0 },
});

/**
 * If this binary has not linked the native mask, keep the carousel itself.
 * The scroll padding still holds Jackpot fully on screen.
 */
class MaskBoundary extends React.Component<
  { mask: React.ReactElement; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <View style={styles.fill}>{this.props.children}</View>;
    }
    return this.props.mask;
  }
}

/**
 * Alpha mask so arena tiles fade out at the carousel edges.
 * Opaque mask pixels show the tile; transparent pixels show the nebula behind.
 * The mask view does not take touches — the library also marks it pointerEvents none.
 */
export default function ShopEdgeMask({
  fade,
  children,
}: {
  fade: number;
  children: React.ReactNode;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width: nextW, height: nextH } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === nextW && prev.height === nextH ? prev : { width: nextW, height: nextH }));
  };
  const width = size.width > 0 ? size.width : windowWidth;
  const edge = width > 0 ? Math.min(0.45, fade / width) : 0.05;
  if (size.height <= 0) {
    return (
      <View testID="shop-edge-mask" style={styles.fill} onLayout={onLayout}>
        {children}
      </View>
    );
  }
  return (
    <MaskBoundary
      mask={
        <MaskedView
          testID="shop-edge-mask"
          style={styles.fill}
          onLayout={onLayout}
          maskElement={
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)', 'rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
              locations={[0, edge, 1 - edge, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width, height: size.height }}
            />
          }
        >
          {children}
        </MaskedView>
      }
    >
      {children}
    </MaskBoundary>
  );
}
