/** How many losses between forced interstitials for free players. */
export const INTERSTITIAL_EVERY_N_LOSSES = 3;

/**
 * Provisional until the handoff's open ad-frequency decision is set.
 * A free player never sees two interstitials closer than this, and never
 * more than INTERSTITIAL_DAILY_CAP in one UTC day.
 */
export const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
export const INTERSTITIAL_DAILY_CAP = 3;

/** How long a free player has to accept a tournament Second Chance. */
export const SECOND_CHANCE_WINDOW_MS = 60_000;

export type MatchMode = "bot" | "online" | "private";

/** `recorded` is a loss ledger row. It is not an offer to enter a bracket. */
export type OfferStatus = "recorded" | "pending" | "granted" | "declined" | "expired";

export type InterstitialDecision = "show" | "defer" | "skip";

export interface InterstitialInput {
  isMember: boolean;
  lossCount: number;
  /** True only on a result or lobby screen after a match has finished. */
  betweenCompletedMatches: boolean;
  gameActive: boolean;
  tournamentRoundActive: boolean;
  lastShownAtMs: number | null;
  shownInUtcDay: number;
  nowMs: number;
}

/**
 * Free players are eligible on every 3rd loss. The ad is shown only between
 * completed matches, never during a turn, an active game, or a tournament
 * round, and only inside the cooldown and daily cap. Members never see one.
 * A rewarded Second Chance does not replace this interstitial.
 */
export function decideInterstitial(input: InterstitialInput): InterstitialDecision {
  if (input.isMember) return "skip";
  if (input.lossCount <= 0 || input.lossCount % INTERSTITIAL_EVERY_N_LOSSES !== 0) return "skip";
  if (input.shownInUtcDay >= INTERSTITIAL_DAILY_CAP) return "skip";
  if (!input.betweenCompletedMatches || input.gameActive || input.tournamentRoundActive) return "defer";
  if (input.lastShownAtMs !== null && input.nowMs - input.lastShownAtMs < INTERSTITIAL_COOLDOWN_MS) {
    return "defer";
  }
  return "show";
}

export function shouldShowInterstitial(input: InterstitialInput): boolean {
  return decideInterstitial(input) === "show";
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
