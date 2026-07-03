import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArenaBackground from '@/components/ArenaBackground';
import { useSubscription } from '@/lib/revenuecat';
import { useColors } from '@/hooks/useColors';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional context copy, e.g. "Unlock Spectate mode" or "Unlock this arena". */
  featureLabel?: string;
}

const PERKS = [
  '🎴  Unlock every premium card skin',
  '🏟️  Unlock every premium arena',
  '✦  Support ongoing development of Castle Royale',
];

/**
 * Full-screen paywall shown when a user taps a premium feature (a 👑 arena
 * or a 👑 card skin) without an active subscription. Price and product
 * details are always pulled live from RevenueCat — never hardcoded.
 */
export default function PaywallModal({ visible, onClose, featureLabel }: PaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isLoading } = useSubscription();
  const [error, setError] = useState<string | null>(null);

  const currentOffering = offerings?.current;
  const packageToPurchase = currentOffering?.availablePackages[0];
  const priceString = packageToPurchase?.product.priceString ?? '—';
  const productTitle = packageToPurchase?.product.title || 'Castle Royale Premium';

  const handlePurchase = async () => {
    if (!packageToPurchase) {
      setError('Subscription unavailable right now. Please try again later.');
      return;
    }
    setError(null);
    Haptics.selectionAsync().catch(() => {});
    try {
      await purchase(packageToPurchase);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      if (!message.toLowerCase().includes('cancel')) {
        setError(message);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    }
  };

  const handleRestore = async () => {
    setError(null);
    Haptics.selectionAsync().catch(() => {});
    try {
      const info = await restore();
      const restored = info.entitlements.active?.premium !== undefined;
      if (restored) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onClose();
      } else {
        setError('No active subscription found for this account.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Restore failed. Please try again.';
      setError(message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ArenaBackground arenaOverride="royal" />
        </View>
        <View style={styles.scrim} pointerEvents="none" />

        <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: colors.neonPurple }]}>
          <Text style={[styles.closeText, { color: colors.neonGold }]}>✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <Text style={[styles.kicker, { color: colors.neonPurple }]}>✦  CASTLE ROYALE PREMIUM  ✦</Text>
          <Text style={[styles.title, { color: colors.neonGold }]}>GO PREMIUM</Text>
          {featureLabel ? (
            <Text style={[styles.featureLabel, { color: colors.foreground }]}>{featureLabel}</Text>
          ) : null}

          <View style={styles.perksList}>
            {PERKS.map((perk) => (
              <Text key={perk} style={[styles.perk, { color: colors.foreground }]}>
                {perk}
              </Text>
            ))}
          </View>

          <View style={[styles.priceCard, { borderColor: colors.neonGold, backgroundColor: '#1a053590' }]}>
            <Text style={[styles.productTitle, { color: colors.foreground }]}>{productTitle}</Text>
            {isLoading ? (
              <ActivityIndicator color={colors.neonGold} style={{ marginVertical: 8 }} />
            ) : (
              <Text style={[styles.price, { color: colors.neonGold }]}>
                {priceString}
                <Text style={[styles.priceSuffix, { color: colors.mutedForeground }]}> / month</Text>
              </Text>
            )}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handlePurchase}
            disabled={isPurchasing || isLoading || !packageToPurchase}
            style={({ pressed }) => [styles.subscribeOuter, (pressed || isPurchasing) && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={['#f5e070', '#d4a820', '#f5e070']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscribePill}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#1a0e00" />
              ) : (
                <Text style={styles.subscribeText}>SUBSCRIBE NOW</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
              {isRestoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </Pressable>

          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            Subscription auto-renews monthly and can be cancelled anytime from your App Store account settings.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07000f',
    paddingHorizontal: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,0,15,0.72)',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: '#1a0535aa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '900',
  },
  scrollBody: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 32,
    gap: 6,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    marginBottom: 4,
  },
  featureLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  perksList: {
    width: '100%',
    gap: 12,
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  perk: {
    fontSize: 14,
    lineHeight: 20,
  },
  priceCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '900',
  },
  priceSuffix: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  subscribeOuter: {
    width: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
    marginTop: 4,
  },
  subscribePill: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  subscribeText: {
    color: '#1a0e00',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
  },
  restoreBtn: {
    marginTop: 18,
    padding: 8,
  },
  restoreText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footnote: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
});
