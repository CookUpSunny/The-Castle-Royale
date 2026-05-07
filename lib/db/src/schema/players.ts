import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  gameCenterId: text("game_center_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  coins: integer("coins").default(500).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  winStreak: integer("win_streak").default(0).notNull(),
  elo: integer("elo").default(1000).notNull(),
  /** ID of the game this player is currently in, or null when not in a game. Cleared when the game ends. */
  activeGameId: text("active_game_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true,
  createdAt: true,
});
export const selectPlayerSchema = createSelectSchema(playersTable);
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
