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

/**
 * How a store product appears on the paywall.
 * `004` and anything unknown stay hidden. Beginner's Luck is a one-time
 * cosmetic and must not be treated as the premium membership.
 */
export type PaywallRole = "vip_year" | "high_roller" | "beginner_luck" | "hidden";

export function paywallRole(productId: string | null | undefined): PaywallRole {
  const id = storeProductId(productId);
  if (id === "vip_year") return "vip_year";
  if (id === "monthly_high_roller") return "high_roller";
  if (id === "beginner_luck") return "beginner_luck";
  return "hidden";
}

/** VIP Year first so the best-value plan leads. Hidden products sort last. */
export function paywallSortRank(role: PaywallRole): number {
  if (role === "vip_year") return 0;
  if (role === "high_roller") return 1;
  if (role === "beginner_luck") return 2;
  return 9;
}

/**
 * Footnote built only from store price strings. When the store has not
 * returned a price, the sentence names no amount.
 */
export function membershipPriceLine(
  prices: readonly { role: PaywallRole; priceString: string }[],
): string {
  const monthly = prices.find((p) => p.role === "high_roller" && p.priceString.trim())?.priceString.trim();
  const yearly = prices.find((p) => p.role === "vip_year" && p.priceString.trim())?.priceString.trim();
  const prefix = "Exclusive arenas and card skins come with a membership.";
  if (monthly && yearly) {
    return `${prefix} High Roller is ${monthly} a month. VIP Year is ${yearly} a year.`;
  }
  if (monthly) return `${prefix} High Roller is ${monthly} a month.`;
  if (yearly) return `${prefix} VIP Year is ${yearly} a year.`;
  return `${prefix} Prices come from the App Store.`;
}
