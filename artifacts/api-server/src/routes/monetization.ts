import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  ADMOB_VERIFIER_KEYS_URL,
  applyRevenueCatEvent,
  grantSecondChanceFromSsv,
  isPremiumActive,
  linkAdIdentity,
  parseVerifierKeys,
  processAdMobSsv,
  raiseLossCount,
  readRevenueCatEvent,
  readSettlement,
  recordLoss,
  resolveSecondChance,
  webhookAuthorized,
  type MatchMode,
} from "@workspace/monetization";
import { logger } from "../lib/logger";
import { drizzleAdStore } from "../lib/adStore";

const router: IRouter = Router();

const playerIdSchema = z.string().trim().min(1).max(128);
const gameIdSchema = z.string().trim().min(1).max(128);
const modeSchema = z.enum(["bot", "online", "private"]);

const lossBodySchema = z.object({
  playerId: playerIdSchema,
  gameId: gameIdSchema,
  gameCenterId: z.string().trim().min(1).max(128).nullable().optional(),
  mode: modeSchema,
});

const linkBodySchema = z.object({
  playerId: playerIdSchema,
  gameCenterId: z.string().trim().min(1).max(128).nullable().optional(),
  revenueCatAppUserId: z.string().trim().min(1).max(256).nullable().optional(),
});

const reconcileBodySchema = z.object({
  playerId: playerIdSchema,
  lossCount: z.number().int(),
});

const declineBodySchema = z.object({
  playerId: playerIdSchema,
});

let verifierKeyCache: { at: number; keys: Map<string, string> } | null = null;

async function loadVerifierKeys(): Promise<Map<string, string>> {
  if (verifierKeyCache && Date.now() - verifierKeyCache.at < 6 * 60 * 60 * 1000) {
    return verifierKeyCache.keys;
  }
  const response = await fetch(ADMOB_VERIFIER_KEYS_URL, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`AdMob verifier keys failed: ${response.status}`);
  const keys = new Map(parseVerifierKeys(await response.json()).map((key) => [key.keyId, key.pem]));
  verifierKeyCache = { at: Date.now(), keys };
  return keys;
}

router.get("/ads/state", async (req, res) => {
  const playerId = playerIdSchema.safeParse(req.query["playerId"]);
  if (!playerId.success) {
    res.status(400).json({ error: "Invalid playerId" });
    return;
  }
  try {
    const account = await drizzleAdStore.getByPlayerId(playerId.data);
    res.json({
      lossCount: account?.adLossCount ?? 0,
      isPremium: account ? isPremiumActive(account, new Date()) : false,
    });
  } catch (err) {
    logger.error({ err }, "Failed to read ad state");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ads/link", async (req, res) => {
  const parsed = linkBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const account = await linkAdIdentity(drizzleAdStore, parsed.data);
    res.json({
      lossCount: account.adLossCount,
      isPremium: isPremiumActive(account, new Date()),
    });
  } catch (err) {
    logger.error({ err }, "Failed to link ad identity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ads/reconcile", async (req, res) => {
  const parsed = reconcileBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const account = await raiseLossCount(drizzleAdStore, parsed.data.playerId, parsed.data.lossCount);
    res.json({ lossCount: account.adLossCount, isPremium: isPremiumActive(account, new Date()) });
  } catch (err) {
    logger.error({ err }, "Failed to reconcile loss count");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ads/losses", async (req, res) => {
  const parsed = lossBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  try {
    const settlement = await recordLoss(drizzleAdStore, {
      ...parsed.data,
      mode: parsed.data.mode as MatchMode,
    });
    res.json(settlement);
  } catch (err) {
    logger.error({ err }, "Failed to record loss");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ads/second-chance/:offerId", async (req, res) => {
  const offerId = z.string().min(1).max(80).safeParse(req.params["offerId"]);
  const playerId = playerIdSchema.safeParse(req.query["playerId"]);
  if (!offerId.success || !playerId.success) {
    res.status(400).json({ error: "Invalid offer lookup" });
    return;
  }
  try {
    const settlement = await readSettlement(drizzleAdStore, offerId.data, playerId.data);
    if (!settlement) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    res.json(settlement);
  } catch (err) {
    logger.error({ err }, "Failed to read Second Chance offer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ads/second-chance/:offerId/decline", async (req, res) => {
  const offerId = z.string().min(1).max(80).safeParse(req.params["offerId"]);
  const parsed = declineBodySchema.safeParse(req.body);
  if (!offerId.success || !parsed.success) {
    res.status(400).json({ error: "Invalid decline" });
    return;
  }
  try {
    const settlement = await resolveSecondChance(drizzleAdStore, {
      offerId: offerId.data,
      playerId: parsed.data.playerId,
      outcome: "declined",
    });
    if (!settlement) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    res.json(settlement);
  } catch (err) {
    logger.error({ err }, "Failed to decline Second Chance");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Dev-only grant for Google's test ad units, which cannot call this server's SSV URL.
 * Production must leave ADMOB_ALLOW_UNVERIFIED_REWARDS unset.
 */
router.post("/ads/second-chance/:offerId/test-grant", async (req, res) => {
  if (process.env["ADMOB_ALLOW_UNVERIFIED_REWARDS"] !== "true") {
    res.status(403).json({ error: "Unverified rewards are disabled" });
    return;
  }
  const offerId = z.string().min(1).max(80).safeParse(req.params["offerId"]);
  const parsed = z
    .object({ playerId: playerIdSchema, nonce: z.string().min(1).max(80) })
    .safeParse(req.body);
  if (!offerId.success || !parsed.success) {
    res.status(400).json({ error: "Invalid test grant" });
    return;
  }
  try {
    const result = await grantSecondChanceFromSsv(drizzleAdStore, {
      offerId: offerId.data,
      nonce: parsed.data.nonce,
      playerId: parsed.data.playerId,
      transactionId: `unverified:${offerId.data}`,
    });
    if (!result.settlement) {
      res.status(404).json({ error: "Offer not found" });
      return;
    }
    res.json(result.settlement);
  } catch (err) {
    logger.error({ err }, "Failed to grant unverified Second Chance");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** AdMob rewarded Server-Side Verification callback. Configure this URL in the AdMob console. */
router.get("/ads/ssv", async (req, res) => {
  const query = req.originalUrl.split("?")[1] ?? "";
  try {
    const keys = await loadVerifierKeys();
    const result = await processAdMobSsv(drizzleAdStore, query, keys);
    if (result.reason === "bad_signature" || result.reason === "malformed" || result.reason === "unknown_key") {
      logger.warn({ reason: result.reason }, "Rejected AdMob SSV callback");
    } else {
      logger.info({ reason: result.reason, granted: result.granted }, "AdMob SSV callback");
    }
    res.status(result.httpStatus).json({ ok: result.httpStatus === 200, granted: result.granted, reason: result.reason });
  } catch (err) {
    logger.error({ err }, "AdMob SSV callback failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/webhooks/revenuecat", async (req, res) => {
  const expected = process.env["REVENUECAT_WEBHOOK_AUTHORIZATION"];
  if (!expected) {
    res.status(503).json({ error: "RevenueCat webhook is not configured" });
    return;
  }
  if (!webhookAuthorized(req.header("authorization") ?? undefined, expected)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const event = readRevenueCatEvent(req.body);
  if (!event || (!event.app_user_id && !event.original_app_user_id)) {
    res.status(400).json({ error: "Invalid webhook body" });
    return;
  }
  try {
    const result = await applyRevenueCatEvent(drizzleAdStore, event);
    logger.info({ playerId: result.playerId, applied: result.applied, type: event.type }, "RevenueCat webhook");
    res.json({ ok: true, applied: result.applied });
  } catch (err) {
    logger.error({ err }, "RevenueCat webhook failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
