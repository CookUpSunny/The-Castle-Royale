import { router } from "expo-router";
import React from "react";
import PaywallScreen from "@/components/PaywallScreen";

export default function StoreScreen() {
  return <PaywallScreen onClose={() => router.back()} />;
}
