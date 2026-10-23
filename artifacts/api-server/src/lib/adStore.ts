import { db } from "@workspace/db";
import { adAccountsTable, secondChanceOffersTable } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import {
  DuplicateOfferError,
  type AdAccount,
  type AdStore,
  type SecondChanceOffer,
  type MatchMode,
  type OfferStatus,
} from "@workspace/monetization";

function isUniqueViolation(err: unknown): boolean {
  const candidates = [err, err && typeof err === "object" && "cause" in err ? err.cause : undefined];
  return candidates.some((item) => !!item && typeof item === "object" && "code" in item && item.code === "23505");
}

function mapAccount(row: typeof adAccountsTable.$inferSelect): AdAccount {
  return {
    playerId: row.playerId,
    gameCenterId: row.gameCenterId,
    adLossCount: row.adLossCount,
    premiumLifetime: row.premiumLifetime,
    premiumExpiresAt: row.premiumExpiresAt,
    revenueCatAppUserId: row.revenueCatAppUserId,
    updatedAt: row.updatedAt,
  };
}

function mapOffer(row: typeof secondChanceOffersTable.$inferSelect): SecondChanceOffer {
  return {
    id: row.id,
    playerId: row.playerId,
    gameId: row.gameId,
    tournamentId: row.tournamentId,
    nonce: row.nonce,
    mode: row.mode as MatchMode,
    expiresAt: row.expiresAt,
    status: row.status as OfferStatus,
    grantSource:
      row.grantSource === "premium" || row.grantSource === "admob_ssv" || row.grantSource === "client_fallback"
        ? row.grantSource
        : null,
    transactionId: row.transactionId,
    createdAt: row.createdAt,
  };
}

export const drizzleAdStore: AdStore = {
  async getByPlayerId(playerId) {
    const [row] = await db.select().from(adAccountsTable).where(eq(adAccountsTable.playerId, playerId)).limit(1);
    return row ? mapAccount(row) : null;
  },
  async getByGameCenterId(gameCenterId) {
    const [row] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.gameCenterId, gameCenterId))
      .limit(1);
    return row ? mapAccount(row) : null;
  },
  async getByRevenueCatAppUserId(revenueCatAppUserId) {
    const [row] = await db
      .select()
      .from(adAccountsTable)
      .where(eq(adAccountsTable.revenueCatAppUserId, revenueCatAppUserId))
      .limit(1);
    return row ? mapAccount(row) : null;
  },
  async saveAccount(account) {
    await db
      .insert(adAccountsTable)
      .values(account)
      .onConflictDoUpdate({
        target: adAccountsTable.playerId,
        set: {
          gameCenterId: account.gameCenterId,
          adLossCount: account.adLossCount,
          premiumLifetime: account.premiumLifetime,
          premiumExpiresAt: account.premiumExpiresAt,
          revenueCatAppUserId: account.revenueCatAppUserId,
          updatedAt: account.updatedAt,
        },
      });
  },
  async getOffer(id) {
    const [row] = await db
      .select()
      .from(secondChanceOffersTable)
      .where(eq(secondChanceOffersTable.id, id))
      .limit(1);
    return row ? mapOffer(row) : null;
  },
  async getOfferByPlayerGame(playerId, gameId) {
    const [row] = await db
      .select()
      .from(secondChanceOffersTable)
      .where(and(eq(secondChanceOffersTable.playerId, playerId), eq(secondChanceOffersTable.gameId, gameId)))
      .limit(1);
    return row ? mapOffer(row) : null;
  },
  async getRedemptionByPlayerTournament(playerId, tournamentId) {
    const [row] = await db
      .select()
      .from(secondChanceOffersTable)
      .where(
        and(eq(secondChanceOffersTable.playerId, playerId), eq(secondChanceOffersTable.tournamentId, tournamentId)),
      )
      .limit(1);
    return row ? mapOffer(row) : null;
  },
  async getOfferByTransactionId(transactionId) {
    const [row] = await db
      .select()
      .from(secondChanceOffersTable)
      .where(eq(secondChanceOffersTable.transactionId, transactionId))
      .limit(1);
    return row ? mapOffer(row) : null;
  },
  async insertOffer(offer) {
    try {
      await db.insert(secondChanceOffersTable).values(offer);
    } catch (err) {
      if (isUniqueViolation(err)) throw new DuplicateOfferError();
      throw err;
    }
  },
  async saveOffer(offer) {
    await db
      .insert(secondChanceOffersTable)
      .values(offer)
      .onConflictDoUpdate({
        target: secondChanceOffersTable.id,
        set: {
          status: offer.status,
          grantSource: offer.grantSource,
          transactionId: offer.transactionId,
          expiresAt: offer.expiresAt,
        },
      });
  },
};
