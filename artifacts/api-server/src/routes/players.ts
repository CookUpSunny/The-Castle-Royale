import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyGameCenterIdentity } from "../lib/gamecenter.js";

const router: IRouter = Router();

const BUNDLE_ID =
  process.env["GC_BUNDLE_ID"] ?? "com.thecastleroyale.app";

const syncBodySchema = z.object({
  gameCenterId: z.string().min(1),
  displayName: z.string().min(1),
  // Identity verification bundle — required to prevent spoofed Game Center IDs
  publicKeyUrl: z.string().url(),
  signature: z.string().min(1),
  salt: z.string().min(1),
  timestamp: z.number().int().positive(),
});

router.post("/players/sync", async (req, res) => {
  const parsed = syncBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { gameCenterId, displayName, publicKeyUrl, signature, salt, timestamp } =
    parsed.data;

  // Cryptographically verify the Game Center identity before trusting the ID.
  const verified = await verifyGameCenterIdentity(
    { playerId: gameCenterId, publicKeyUrl, signature, salt, timestamp },
    BUNDLE_ID,
  );

  if (!verified) {
    req.log.warn({ gameCenterId }, "GC identity verification failed");
    res.status(401).json({ error: "Game Center identity verification failed" });
    return;
  }

  try {
    const [player] = await db
      .insert(playersTable)
      .values({ gameCenterId, displayName })
      .onConflictDoUpdate({
        target: playersTable.gameCenterId,
        set: { displayName },
      })
      .returning();

    res.json(player);
  } catch (err) {
    req.log.error({ err }, "Failed to sync player");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/players/:gameCenterId", async (req, res) => {
  const gameCenterId = req.params["gameCenterId"];
  if (!gameCenterId) {
    res.status(400).json({ error: "Missing gameCenterId" });
    return;
  }

  try {
    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.gameCenterId, gameCenterId))
      .limit(1);

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    res.json(player);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch player");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
