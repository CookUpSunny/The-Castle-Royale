import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  INTERSTITIAL_COOLDOWN_MS,
  decideInterstitial,
  mergeLossCounts,
  reconcileLossCount,
  selectRevenueCatApiKey,
  shouldShowInterstitial,
} from "./index";
import {
  applyRevenueCatEvent,
  decidePremiumChange,
  grantSecondChanceFromClientFallback,
  grantSecondChanceFromSsv,
  linkAdIdentity,
  processAdMobSsv,
  raiseLossCount,
  recordLoss,
  resolveSecondChance,
  webhookAuthorized,
} from "./index";
import { DuplicateOfferError, type AdAccount, type AdStore, type SecondChanceOffer } from "./store";

function memoryStore(): AdStore & { accounts: Map<string, AdAccount>; offers: Map<string, SecondChanceOffer> } {
  const accounts = new Map<string, AdAccount>();
  const offers = new Map<string, SecondChanceOffer>();
  const store: AdStore = {
    async getByPlayerId(playerId) {
      return accounts.get(playerId) ?? null;
    },
    async getByGameCenterId(gameCenterId) {
      for (const account of accounts.values()) {
        if (account.gameCenterId === gameCenterId) return account;
      }
      return null;
    },
    async getByRevenueCatAppUserId(revenueCatAppUserId) {
      for (const account of accounts.values()) {
        if (account.revenueCatAppUserId === revenueCatAppUserId) return account;
      }
      return null;
    },
    async saveAccount(account) {
      accounts.set(account.playerId, { ...account });
    },
    async getOffer(id) {
      return offers.get(id) ?? null;
    },
    async getOfferByPlayerGame(playerId, gameId) {
      for (const offer of offers.values()) {
        if (offer.playerId === playerId && offer.gameId === gameId) return offer;
      }
      return null;
    },
    async getRedemptionByPlayerTournament(playerId, tournamentId) {
      for (const offer of offers.values()) {
        if (offer.playerId === playerId && offer.tournamentId === tournamentId) return offer;
      }
      return null;
    },
    async getOfferByTransactionId(transactionId) {
      for (const offer of offers.values()) {
        if (offer.transactionId === transactionId) return offer;
      }
      return null;
    },
    async insertOffer(offer) {
      for (const existing of offers.values()) {
        if (existing.playerId === offer.playerId && existing.gameId === offer.gameId) {
          throw new DuplicateOfferError();
        }
        if (
          offer.tournamentId &&
          existing.playerId === offer.playerId &&
          existing.tournamentId === offer.tournamentId
        ) {
          throw new DuplicateOfferError();
        }
      }
      offers.set(offer.id, { ...offer });
    },
    async saveOffer(offer) {
      offers.set(offer.id, { ...offer });
    },
  };
  return Object.assign(store, { accounts, offers });
}

test("RevenueCat boots with only the iOS key", () => {
  assert.equal(
    selectRevenueCatApiKey({ platform: "ios", usePreviewKey: false, iosKey: "appl_ios" }),
    "appl_ios",
  );
  assert.equal(
    selectRevenueCatApiKey({ platform: "ios", usePreviewKey: true, iosKey: "appl_ios" }),
    "appl_ios",
  );
  assert.equal(
    selectRevenueCatApiKey({
      platform: "web",
      usePreviewKey: true,
      iosKey: "appl_ios",
      testKey: "test_key",
    }),
    "test_key",
  );
  assert.throws(
    () => selectRevenueCatApiKey({ platform: "android", usePreviewKey: false, iosKey: "appl_ios" }),
    /Android/,
  );
  assert.throws(
    () => selectRevenueCatApiKey({ platform: "ios", usePreviewKey: false }),
    /iOS/,
  );
});

test("interstitial plays on every 3rd loss only between matches", () => {
  const nowMs = 1_000_000;
  const between = {
    isMember: false,
    betweenCompletedMatches: true,
    gameActive: false,
    tournamentRoundActive: false,
    lastShownAtMs: null,
    shownInUtcDay: 0,
    nowMs,
  };
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 2 }), false);
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3 }), true);
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3, isMember: true }), false);
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3, gameActive: true }), false);
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3, tournamentRoundActive: true }), false);
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3, betweenCompletedMatches: false }), false);
  assert.equal(decideInterstitial({ ...between, lossCount: 3, lastShownAtMs: nowMs - 60_000 }), "defer");
  assert.equal(shouldShowInterstitial({ ...between, lossCount: 3, shownInUtcDay: 3 }), false);
  assert.equal(
    shouldShowInterstitial({ ...between, lossCount: 6, lastShownAtMs: nowMs - INTERSTITIAL_COOLDOWN_MS }),
    true,
  );
});

test("loss counts merge upward only", () => {
  assert.equal(mergeLossCounts(2, 5), 5);
  assert.equal(mergeLossCounts(8, 5), 8);
  assert.equal(reconcileLossCount(4, 9), 9);
  assert.equal(reconcileLossCount(4, -1), 4);
  assert.equal(reconcileLossCount(4, 1.5), 4);
});

test("an ordinary loss is counted once and does not offer a rematch", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  const first = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "bot" },
    { now: () => now, id: () => "offer-1", nonce: () => "nonce-1" },
  );
  assert.equal(first.lossCount, 1);
  assert.equal(first.isPremium, false);
  assert.equal(first.secondChance.granted, false);
  assert.equal(first.secondChance.status, "recorded");
  assert.equal(first.secondChance.tournamentId, null);
  assert.equal(first.showInterstitial, false);
  assert.equal(first.interstitialPending, false);

  const again = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "bot" },
    { now: () => now, id: () => "offer-2", nonce: () => "nonce-2" },
  );
  assert.equal(again.lossCount, 1);
  assert.equal(again.secondChance.offerId, "offer-1");
});

test("the 3rd ordinary loss is eligible for an interstitial and is not a Second Chance", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  let n = 0;
  const deps = {
    now: () => now,
    id: () => `offer-${++n}`,
    nonce: () => `nonce-${n}`,
  };
  await recordLoss(store, { playerId: "p1", gameId: "g1", mode: "online" }, deps);
  await recordLoss(store, { playerId: "p1", gameId: "g2", mode: "online" }, deps);
  const third = await recordLoss(store, { playerId: "p1", gameId: "g3", mode: "online" }, deps);
  assert.equal(third.lossCount, 3);
  assert.equal(third.interstitialPending, true);
  assert.equal(third.showInterstitial, true);
  assert.equal(third.secondChance.status, "recorded");
  assert.equal(third.secondChance.granted, false);
});

test("members skip the interstitial and do not get a match redo", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  await applyRevenueCatEvent(store, {
    type: "INITIAL_PURCHASE",
    app_user_id: "gc-1",
    entitlement_ids: ["premium"],
    product_id: "premium_monthly",
    expiration_at_ms: now.getTime() + 86_400_000,
  }, now);
  await linkAdIdentity(store, { playerId: "p1", gameCenterId: "gc-1", revenueCatAppUserId: "gc-1" }, now);

  let n = 0;
  const deps = { now: () => now, id: () => `offer-${++n}`, nonce: () => `n${n}` };
  await recordLoss(store, { playerId: "p1", gameId: "g1", gameCenterId: "gc-1", mode: "bot" }, deps);
  await recordLoss(store, { playerId: "p1", gameId: "g2", gameCenterId: "gc-1", mode: "bot" }, deps);
  const third = await recordLoss(store, { playerId: "p1", gameId: "g3", gameCenterId: "gc-1", mode: "bot" }, deps);
  assert.equal(third.isPremium, true);
  assert.equal(third.lossCount, 3);
  assert.equal(third.secondChance.granted, false);
  assert.equal(third.secondChance.status, "recorded");
  assert.equal(third.showInterstitial, false);
  assert.equal(third.interstitialPending, false);

  const entry = await recordLoss(
    store,
    { playerId: "p1", gameId: "g4", gameCenterId: "gc-1", mode: "bot", tournamentId: "cup" },
    deps,
  );
  assert.equal(entry.secondChance.status, "granted");
  assert.equal(entry.secondChance.tournamentId, "cup");
  assert.equal(entry.showInterstitial, false);
  const secondEntry = await recordLoss(
    store,
    { playerId: "p1", gameId: "g5", gameCenterId: "gc-1", mode: "bot", tournamentId: "cup" },
    deps,
  );
  assert.equal(secondEntry.secondChance.status, "recorded");
  assert.equal(secondEntry.secondChance.tournamentId, null);
});

test("Second Chance is one tournament entry and a missed window is not offered again", async () => {
  const store = memoryStore();
  const start = new Date("2026-06-01T00:00:00Z");
  let n = 0;
  const deps = {
    now: () => start,
    id: () => `offer-${++n}`,
    nonce: () => `n${n}`,
  };
  const first = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "online", tournamentId: "cup" },
    deps,
  );
  assert.equal(first.secondChance.status, "pending");
  assert.equal(first.secondChance.tournamentId, "cup");
  assert.equal(first.secondChance.granted, false);
  assert.equal(first.showInterstitial, false);

  const later = new Date(start.getTime() + 61_000);
  const expired = await resolveSecondChance(
    store,
    { offerId: first.secondChance.offerId, playerId: "p1", outcome: "declined" },
    later,
  );
  assert.equal(expired?.secondChance.status, "expired");

  const secondLoss = await recordLoss(
    store,
    { playerId: "p1", gameId: "g2", mode: "online", tournamentId: "cup" },
    { ...deps, now: () => later },
  );
  assert.equal(secondLoss.lossCount, 2);
  assert.equal(secondLoss.secondChance.status, "recorded");
  assert.equal(secondLoss.secondChance.tournamentId, null);
});

test("AdMob SSV grants one tournament Second Chance and does not replace the interstitial", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  let n = 0;
  const deps = { now: () => now, id: () => `offer-${++n}`, nonce: () => `nonce${n}` };
  const opened = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "bot", tournamentId: "cup" },
    deps,
  );
  assert.equal(opened.secondChance.status, "pending");
  const ordinary = await recordLoss(store, { playerId: "p1", gameId: "g2", mode: "bot" }, deps);
  const notAnOffer = await grantSecondChanceFromSsv(
    store,
    { offerId: ordinary.secondChance.offerId, nonce: ordinary.secondChance.nonce, playerId: "p1", transactionId: "tx-ordinary" },
    now,
  );
  assert.equal(notAnOffer.reason, "expired");
  assert.equal(notAnOffer.settlement?.secondChance.granted, false);
  const third = opened;

  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const custom = `${third.secondChance.offerId}|${third.secondChance.nonce}`;
  const payload = `ad_network=test&ad_unit=1&custom_data=${encodeURIComponent(custom)}&reward_amount=1&reward_item=Second%20Chance&timestamp=1&transaction_id=tx-1&user_id=p1`;
  const signer = createSign("SHA256");
  signer.update(payload);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");
  const query = `${payload}&signature=${signature}&key_id=7`;

  const bad = await processAdMobSsv(store, `${payload}&signature=aaaa&key_id=7`, new Map([["7", pem]]), now);
  assert.equal(bad.httpStatus, 403);

  const ok = await processAdMobSsv(store, query, new Map([["7", pem]]), now);
  assert.equal(ok.httpStatus, 200);
  assert.equal(ok.granted, true);
  assert.equal(ok.settlement?.showInterstitial, false);
  assert.equal(ok.settlement?.secondChance.granted, true);

  const replay = await processAdMobSsv(store, query, new Map([["7", pem]]), now);
  assert.equal(replay.reason, "duplicate");
  assert.equal(replay.granted, false);
});

test("SSV does not grant an offer after the 60 second window", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  const settlement = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "bot", tournamentId: "cup" },
    { now: () => now, id: () => "offer-1", nonce: () => "nonce-1" },
  );
  assert.equal(settlement.secondChance.status, "pending");
  const late = new Date(now.getTime() + 60_001);
  const result = await grantSecondChanceFromSsv(
    store,
    { offerId: settlement.secondChance.offerId, nonce: "nonce-1", playerId: "p1", transactionId: "tx" },
    late,
  );
  assert.equal(result.reason, "expired");
  assert.equal(result.settlement?.secondChance.granted, false);
});

test("RevenueCat webhook mirrors premium and keeps lifetime on subscription expiry", async () => {
  assert.equal(webhookAuthorized("Bearer secret", "Bearer secret"), true);
  assert.equal(webhookAuthorized("Bearer no", "Bearer secret"), false);
  assert.equal(webhookAuthorized(undefined, "Bearer secret"), false);

  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  const granted = await applyRevenueCatEvent(store, {
    type: "NON_RENEWING_PURCHASE",
    app_user_id: "p1",
    entitlement_ids: ["premium"],
    product_id: "premium_lifetime",
    expiration_at_ms: null,
  }, now);
  assert.equal(granted.applied, true);
  assert.equal(granted.isPremium, true);

  const cancelled = decidePremiumChange({
    type: "CANCELLATION",
    entitlement_ids: ["premium"],
    product_id: "premium_monthly",
  });
  assert.equal(cancelled.action, "ignore");

  const expired = await applyRevenueCatEvent(store, {
    type: "EXPIRATION",
    app_user_id: "p1",
    entitlement_ids: ["premium"],
    product_id: "premium_monthly",
    expiration_at_ms: now.getTime(),
  }, now);
  assert.equal(expired.isPremium, true);

  const raised = await raiseLossCount(store, "p1", 4, now);
  assert.equal(raised.adLossCount, 4);
  const notLowered = await raiseLossCount(store, "p1", 1, now);
  assert.equal(notLowered.adLossCount, 4);
});

test("VIP subscriptions grant premium and the unassigned IAPs do not", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  const monthly = await applyRevenueCatEvent(store, {
    type: "INITIAL_PURCHASE",
    app_user_id: "p-monthly",
    product_id: "monthly_high_roller",
    expiration_at_ms: now.getTime() + 86_400_000,
  }, now);
  assert.equal(monthly.applied, true);
  assert.equal(monthly.isPremium, true);

  const yearly = await applyRevenueCatEvent(store, {
    type: "RENEWAL",
    app_user_id: "p-year",
    entitlement_ids: ["premium"],
    product_id: "vip_year",
    expiration_at_ms: now.getTime() + 86_400_000,
  }, now);
  assert.equal(yearly.isPremium, true);

  const beginnersLuck = decidePremiumChange({
    type: "NON_RENEWING_PURCHASE",
    entitlement_ids: ["premium"],
    product_id: "beginner_luck",
    expiration_at_ms: null,
  });
  assert.equal(beginnersLuck.action, "ignore");

  const kingdom = await applyRevenueCatEvent(store, {
    type: "NON_RENEWING_PURCHASE",
    app_user_id: "p-kingdom",
    product_id: "004",
    expiration_at_ms: null,
  }, now);
  assert.equal(kingdom.applied, false);
  assert.equal(kingdom.isPremium, false);

  const expired = await applyRevenueCatEvent(store, {
    type: "EXPIRATION",
    app_user_id: "p-monthly",
    product_id: "monthly_high_roller",
    expiration_at_ms: now.getTime(),
  }, now);
  assert.equal(expired.applied, true);
  assert.equal(expired.isPremium, false);
});

test("the non-SSV fallback grants one tournament offer and stops once SSV is on", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  const opened = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "online", tournamentId: "cup" },
    { now: () => now, id: () => "offer-1", nonce: () => "nonce-1" },
  );
  const blocked = await grantSecondChanceFromClientFallback(
    store,
    { offerId: opened.secondChance.offerId, nonce: "nonce-1", playerId: "p1" },
    { ssvEnabled: true },
    now,
  );
  assert.equal(blocked.reason, "ssv_required");
  assert.equal(blocked.settlement, null);
  assert.equal(store.offers.get("offer-1")?.status, "pending");

  const granted = await grantSecondChanceFromClientFallback(
    store,
    { offerId: opened.secondChance.offerId, nonce: "nonce-1", playerId: "p1" },
    { ssvEnabled: false },
    now,
  );
  assert.equal(granted.reason, "granted");
  assert.equal(granted.settlement?.secondChance.granted, true);
  assert.equal(store.offers.get("offer-1")?.grantSource, "client_fallback");

  const again = await grantSecondChanceFromClientFallback(
    store,
    { offerId: opened.secondChance.offerId, nonce: "nonce-1", playerId: "p1" },
    { ssvEnabled: false },
    now,
  );
  assert.equal(again.reason, "duplicate");

  const ordinary = await recordLoss(
    store,
    { playerId: "p1", gameId: "g2", mode: "online" },
    { now: () => now, id: () => "offer-2", nonce: () => "nonce-2" },
  );
  const refused = await grantSecondChanceFromClientFallback(
    store,
    { offerId: ordinary.secondChance.offerId, nonce: "nonce-2", playerId: "p1" },
    { ssvEnabled: false },
    now,
  );
  assert.equal(refused.reason, "expired");
  assert.equal(refused.settlement?.secondChance.granted, false);
});
