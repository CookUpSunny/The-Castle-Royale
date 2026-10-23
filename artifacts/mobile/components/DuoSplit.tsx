import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useDuoWindow } from "@/hooks/useDuoWindow";

interface DuoSplitProps {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  primaryStyle?: StyleProp<ViewStyle>;
  secondaryStyle?: StyleProp<ViewStyle>;
}

/**
 * Compact windows stack both panes. Wide and tall windows keep a dead band
 * on the hinge so controls do not sit on the crease. The band is not pressable.
 */
export default function DuoSplit({
  primary,
  secondary,
  style,
  primaryStyle,
  secondaryStyle,
}: DuoSplitProps) {
  const duo = useDuoWindow();
  const split = duo.mode !== "compact" && secondary != null;

  if (!split) {
    return (
      <View style={[{ flex: 1 }, style]}>
        {primary}
        {secondary}
      </View>
    );
  }

  const vertical = duo.hinge === "vertical";
  return (
    <View style={[{ flex: 1, flexDirection: vertical ? "row" : "column" }, style]}>
      <View style={[{ flex: 1 }, primaryStyle]}>{primary}</View>
      <View
        pointerEvents="none"
        style={vertical ? { width: duo.creaseBand } : { height: duo.creaseBand }}
      />
      <View style={[{ flex: 1 }, secondaryStyle]}>{secondary}</View>
    </View>
  );
}
