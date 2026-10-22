import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { mergeLossCounts, reconcileLossCount, selectRevenueCatApiKey, shouldShowInterstitial } from "./index";
import {
  applyRevenueCatEvent,
  decidePremiumChange,
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

test("interstitial plays on every 3rd loss unless Second Chance was used", () => {
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 2, secondChance: "declined" }), false);
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 3, secondChance: "pending" }), false);
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 3, secondChance: "granted" }), false);
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 3, secondChance: "declined" }), true);
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 3, secondChance: "expired" }), true);
  assert.equal(shouldShowInterstitial({ isPremium: true, lossCount: 3, secondChance: "declined" }), false);
  assert.equal(shouldShowInterstitial({ isPremium: false, lossCount: 6, secondChance: "expired" }), true);
});

test("loss counts merge upward only", () => {
  assert.equal(mergeLossCounts(2, 5), 5);
  assert.equal(mergeLossCounts(8, 5), 8);
  assert.equal(reconcileLossCount(4, 9), 9);
  assert.equal(reconcileLossCount(4, -1), 4);
  assert.equal(reconcileLossCount(4, 1.5), 4);
});

test("free players get one pending Second Chance and a durable loss count", async () => {
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
  assert.equal(first.secondChance.status, "pending");
  assert.equal(first.showInterstitial, false);
  assert.equal(first.interstitialPending, false);
  assert.equal(first.secondChance.expiresAt, new Date(now.getTime() + 60_000).toISOString());

  const again = await recordLoss(
    store,
    { playerId: "p1", gameId: "g1", mode: "bot" },
    { now: () => now, id: () => "offer-2", nonce: () => "nonce-2" },
  );
  assert.equal(again.lossCount, 1);
  assert.equal(again.secondChance.offerId, "offer-1");
});

test("the 3rd loss defers the interstitial until Second Chance is declined", async () => {
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
  assert.equal(third.showInterstitial, false);

  const declined = await resolveSecondChance(
    store,
    { offerId: third.secondChance.offerId, playerId: "p1", outcome: "declined" },
    now,
  );
  assert.ok(declined);
  assert.equal(declined.showInterstitial, true);
  assert.equal(declined.secondChance.status, "declined");
});

test("premium players skip the ad and are granted Second Chance immediately", async () => {
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
  assert.equal(third.secondChance.granted, true);
  assert.equal(third.showInterstitial, false);
  assert.equal(third.interstitialPending, false);
});

test("an expired Second Chance window counts as a decline for the interstitial", async () => {
  const store = memoryStore();
  const start = new Date("2026-06-01T00:00:00Z");
  let n = 0;
  const deps = {
    now: () => start,
    id: () => `offer-${++n}`,
    nonce: () => `n${n}`,
  };
  await recordLoss(store, { playerId: "p1", gameId: "g1", mode: "private" }, deps);
  await recordLoss(store, { playerId: "p1", gameId: "g2", mode: "private" }, deps);
  const third = await recordLoss(store, { playerId: "p1", gameId: "g3", mode: "private" }, deps);
  const later = new Date(start.getTime() + 61_000);
  const expired = await resolveSecondChance(
    store,
    { offerId: third.secondChance.offerId, playerId: "p1", outcome: "declined" },
    later,
  );
  assert.equal(expired?.secondChance.status, "expired");
  assert.equal(expired?.showInterstitial, true);
});

test("AdMob SSV grants Second Chance once and replaces the interstitial", async () => {
  const store = memoryStore();
  const now = new Date("2026-06-01T00:00:00Z");
  let n = 0;
  const deps = { now: () => now, id: () => `offer-${++n}`, nonce: () => `nonce${n}` };
  await recordLoss(store, { playerId: "p1", gameId: "g1", mode: "bot" }, deps);
  await recordLoss(store, { playerId: "p1", gameId: "g2", mode: "bot" }, deps);
  const third = await recordLoss(store, { playerId: "p1", gameId: "g3", mode: "bot" }, deps);

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
    { playerId: "p1", gameId: "g1", mode: "bot" },
    { now: () => now, id: () => "offer-1", nonce: () => "nonce-1" },
  );
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
