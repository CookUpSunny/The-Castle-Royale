export { selectRevenueCatApiKey } from "./revenueCatKey";
export type { RevenueCatKeyInput, RevenueCatPlatform } from "./revenueCatKey";

export {
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_DAILY_CAP,
  INTERSTITIAL_EVERY_N_LOSSES,
  SECOND_CHANCE_WINDOW_MS,
  decideInterstitial,
  isPremiumActive,
  mergeLossCounts,
  reconcileLossCount,
  shouldShowInterstitial,
} from "./adRules";
export type { InterstitialDecision, InterstitialInput, MatchMode, OfferStatus } from "./adRules";

export { DuplicateOfferError, emptyAdAccount, laterDate, mergePremium } from "./store";
export type { AdAccount, AdStore, SecondChanceOffer } from "./store";

export {
  grantSecondChanceFromSsv,
  linkAdIdentity,
  raiseLossCount,
  readSettlement,
  recordLoss,
  resolveSecondChance,
} from "./lossService";
export type { Settlement } from "./lossService";

export {
  ADMOB_VERIFIER_KEYS_URL,
  customDataToOffer,
  parseVerifierKeys,
  processAdMobSsv,
  splitSignedQuery,
  verifyAdMobSignature,
} from "./ssv";
export type { SsvResult } from "./ssv";

export {
  applyRevenueCatEvent,
  decidePremiumChange,
  readRevenueCatEvent,
  webhookAuthorized,
} from "./revenueCatWebhook";
export type { PremiumDecision, RevenueCatEvent } from "./revenueCatWebhook";

export {
  PREMIUM_ENTITLEMENT_ID,
  PREMIUM_SUBSCRIPTION_PRODUCT_IDS,
  UNASSIGNED_NON_CONSUMABLE_PRODUCT_IDS,
  isPremiumSubscriptionProduct,
  isUnassignedNonConsumable,
  premiumPaywallRank,
  storeProductId,
} from "./storeProducts";
