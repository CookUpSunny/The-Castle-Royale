import { boolean, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Ad and premium state for every client player id, including players who
 * have not signed in with Game Center. Premium is mirrored from RevenueCat.
 */
export const adAccountsTable = pgTable("ad_accounts", {
  playerId: text("player_id").primaryKey(),
  gameCenterId: text("game_center_id"),
  adLossCount: integer("ad_loss_count").default(0).notNull(),
  premiumLifetime: boolean("premium_lifetime").default(false).notNull(),
  premiumExpiresAt: timestamp("premium_expires_at"),
  revenueCatAppUserId: text("revenuecat_app_user_id"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const secondChanceOffersTable = pgTable(
  "second_chance_offers",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id").notNull(),
    gameId: text("game_id").notNull(),
    tournamentId: text("tournament_id"),
    nonce: text("nonce").notNull(),
    mode: text("mode").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    status: text("status").notNull(),
    grantSource: text("grant_source"),
    transactionId: text("transaction_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("second_chance_player_game_idx").on(table.playerId, table.gameId),
    uniqueIndex("second_chance_player_tournament_idx").on(table.playerId, table.tournamentId),
    uniqueIndex("second_chance_transaction_idx").on(table.transactionId),
  ],
);
