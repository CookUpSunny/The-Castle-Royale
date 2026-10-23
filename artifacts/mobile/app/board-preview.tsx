import { Redirect } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CardBack } from "@/components/Card";
import DuoSplit from "@/components/DuoSplit";
import SceneBackground from "@/components/SceneBackground";
import { useDuoWindow } from "@/hooks/useDuoWindow";
import { topContentInset } from "@/lib/duoLayout";
import { Platform } from "react-native";

/**
 * Static match frame used to check Duo sizes. The live board in GameLandscape
 * uses the same hinge split. This route does not start a match.
 */
export default function BoardPreviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <BoardFrame />;
}

function BoardFrame() {
  const duo = useDuoWindow();
  const top = topContentInset(duo.insets.top, Platform.OS);
  const table = (
    <View style={[styles.pane, { paddingTop: 12 }]}>
      <Text style={styles.label}>Opponent</Text>
      <View style={styles.row}>
        <CardBack size="sm" />
        <CardBack size="sm" />
        <CardBack size="sm" />
      </View>
      <View style={styles.pile}>
        <Text style={styles.pileLabel}>Discard</Text>
        <CardBack size="md" />
      </View>
      <Text style={styles.label}>Your Hand</Text>
      <View style={styles.row}>
        <CardBack size="sm" />
        <CardBack size="sm" />
        <CardBack size="sm" />
        <CardBack size="sm" />
      </View>
    </View>
  );
  const actions = (
    <View style={[styles.pane, styles.actions]}>
      <Text style={styles.turn}>Your Turn</Text>
      <View style={styles.actionBtn}>
        <Text style={styles.actionText}>Pickup</Text>
      </View>
      <View style={styles.draw}>
        <CardBack size="sm" />
        <Text style={styles.label}>Draw</Text>
      </View>
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: top,
          paddingBottom: duo.insets.bottom,
          paddingLeft: duo.insets.left,
          paddingRight: duo.insets.right,
        },
      ]}
    >
      <SceneBackground />
      <DuoSplit primary={table} secondary={actions} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#07000f" },
  pane: { flex: 1, alignItems: "center", justifyContent: "space-evenly", paddingHorizontal: 8 },
  actions: { justifyContent: "center", gap: 18 },
  label: { color: "#f0d78c", fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  row: { flexDirection: "row", gap: 6, justifyContent: "center" },
  pile: { alignItems: "center", gap: 6 },
  pileLabel: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  turn: { color: "#ffd700", fontSize: 20, fontWeight: "900" },
  actionBtn: {
    minWidth: 140,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0d78c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  actionText: { color: "#1a1404", fontWeight: "900", fontSize: 16 },
  draw: { alignItems: "center", gap: 6 },
});
