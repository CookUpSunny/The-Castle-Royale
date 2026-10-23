import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { classifyDuoWindow, type DuoLayout } from "@/lib/duoLayout";

export function useDuoWindow(): DuoLayout & {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
} {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return { width, height, insets, ...classifyDuoWindow(width, height) };
}
