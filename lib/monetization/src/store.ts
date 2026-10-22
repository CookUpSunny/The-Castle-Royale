import type { MatchMode, OfferStatus } from "./adRules";

export interface AdAccount {
  playerId: string;
  gameCenterId: string | null;
  adLossCount: number;
  premiumLifetime: boolean;
  premiumExpiresAt: Date | null;
  revenueCatAppUserId: string | null;
  updatedAt: Date;
}

export interface SecondChanceOffer {
  id: string;
  playerId: string;
  gameId: string;
  /** Set only on the one redemption row for a tournament. Loss ledger rows leave this null. */
  tournamentId: string | null;
  nonce: string;
  mode: MatchMode;
  expiresAt: Date;
  status: OfferStatus;
  grantSource: "premium" | "admob_ssv" | null;
  transactionId: string | null;
  createdAt: Date;
}

export interface AdStore {
  getByPlayerId(playerId: string): Promise<AdAccount | null>;
  getByGameCenterId(gameCenterId: string): Promise<AdAccount | null>;
  getByRevenueCatAppUserId(revenueCatAppUserId: string): Promise<AdAccount | null>;
  saveAccount(account: AdAccount): Promise<void>;
  getOffer(id: string): Promise<SecondChanceOffer | null>;
  getOfferByPlayerGame(playerId: string, gameId: string): Promise<SecondChanceOffer | null>;
  /** The single Second Chance redemption for this player in this tournament, if any. */
  getRedemptionByPlayerTournament(playerId: string, tournamentId: string): Promise<SecondChanceOffer | null>;
  getOfferByTransactionId(transactionId: string): Promise<SecondChanceOffer | null>;
  /** Inserts a new offer. Rejects when this player already has an offer for the game. */
  insertOffer(offer: SecondChanceOffer): Promise<void>;
  saveOffer(offer: SecondChanceOffer): Promise<void>;
}

export function emptyAdAccount(playerId: string, now: Date): AdAccount {
  return {
    playerId,
    gameCenterId: null,
    adLossCount: 0,
    premiumLifetime: false,
    premiumExpiresAt: null,
    revenueCatAppUserId: null,
    updatedAt: now,
  };
}

export class DuplicateOfferError extends Error {
  constructor() {
    super("Second Chance offer already exists for this game");
    this.name = "DuplicateOfferError";
  }
}

export function laterDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

export function mergePremium(into: AdAccount, from: AdAccount): void {
  into.premiumLifetime = into.premiumLifetime || from.premiumLifetime;
  into.premiumExpiresAt = laterDate(into.premiumExpiresAt, from.premiumExpiresAt);
  into.adLossCount = Math.max(into.adLossCount, from.adLossCount);
  into.gameCenterId = into.gameCenterId ?? from.gameCenterId;
  into.revenueCatAppUserId = into.revenueCatAppUserId ?? from.revenueCatAppUserId;
}
