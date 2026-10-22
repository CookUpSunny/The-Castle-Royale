import { timingSafeEqual } from "node:crypto";
import { isPremiumActive } from "./adRules";
import { emptyAdAccount, type AdAccount, type AdStore } from "./store";

export interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  expiration_at_ms?: number | null;
}

const GRANT_TYPES = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "NON_RENEWING_PURCHASE",
  "PRODUCT_CHANGE",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

export type PremiumDecision =
  | { action: "grant"; lifetime: boolean; expiresAt: Date | null }
  | { action: "expire-subscription" }
  | { action: "ignore" };

export function webhookAuthorized(header: string | undefined, expected: string | undefined): boolean {
  if (!header || !expected) return false;
  const actual = Buffer.from(header);
  const want = Buffer.from(expected);
  if (actual.length !== want.length) return false;
  return timingSafeEqual(actual, want);
}

function mentionsPremium(event: RevenueCatEvent): boolean {
  const entitlements = event.entitlement_ids ?? [];
  if (entitlements.some((id) => id === "premium")) return true;
  const product = event.product_id?.toLowerCase() ?? "";
  if (entitlements.length === 0 && product.includes("premium")) return true;
  return false;
}

function isLifetime(event: RevenueCatEvent): boolean {
  const product = event.product_id?.toLowerCase() ?? "";
  if (product.includes("lifetime")) return true;
  return event.type === "NON_RENEWING_PURCHASE" && (event.expiration_at_ms === null || event.expiration_at_ms === undefined);
}

export function decidePremiumChange(event: RevenueCatEvent): PremiumDecision {
  if (!mentionsPremium(event) && event.type !== "EXPIRATION") {
    return { action: "ignore" };
  }
  if (event.type === "EXPIRATION") {
    if (!mentionsPremium(event)) return { action: "ignore" };
    if (isLifetime(event)) return { action: "ignore" };
    return { action: "expire-subscription" };
  }
  if (!event.type || !GRANT_TYPES.has(event.type) || !mentionsPremium(event)) {
    return { action: "ignore" };
  }
  if (isLifetime(event)) return { action: "grant", lifetime: true, expiresAt: null };
  const expiresAt =
    typeof event.expiration_at_ms === "number" ? new Date(event.expiration_at_ms) : null;
  return { action: "grant", lifetime: false, expiresAt };
}

export function readRevenueCatEvent(body: unknown): RevenueCatEvent | null {
  if (!body || typeof body !== "object" || !("event" in body)) return null;
  const event = (body as { event?: unknown }).event;
  if (!event || typeof event !== "object") return null;
  return event as RevenueCatEvent;
}

async function findAccount(store: AdStore, event: RevenueCatEvent, now: Date): Promise<AdAccount> {
  const ids = [event.app_user_id, event.original_app_user_id].filter((id): id is string => !!id);
  for (const id of ids) {
    const byRevenueCat = await store.getByRevenueCatAppUserId(id);
    if (byRevenueCat) return byRevenueCat;
    const byGameCenter = await store.getByGameCenterId(id);
    if (byGameCenter) return byGameCenter;
    const byPlayer = await store.getByPlayerId(id);
    if (byPlayer) return byPlayer;
  }
  const playerId = event.app_user_id || event.original_app_user_id || "unknown";
  const created = emptyAdAccount(playerId, now);
  created.revenueCatAppUserId = event.app_user_id ?? null;
  return created;
}

export async function applyRevenueCatEvent(
  store: AdStore,
  event: RevenueCatEvent,
  now = new Date(),
): Promise<{ applied: boolean; isPremium: boolean; playerId: string }> {
  const decision = decidePremiumChange(event);
  const account = await findAccount(store, event, now);
  if (event.app_user_id) account.revenueCatAppUserId = event.app_user_id;

  if (decision.action === "grant") {
    if (decision.lifetime) account.premiumLifetime = true;
    if (decision.expiresAt) {
      const current = account.premiumExpiresAt?.getTime() ?? 0;
      if (decision.expiresAt.getTime() > current) account.premiumExpiresAt = decision.expiresAt;
    }
  } else if (decision.action === "expire-subscription") {
    account.premiumExpiresAt = null;
  }

  account.updatedAt = now;
  if (decision.action !== "ignore") await store.saveAccount(account);
  return {
    applied: decision.action !== "ignore",
    isPremium: isPremiumActive(account, now),
    playerId: account.playerId,
  };
}
