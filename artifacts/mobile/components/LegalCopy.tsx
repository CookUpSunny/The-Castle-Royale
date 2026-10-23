import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";

export type LegalDoc = "terms" | "privacy";

const APPLE_EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

export default function LegalCopy({
  doc,
  onClose,
}: {
  doc: LegalDoc;
  onClose: () => void;
}) {
  const title = doc === "privacy" ? "Privacy Policy" : "Terms Of Use";
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Pressable onPress={onClose} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>Close</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {doc === "privacy" ? <PrivacyBody /> : <TermsBody />}
      </ScrollView>
    </View>
  );
}

function PrivacyBody() {
  return (
    <>
      <Text style={styles.p}>
        The Castle Royale is free to play. A membership removes forced ads and unlocks cosmetic arenas, badges, and rewards. It does not change the rules of a match.
      </Text>
      <Text style={styles.p}>
        The game may store a display name on this device, match results, and whether a membership is active. Sign in with Game Center shares that player id with the game server. Purchases are processed by Apple. RevenueCat tells the game which memberships and bundles belong to the signed-in store account.
      </Text>
      <Text style={styles.p}>
        Players without a membership may see ads from Google AdMob between completed matches. If you allow tracking, that identifier is used to show those ads. Members do not see forced ads.
      </Text>
      <Text style={styles.p}>
        Questions can go through the developer website listed on the App Store listing for The Castle Royale.
      </Text>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <Text style={styles.p}>
        Online play for one to four players stays free. High Roller and VIP Year are auto-renewing memberships. Beginner's Luck is a one-time cosmetic bundle. None of these change who wins a match.
      </Text>
      <Text style={styles.p}>
        Payment is charged to your Apple ID at confirmation of purchase. A membership renews automatically unless you cancel at least 24 hours before the end of the current period. Your account is charged for renewal within 24 hours before the period ends. Manage or cancel memberships in your App Store account settings after purchase. Beginner's Luck does not renew.
      </Text>
      <Pressable onPress={() => void WebBrowser.openBrowserAsync(APPLE_EULA)} style={styles.linkBtn}>
        <Text style={styles.link}>Apple Standard EULA</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06281f" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: {
    borderWidth: 1.5,
    borderColor: "#e6c15a",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#0c3a2c",
  },
  backText: { color: "#f0d78c", fontWeight: "800", fontSize: 14 },
  title: { color: "#f7f3e8", fontSize: 18, fontWeight: "800", flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 32, gap: 14 },
  p: { color: "#d5e6dc", fontSize: 15, lineHeight: 22 },
  linkBtn: { alignSelf: "flex-start", paddingVertical: 8 },
  link: { color: "#f0d78c", fontSize: 15, fontWeight: "800", textDecorationLine: "underline" },
});
