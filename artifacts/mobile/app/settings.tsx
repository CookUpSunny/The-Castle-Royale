import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BackButton from "@/components/BackButton";
import DuoSplit from "@/components/DuoSplit";
import { useMusicPlayer } from "@/contexts/MusicContext";
import { useDuoWindow } from "@/hooks/useDuoWindow";
import { topContentInset } from "@/lib/duoLayout";
import { useSubscription } from "@/lib/revenuecat";
import { Platform } from "react-native";

export default function SettingsScreen() {
  const duo = useDuoWindow();
  const { isMuted, toggleMute } = useMusicPlayer();
  const { restore, isRestoring } = useSubscription();
  const [notice, setNotice] = useState<string | null>(null);
  const version = Constants.expoConfig?.version ?? "1.0.3";
  const top = topContentInset(duo.insets.top, Platform.OS);

  const onRestore = async () => {
    setNotice(null);
    try {
      const info = await restore();
      const active = info.entitlements.active?.premium !== undefined;
      setNotice(active ? "Membership Restored" : "No Active Membership Found On This Apple ID.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Restore failed. Please try again.");
    }
  };

  const controls = (
    <View style={styles.pane}>
      <BackButton label="← Home" onPress={() => router.back()} />
      <Text style={styles.title}>Settings</Text>
      <Pressable onPress={toggleMute} style={styles.row}>
        <Text style={styles.rowLabel}>Sound</Text>
        <Text style={styles.rowValue}>{isMuted ? "Off" : "On"}</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/store")} style={styles.row}>
        <Text style={styles.rowLabel}>Store</Text>
        <Text style={styles.rowValue}>Open</Text>
      </Pressable>
      <Pressable onPress={() => void onRestore()} disabled={isRestoring} style={styles.row}>
        <Text style={styles.rowLabel}>{isRestoring ? "Restoring…" : "Restore Purchases"}</Text>
      </Pressable>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );

  const about = (
    <View style={[styles.pane, styles.about]}>
      <Text style={styles.aboutTitle}>Play Stays Free</Text>
      <Text style={styles.body}>
        Online games for up to four players stay free. Memberships remove forced ads and add cosmetic arenas, badges, and rewards. They do not change the rules.
      </Text>
      <Pressable onPress={() => router.push("/legal?doc=terms")} style={styles.link}>
        <Text style={styles.linkText}>Terms Of Use</Text>
      </Pressable>
      <Pressable onPress={() => router.push("/legal?doc=privacy")} style={styles.link}>
        <Text style={styles.linkText}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.version}>Version {version}</Text>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: top,
          paddingBottom: duo.insets.bottom + 12,
          paddingLeft: duo.insets.left,
          paddingRight: duo.insets.right,
        },
      ]}
    >
      <DuoSplit primary={controls} secondary={about} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07000f" },
  pane: { flex: 1, paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  about: { justifyContent: "center" },
  title: { color: "#ffd700", fontSize: 32, fontWeight: "900", marginBottom: 8 },
  row: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3b1759",
    backgroundColor: "#12042a",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  rowValue: { color: "#f0d78c", fontSize: 15, fontWeight: "700" },
  notice: { color: "#d5e6dc", fontSize: 13, lineHeight: 18 },
  aboutTitle: { color: "#f0d78c", fontSize: 22, fontWeight: "800" },
  body: { color: "#d5c8ea", fontSize: 15, lineHeight: 22 },
  link: { alignSelf: "flex-start", paddingVertical: 4 },
  linkText: { color: "#ffd700", fontSize: 15, fontWeight: "800", textDecorationLine: "underline" },
  version: { color: "#9d7fba", fontSize: 12, marginTop: 8 },
});
