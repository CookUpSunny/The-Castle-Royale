/**
 * Live App Store products for The Castle Royale (Apple ID 6772010192).
 *
 * Subscription group "The Castle Royale VIP" (22108578):
 * - monthly_high_roller: 1 month, level 1
 * - vip_year: 1 year, level 2
 *
 * Both grant the RevenueCat entitlement `premium`.
 * beginner_luck ("Beginner's Luck") and 004 ("The Castle Kingdom") are
 * non-consumables whose unlock is not decided yet. They must not grant premium.
 */

export const PREMIUM_ENTITLEMENT_ID = "premium";

export const PREMIUM_SUBSCRIPTION_PRODUCT_IDS = ["monthly_high_roller", "vip_year"] as const;

export const UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS = ["beginner_luck", "004"] as const;

/** Store identifier without a Play base-plan suffix (`product:basePlan`). */
export function storeProductId(productId: string | null | undefined): string {
  const raw = productId?.trim().toLowerCase() ?? "";
  const colon = raw.indexOf(":");
  return colon === -1 ? raw : raw.slice(0, colon);
}

export function isPremiumSubscriptionProduct(productId: string | null | undefined): boolean {
  const id = storeProductId(productId);
  return (PREMIUM_SUBSCRIPTION_PRODUCT_IDS as readonly string[]).includes(id);
}

export function isUnassignedNonConsumable(productId: string | null | undefined): boolean {
  const id = storeProductId(productId);
  return (UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS as readonly string[]).includes(id);
}

/** Known VIP subscriptions first. Anything else sorts after them. */
export function premiumPaywallRank(productId: string | null | undefined): number {
  const id = storeProductId(productId);
  const index = (PREMIUM_SUBSCRIPTION_PRODUCT_IDS as readonly string[]).indexOf(id);
  return index === -1 ? PREMIUM_SUBSCRIPTION_PRODUCT_IDS.length : index;
}
