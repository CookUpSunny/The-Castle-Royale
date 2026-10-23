import { randomUUID } from "node:crypto";
import {
  SECOND_CHANCE_WINDOW_MS,
  decideInterstitial,
  isPremiumActive,
  reconcileLossCount,
  type MatchMode,
} from "./adRules";
import {
  DuplicateOfferError,
  emptyAdAccount,
  mergePremium,
  type AdAccount,
  type AdStore,
  type SecondChanceOffer,
} from "./store";

export interface Settlement {
  playerId: string;
  gameId: string;
  mode: MatchMode;
  lossCount: number;
  isPremium: boolean;
  interstitialPending: boolean;
  showInterstitial: boolean;
  secondChance: {
    offerId: string;
    nonce: string;
    expiresAt: string;
    granted: boolean;
    status: SecondChanceOffer["status"];
    /** Set only when this loss opened the one Second Chance for a tournament. */
    tournamentId: string | null;
  };
}

export interface LossDeps {
  now: () => Date;
  id?: () => string;
  nonce?: () => string;
}

const defaultDeps: LossDeps = {
  now: () => new Date(),
  id: () => randomUUID(),
  nonce: () => randomUUID().replace(/-/g, ""),
};

function toSettlement(
  account: AdAccount,
  offer: SecondChanceOffer,
  now: Date,
  inTournament: boolean,
): Settlement {
  const isPremium = isPremiumActive(account, now);
  const decision = decideInterstitial({
    isMember: isPremium,
    lossCount: account.adLossCount,
    betweenCompletedMatches: true,
    gameActive: false,
    tournamentRoundActive: inTournament,
    lastShownAtMs: null,
    shownInUtcDay: 0,
    nowMs: now.getTime(),
  });
  return {
    playerId: account.playerId,
    gameId: offer.gameId,
    mode: offer.mode,
    lossCount: account.adLossCount,
    isPremium,
    interstitialPending: decision !== "skip",
    showInterstitial: decision === "show",
    secondChance: {
      offerId: offer.id,
      nonce: offer.nonce,
      expiresAt: offer.expiresAt.toISOString(),
      granted: offer.status === "granted",
      status: offer.status,
      tournamentId: offer.tournamentId,
    },
  };
}

const inflight = new Map<string, Promise<Settlement>>();

export async function recordLoss(
  store: AdStore,
  input: {
    playerId: string;
    gameId: string;
    gameCenterId?: string | null;
    mode: MatchMode;
    tournamentId?: string | null;
  },
  deps: LossDeps = defaultDeps,
): Promise<Settlement> {
  const key = `${input.playerId}:${input.gameId}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const run = recordLossInner(store, input, deps).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, run);
  return run;
}

async function recordLossInner(
  store: AdStore,
  input: {
    playerId: string;
    gameId: string;
    gameCenterId?: string | null;
    mode: MatchMode;
    tournamentId?: string | null;
  },
  deps: LossDeps,
): Promise<Settlement> {
  const now = deps.now();
  const tournamentId = input.tournamentId?.trim() || null;
  const existingOffer = await store.getOfferByPlayerGame(input.playerId, input.gameId);
  let account = await loadAccount(store, input.playerId, input.gameCenterId ?? null, now);

  if (existingOffer) {
    if (existingOffer.status === "pending" && existingOffer.expiresAt.getTime() <= now.getTime()) {
      existingOffer.status = "expired";
      await store.saveOffer(existingOffer);
    }
    return toSettlement(account, existingOffer, now, tournamentId !== null);
  }

  account.adLossCount += 1;
  account.updatedAt = now;
  await store.saveAccount(account);

  const member = isPremiumActive(account, now);
  const priorRedemption = tournamentId
    ? await store.getRedemptionByPlayerTournament(input.playerId, tournamentId)
    : null;
  const opensSecondChance = tournamentId !== null && priorRedemption === null;
  const offer: SecondChanceOffer = {
    id: (deps.id ?? defaultDeps.id!)(),
    playerId: input.playerId,
    gameId: input.gameId,
    tournamentId: opensSecondChance ? tournamentId : null,
    nonce: (deps.nonce ?? defaultDeps.nonce!)(),
    mode: input.mode,
    expiresAt: new Date(now.getTime() + SECOND_CHANCE_WINDOW_MS),
    status: opensSecondChance ? (member ? "granted" : "pending") : "recorded",
    grantSource: opensSecondChance && member ? "premium" : null,
    transactionId: null,
    createdAt: now,
  };

  try {
    await store.insertOffer(offer);
  } catch (err) {
    if (err instanceof DuplicateOfferError) {
      const raced = await store.getOfferByPlayerGame(input.playerId, input.gameId);
      if (raced) return toSettlement(account, raced, now, tournamentId !== null);
    }
    throw err;
  }

  return toSettlement(account, offer, now, tournamentId !== null);
}

async function loadAccount(
  store: AdStore,
  playerId: string,
  gameCenterId: string | null,
  now: Date,
): Promise<AdAccount> {
  let account = (await store.getByPlayerId(playerId)) ?? emptyAdAccount(playerId, now);
  if (gameCenterId) {
    account.gameCenterId = gameCenterId;
    const linked = await store.getByGameCenterId(gameCenterId);
    if (linked && linked.playerId !== account.playerId) {
      mergePremium(account, linked);
    }
  }
  return account;
}

export async function linkAdIdentity(
  store: AdStore,
  input: { playerId: string; gameCenterId?: string | null; revenueCatAppUserId?: string | null },
  now = new Date(),
): Promise<AdAccount> {
  const account = (await store.getByPlayerId(input.playerId)) ?? emptyAdAccount(input.playerId, now);
  if (input.gameCenterId) {
    account.gameCenterId = input.gameCenterId;
    const linked = await store.getByGameCenterId(input.gameCenterId);
    if (linked && linked.playerId !== account.playerId) mergePremium(account, linked);
  }
  if (input.revenueCatAppUserId) {
    const linked = await store.getByRevenueCatAppUserId(input.revenueCatAppUserId);
    if (linked && linked.playerId !== account.playerId) {
      mergePremium(account, linked);
      linked.revenueCatAppUserId = null;
      linked.updatedAt = now;
      await store.saveAccount(linked);
    }
    account.revenueCatAppUserId = input.revenueCatAppUserId;
  }
  account.updatedAt = now;
  await store.saveAccount(account);
  return account;
}

export async function raiseLossCount(
  store: AdStore,
  playerId: string,
  clientCount: number,
  now = new Date(),
): Promise<AdAccount> {
  const account = (await store.getByPlayerId(playerId)) ?? emptyAdAccount(playerId, now);
  account.adLossCount = reconcileLossCount(account.adLossCount, clientCount);
  account.updatedAt = now;
  await store.saveAccount(account);
  return account;
}

export async function resolveSecondChance(
  store: AdStore,
  input: { offerId: string; playerId: string; outcome: "declined" | "expired" },
  now = new Date(),
): Promise<Settlement | null> {
  const offer = await store.getOffer(input.offerId);
  if (!offer || offer.playerId !== input.playerId) return null;
  const account = (await store.getByPlayerId(offer.playerId)) ?? emptyAdAccount(offer.playerId, now);

  if (offer.status === "pending") {
    const timedOut = offer.expiresAt.getTime() <= now.getTime();
    offer.status = timedOut || input.outcome === "expired" ? "expired" : "declined";
    await store.saveOffer(offer);
  }

  return toSettlement(account, offer, now, offer.tournamentId !== null);
}

export async function readSettlement(
  store: AdStore,
  offerId: string,
  playerId: string,
  now = new Date(),
): Promise<Settlement | null> {
  const offer = await store.getOffer(offerId);
  if (!offer || offer.playerId !== playerId) return null;
  if (offer.status === "pending" && offer.expiresAt.getTime() <= now.getTime()) {
    offer.status = "expired";
    await store.saveOffer(offer);
  }
  const account = (await store.getByPlayerId(playerId)) ?? emptyAdAccount(playerId, now);
  return toSettlement(account, offer, now, offer.tournamentId !== null);
}

/**
 * Grant Second Chance after AdMob Server-Side Verification.
 * Returns null when the offer or nonce does not match.
 */
export async function grantSecondChanceFromSsv(
  store: AdStore,
  input: {
    offerId: string;
    nonce: string;
    playerId: string | null;
    transactionId: string;
    grantSource?: "admob_ssv" | "client_fallback";
  },
  now = new Date(),
): Promise<{ settlement: Settlement | null; reason: "granted" | "duplicate" | "expired" | "mismatch" | "missing" }> {
  if (input.transactionId) {
    const prior = await store.getOfferByTransactionId(input.transactionId);
    if (prior) {
      const account = (await store.getByPlayerId(prior.playerId)) ?? emptyAdAccount(prior.playerId, now);
      return { settlement: toSettlement(account, prior, now, prior.tournamentId !== null), reason: "duplicate" };
    }
  }

  const offer = await store.getOffer(input.offerId);
  if (!offer || offer.nonce !== input.nonce) {
    return { settlement: null, reason: "missing" };
  }
  if (input.playerId && input.playerId !== offer.playerId) {
    return { settlement: null, reason: "mismatch" };
  }
  const account = (await store.getByPlayerId(offer.playerId)) ?? emptyAdAccount(offer.playerId, now);
  if (offer.status === "granted") {
    return { settlement: toSettlement(account, offer, now, offer.tournamentId !== null), reason: "duplicate" };
  }
  if (offer.tournamentId === null || offer.status !== "pending" || offer.expiresAt.getTime() <= now.getTime()) {
    if (offer.status === "pending") {
      offer.status = "expired";
      await store.saveOffer(offer);
    }
    return { settlement: toSettlement(account, offer, now, offer.tournamentId !== null), reason: "expired" };
  }

  offer.status = "granted";
  offer.grantSource = input.grantSource ?? "admob_ssv";
  offer.transactionId = input.transactionId;
  await store.saveOffer(offer);
  return { settlement: toSettlement(account, offer, now, true), reason: "granted" };
}

/**
 * Temporary grant used until AdMob Server-Side Verification is saved on the
 * rewarded unit. It can confirm only the one pending tournament offer the
 * server already created. It does not open a second entry. Set ssvEnabled
 * after the callback URL is live so this path stops granting.
 */
export async function grantSecondChanceFromClientFallback(
  store: AdStore,
  input: { offerId: string; nonce: string; playerId: string },
  options: { ssvEnabled: boolean },
  now = new Date(),
): Promise<{
  settlement: Settlement | null;
  reason: "granted" | "duplicate" | "expired" | "mismatch" | "missing" | "ssv_required";
}> {
  if (options.ssvEnabled) {
    return { settlement: null, reason: "ssv_required" };
  }
  return grantSecondChanceFromSsv(
    store,
    {
      offerId: input.offerId,
      nonce: input.nonce,
      playerId: input.playerId,
      transactionId: `fallback:${input.offerId}`,
      grantSource: "client_fallback",
    },
    now,
  );
}
