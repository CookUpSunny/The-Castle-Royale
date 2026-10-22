import AsyncStorage from '@react-native-async-storage/async-storage';
import { mergeLossCounts } from '@workspace/monetization';

const LOSS_KEY = 'adLossCount';
const SETTLED_KEY = 'adInterstitialSettledThrough';
const LAST_SHOWN_KEY = 'adInterstitialLastShownAt';
const DAY_KEY = 'adInterstitialUtcDay';
const DAY_COUNT_KEY = 'adInterstitialDayCount';

function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

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

export async function readInterstitialGate(now = Date.now()): Promise<{ lastShownAtMs: number | null; shownInUtcDay: number }> {
  const [lastRaw, day, countRaw] = await Promise.all([
    AsyncStorage.getItem(LAST_SHOWN_KEY),
    AsyncStorage.getItem(DAY_KEY),
    AsyncStorage.getItem(DAY_COUNT_KEY),
  ]);
  const lastParsed = lastRaw ? Number(lastRaw) : NaN;
  const countParsed = countRaw ? Number(countRaw) : 0;
  return {
    lastShownAtMs: Number.isFinite(lastParsed) ? lastParsed : null,
    shownInUtcDay: day === utcDay(now) && Number.isInteger(countParsed) && countParsed > 0 ? countParsed : 0,
  };
}

export async function writeInterstitialShown(now = Date.now()): Promise<void> {
  const gate = await readInterstitialGate(now);
  await AsyncStorage.multiSet([
    [LAST_SHOWN_KEY, String(now)],
    [DAY_KEY, utcDay(now)],
    [DAY_COUNT_KEY, String(gate.shownInUtcDay + 1)],
  ]);
}

export async function rememberServerLossCount(serverCount: number): Promise<number> {
  const local = await readLocalLossCount();
  const merged = mergeLossCounts(local, serverCount);
  await writeLocalLossCount(merged);
  return merged;
}
