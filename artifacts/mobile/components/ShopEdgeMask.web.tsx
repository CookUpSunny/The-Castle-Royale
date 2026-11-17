import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Web stand-in for the native alpha mask. The masked-view package's web
 * build drops the children, so the fade is a CSS mask on the carousel viewport.
 * It does not add an overlay, so scrolling stays on the ScrollView.
 */
export default function ShopEdgeMask({
  fade,
  children,
}: {
  fade: number;
  children: React.ReactNode;
}) {
  const ref = useRef<View>(null);
  useEffect(() => {
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || !('style' in node)) return;
    const mask = `linear-gradient(to right, rgba(0,0,0,0) 0px, rgba(0,0,0,1) ${fade}px, rgba(0,0,0,1) calc(100% - ${fade}px), rgba(0,0,0,0) 100%)`;
    node.style.setProperty('mask-image', mask);
    node.style.setProperty('-webkit-mask-image', mask);
    node.style.setProperty('mask-size', '100% 100%');
    node.style.setProperty('-webkit-mask-size', '100% 100%');
    node.style.setProperty('mask-repeat', 'no-repeat');
    node.style.setProperty('-webkit-mask-repeat', 'no-repeat');
    node.style.setProperty('mask-mode', 'alpha');
  }, [fade]);
  return (
    <View ref={ref} testID="shop-edge-mask" style={styles.fill}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minWidth: 0, overflow: 'hidden' },
});
