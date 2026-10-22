/** How many losses between forced interstitials for free players. */
export const INTERSTITIAL_EVERY_N_LOSSES = 3;

/** How long a free player has to accept Second Chance. */
export const SECOND_CHANCE_WINDOW_MS = 60_000;

export type MatchMode = "bot" | "online" | "private";

export type OfferStatus = "pending" | "granted" | "declined" | "expired";

export type SecondChanceResolution = "pending" | "granted" | "declined" | "expired";

/**
 * A completed Second Chance (rewarded ad, or the free premium grant) replaces
 * the every-3rd-loss interstitial for that same loss. Declining or letting the
 * timer expire still plays the interstitial when this loss is a multiple of 3.
 */
export function shouldShowInterstitial(input: {
  isPremium: boolean;
  lossCount: number;
  secondChance: SecondChanceResolution;
}): boolean {
  if (input.isPremium) return false;
  if (input.lossCount <= 0 || input.lossCount % INTERSTITIAL_EVERY_N_LOSSES !== 0) return false;
  if (input.secondChance === "granted" || input.secondChance === "pending") return false;
  return true;
}

/** Server count wins when it is ahead. A higher local count is kept so an offline bump is not lost. */
export function mergeLossCounts(local: number, server: number): number {
  const safeLocal = Number.isFinite(local) && local > 0 ? Math.floor(local) : 0;
  const safeServer = Number.isFinite(server) && server > 0 ? Math.floor(server) : 0;
  return Math.max(safeLocal, safeServer);
}

/** Clients may only raise the stored loss count, never lower it. */
export function reconcileLossCount(serverCount: number, clientCount: number): number {
  if (!Number.isInteger(clientCount) || clientCount < 0 || clientCount > 1_000_000) {
    return serverCount;
  }
  return Math.max(serverCount, clientCount);
}

export function isPremiumActive(
  account: { premiumLifetime: boolean; premiumExpiresAt: Date | null },
  now: Date,
): boolean {
  if (account.premiumLifetime) return true;
  return account.premiumExpiresAt !== null && account.premiumExpiresAt.getTime() > now.getTime();
}
