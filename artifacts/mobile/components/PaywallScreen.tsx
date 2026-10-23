import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import {
  paywallRole,
  paywallSortRank,
  type PaywallRole,
} from "@workspace/monetization/client";
import DuoSplit from "@/components/DuoSplit";
import LegalCopy, { type LegalDoc } from "@/components/LegalCopy";
import { useDuoWindow } from "@/hooks/useDuoWindow";
import { useSubscription } from "@/lib/revenuecat";

const HERO = require("../assets/images/paywall-hero.jpg") as number;

interface PaywallScreenProps {
  onClose: () => void;
  featureLabel?: string;
}

interface PlanView {
  key: string;
  role: Exclude<PaywallRole, "hidden">;
  title: string;
  period: string;
  detail: string;
  priceLabel: string;
  storeTitle: string;
  purchasable: boolean;
  pkg?: PurchasesPackage;
}

const ROLE_COPY: Record<Exclude<PaywallRole, "hidden">, { title: string; period: string; detail: string }> = {
  vip_year: {
    title: "VIP Year",
    period: "Billed Yearly",
    detail: "No Ads, Exclusive Arenas, Badges And Rewards",
  },
  high_roller: {
    title: "High Roller",
    period: "Billed Monthly",
    detail: "No Ads, Exclusive Arenas, Badges And Rewards",
  },
  beginner_luck: {
    title: "Beginner's Luck",
    period: "One-Time Purchase",
    detail: "Cosmetic Starter Bundle. Yours To Keep",
  },
};

const SHELLS: PlanView[] = (["vip_year", "high_roller", "beginner_luck"] as const).map((role) => ({
  key: role,
  role,
  title: ROLE_COPY[role].title,
  period: ROLE_COPY[role].period,
  detail: ROLE_COPY[role].detail,
  priceLabel: "App Store Price",
  storeTitle: "",
  purchasable: false,
}));

function plansFromPackages(packages: PurchasesPackage[]): PlanView[] {
  const plans: PlanView[] = [];
  for (const pkg of packages) {
    const role = paywallRole(pkg.product.identifier);
    if (role === "hidden") continue;
    const copy = ROLE_COPY[role];
    const price = pkg.product.priceString?.trim() ?? "";
    plans.push({
      key: pkg.identifier,
      role,
      title: copy.title,
      period: copy.period,
      detail: copy.detail,
      priceLabel: price || "Price Unavailable",
      storeTitle: pkg.product.title?.trim() ?? "",
      purchasable: price.length > 0,
      pkg,
    });
  }
  return plans.sort((a, b) => paywallSortRank(a.role) - paywallSortRank(b.role));
}

export default function PaywallScreen({ onClose, featureLabel }: PaywallScreenProps) {
  const duo = useDuoWindow();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isLoading } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const livePlans = useMemo(
    () => plansFromPackages(offerings?.current?.availablePackages ?? []),
    [offerings],
  );
  const storeReady = livePlans.length > 0;
  const plans = storeReady ? livePlans : SHELLS;

  const handlePurchase = async (plan: PlanView) => {
    if (!plan.pkg || !plan.purchasable) return;
    setError(null);
    Haptics.selectionAsync().catch(() => {});
    try {
      await purchase(plan.pkg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed. Please try again.";
      if (!message.toLowerCase().includes("cancel")) {
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
        setError("No Active Membership Found On This Apple ID.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed. Please try again.");
    }
  };

  if (legal) {
    return (
      <View style={[styles.root, { paddingTop: duo.insets.top, paddingBottom: duo.insets.bottom }]}>
        <LegalCopy doc={legal} onClose={() => setLegal(null)} />
      </View>
    );
  }

  const plansPane = (
    <View style={styles.plansPane}>
      <View style={styles.plansHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Membership</Text>
          <Text style={styles.heading}>The Castle Royale</Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollBody, { paddingBottom: duo.insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.freeLine}>Play Stays Free, including online games for up to four players.</Text>
        {featureLabel ? <Text style={styles.feature}>{featureLabel}</Text> : null}

        <View style={styles.perkRow}>
          {["No Ads", "Exclusive Arenas", "Badges And Rewards", "Same Rules"].map((perk) => (
            <View key={perk} style={styles.perkChip}>
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#f0d78c" style={{ marginVertical: 20 }} />
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              disabled={!plan.purchasable || isPurchasing}
              onPress={() => void handlePurchase(plan)}
            />
          ))
        )}

        {!storeReady && !isLoading ? (
          <Text style={styles.note}>Prices appear when the App Store is available. No amount is shown until then.</Text>
        ) : null}

        <View style={styles.laterCard}>
          <Text style={styles.laterKicker}>Coming Later</Text>
          <Text style={styles.laterTitle}>Royal Collection</Text>
          <Text style={styles.note}>A cosmetic bundle. It will use an App Store price when it is ready.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {isPurchasing ? <ActivityIndicator color="#f0d78c" style={{ marginTop: 8 }} /> : null}

        <Pressable onPress={() => void handleRestore()} disabled={isRestoring} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>{isRestoring ? "Restoring…" : "Restore Purchases"}</Text>
        </Pressable>

        <View style={styles.legalRow}>
          <Pressable onPress={() => setLegal("terms")} hitSlop={8}>
            <Text style={styles.legalLink}>Terms Of Use</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => setLegal("privacy")} hitSlop={8}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Pressable>
        </View>

        <Text style={styles.legalBody}>
          Payment is charged to your Apple ID at confirmation of purchase. High Roller and VIP Year renew automatically unless you cancel at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the period ends. Manage or cancel memberships in App Store account settings. Beginner's Luck is a one-time purchase and does not renew. Memberships do not change match rules.
        </Text>
      </ScrollView>
    </View>
  );

  const heroHeight = duo.height < 700 ? 112 : Math.min(200, Math.max(140, duo.height * 0.32));
  const art = (
    <View style={duo.mode === "compact" ? { height: heroHeight } : styles.artFill}>
      <Image source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" />
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: duo.mode === "compact" ? 0 : duo.insets.top,
          paddingLeft: duo.insets.left,
          paddingRight: duo.insets.right,
        },
      ]}
    >
      {duo.mode === "compact" ? (
        <View style={{ flex: 1, minHeight: 0, paddingTop: duo.insets.top }}>
          {art}
          {plansPane}
        </View>
      ) : (
        <DuoSplit primary={art} secondary={plansPane} primaryStyle={styles.artPane} />
      )}
    </View>
  );
}

function PlanCard({
  plan,
  disabled,
  onPress,
}: {
  plan: PlanView;
  disabled: boolean;
  onPress: () => void;
}) {
  const best = plan.role === "vip_year";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        best && styles.cardBest,
        (pressed || disabled) && styles.cardDim,
      ]}
    >
      {best ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Best Value</Text>
        </View>
      ) : null}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{plan.title}</Text>
          <Text style={styles.cardPeriod}>{plan.period}</Text>
        </View>
        <Text style={styles.price} adjustsFontSizeToFit numberOfLines={1}>
          {plan.priceLabel}
        </Text>
      </View>
      {plan.storeTitle ? <Text style={styles.storeTitle}>{plan.storeTitle}</Text> : null}
      <Text style={styles.cardDetail}>{plan.detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06281f" },
  artFill: { flex: 1, overflow: "hidden" },
  artPane: { overflow: "hidden", borderRadius: 0 },
  plansPane: { flex: 1, minHeight: 0, backgroundColor: "#06281f" },
  plansHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  kicker: {
    color: "#e6c15a",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heading: { color: "#f7f3e8", fontSize: 22, fontWeight: "800", marginTop: 2 },
  closeBtn: {
    borderWidth: 1.5,
    borderColor: "#e6c15a",
    backgroundColor: "#0c3a2c",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeText: { color: "#f0d78c", fontWeight: "800", fontSize: 15 },
  scroll: { flex: 1, minHeight: 0 },
  scrollBody: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  freeLine: { color: "#d5e6dc", fontSize: 14, lineHeight: 20 },
  feature: { color: "#f0d78c", fontSize: 13, fontStyle: "italic" },
  perkRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  perkChip: {
    backgroundColor: "#0c3a2c",
    borderColor: "#1f6a52",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  perkText: { color: "#f7f3e8", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#0c3a2c",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#1f6a52",
    padding: 14,
    gap: 4,
  },
  cardBest: {
    borderColor: "#e6c15a",
    borderWidth: 2,
    backgroundColor: "#114233",
  },
  cardDim: { opacity: 0.92 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e6c15a",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  badgeText: { color: "#1a1404", fontSize: 11, fontWeight: "800" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { color: "#f7f3e8", fontSize: 18, fontWeight: "800" },
  cardPeriod: { color: "#b7cfc4", fontSize: 12, marginTop: 2 },
  price: { color: "#f0d78c", fontSize: 18, fontWeight: "800", maxWidth: "46%", textAlign: "right" },
  storeTitle: { color: "#8eaea0", fontSize: 11 },
  cardDetail: { color: "#d5e6dc", fontSize: 13, lineHeight: 18 },
  note: { color: "#b7cfc4", fontSize: 12, lineHeight: 17 },
  laterCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f6a52",
    padding: 14,
    gap: 4,
    opacity: 0.9,
  },
  laterKicker: { color: "#e6c15a", fontSize: 11, fontWeight: "800" },
  laterTitle: { color: "#f7f3e8", fontSize: 16, fontWeight: "800" },
  error: { color: "#f0a8a0", fontSize: 13, textAlign: "center" },
  restoreBtn: { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 8 },
  restoreText: { color: "#f0d78c", fontSize: 15, fontWeight: "800", textDecorationLine: "underline" },
  legalRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  legalLink: { color: "#f0d78c", fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  legalDot: { color: "#8eaea0" },
  legalBody: { color: "#8eaea0", fontSize: 11, lineHeight: 16, textAlign: "center" },
});
