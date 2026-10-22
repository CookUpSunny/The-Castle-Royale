import type { MatchMode, Settlement } from '@workspace/monetization';
import { resolveRestApiUrl } from '@/lib/apiUrl';

async function parseJson<T>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export async function fetchAdState(playerId: string): Promise<{ lossCount: number; isPremium: boolean } | null> {
  const res = await fetch(`${resolveRestApiUrl()}/ads/state?playerId=${encodeURIComponent(playerId)}`);
  return parseJson(res);
}

export async function linkAdIdentity(input: {
  playerId: string;
  gameCenterId?: string | null;
  revenueCatAppUserId?: string | null;
}): Promise<void> {
  await fetch(`${resolveRestApiUrl()}/ads/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function reconcileAdLossCount(playerId: string, lossCount: number): Promise<{ lossCount: number; isPremium: boolean } | null> {
  const res = await fetch(`${resolveRestApiUrl()}/ads/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, lossCount }),
  });
  return parseJson(res);
}

export async function reportLoss(input: {
  playerId: string;
  gameId: string;
  gameCenterId?: string | null;
  mode: MatchMode;
}): Promise<Settlement | null> {
  const res = await fetch(`${resolveRestApiUrl()}/ads/losses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(res);
}

export async function fetchSecondChance(offerId: string, playerId: string): Promise<Settlement | null> {
  const res = await fetch(
    `${resolveRestApiUrl()}/ads/second-chance/${encodeURIComponent(offerId)}?playerId=${encodeURIComponent(playerId)}`,
  );
  return parseJson(res);
}

export async function grantUnverifiedSecondChance(
  offerId: string,
  playerId: string,
  nonce: string,
): Promise<Settlement | null> {
  const res = await fetch(`${resolveRestApiUrl()}/ads/second-chance/${encodeURIComponent(offerId)}/test-grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, nonce }),
  });
  return parseJson(res);
}

export async function declineSecondChance(offerId: string, playerId: string): Promise<Settlement | null> {
  const res = await fetch(`${resolveRestApiUrl()}/ads/second-chance/${encodeURIComponent(offerId)}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId }),
  });
  return parseJson(res);
}
