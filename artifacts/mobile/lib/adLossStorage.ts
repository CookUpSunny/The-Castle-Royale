import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeLossCounts } from '@workspace/monetization';

const LOSS_KEY = 'adLossCount';
const SETTLED_KEY = 'adInterstitialSettledThrough';

export async function readLocalLossCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(LOSS_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export async function writeLocalLossCount(count: number): Promise<void> {
  await AsyncStorage.setItem(LOSS_KEY, String(count));
}

export async function readSettledLossCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(SETTLED_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

export async function writeSettledLossCount(count: number): Promise<void> {
  await AsyncStorage.setItem(SETTLED_KEY, String(count));
}

export async function rememberServerLossCount(serverCount: number): Promise<number> {
  const local = await readLocalLossCount();
  const merged = mergeLossCounts(local, serverCount);
  await writeLocalLossCount(merged);
  return merged;
}
