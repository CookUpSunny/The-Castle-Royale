import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LegalCopy, { type LegalDoc } from "@/components/LegalCopy";

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ doc?: string }>();
  const doc: LegalDoc = params.doc === "privacy" ? "privacy" : "terms";
  return (
    <View style={{ flex: 1, backgroundColor: "#06281f", paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <LegalCopy doc={doc} onClose={() => router.back()} />
    </View>
  );
}
