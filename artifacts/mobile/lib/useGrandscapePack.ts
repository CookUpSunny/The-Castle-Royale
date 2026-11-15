import { useMemo } from 'react';
import type { PurchasesPackage } from 'react-native-purchases';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import {
  findGrandscapePackage,
  grandscapeShopView,
  GRANDSCAPE_MIRROR_PACK_ID,
  isStorePurchaseCancelled,
  ownsGrandscapeMirrorPack,
  type CardFacePackId,
  type GrandscapeShopView,
} from '@/lib/grandscapeMirrorPack';
import { useSubscription } from '@/lib/revenuecat';

export interface GrandscapePackController {
  owns: boolean;
  equipped: boolean;
  storedPack: CardFacePackId | null;
  storeLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  shop: GrandscapeShopView;
  equip: () => void;
  unequip: () => void;
  buy: () => Promise<'purchased' | 'cancelled' | 'unavailable'>;
  restorePack: () => Promise<boolean>;
}

export function useGrandscapePack(): GrandscapePackController {
  const { cardFacePack, cardFacePackActive, setCardFacePack } = useCosmetics();
  const { customerInfo, offerings, purchase, restore, isPurchasing, isRestoring, isLoading } = useSubscription();
  const owns = ownsGrandscapeMirrorPack(customerInfo);
  const equipped = cardFacePackActive === GRANDSCAPE_MIRROR_PACK_ID;
  const pkg = useMemo(() => findGrandscapePackage(offerings ?? null), [offerings]);
  const shop = grandscapeShopView({
    owns,
    equipped,
    priceString: pkg?.product?.priceString,
  });

  const equip = () => {
    if (!owns) return;
    setCardFacePack(GRANDSCAPE_MIRROR_PACK_ID, true);
  };

  const unequip = () => {
    setCardFacePack(null, false);
  };

  const buy = async () => {
    const found = findGrandscapePackage(offerings ?? null);
    if (!found || !shop.canPurchase) return 'unavailable' as const;
    try {
      const info = await purchase(found as PurchasesPackage);
      if (ownsGrandscapeMirrorPack(info)) {
        setCardFacePack(GRANDSCAPE_MIRROR_PACK_ID, true);
      }
      return 'purchased' as const;
    } catch (err) {
      if (isStorePurchaseCancelled(err)) return 'cancelled' as const;
      throw err;
    }
  };

  const restorePack = async () => {
    const info = await restore();
    return ownsGrandscapeMirrorPack(info);
  };

  return {
    owns,
    equipped,
    storedPack: cardFacePack,
    storeLoading: isLoading,
    isPurchasing,
    isRestoring,
    shop,
    equip,
    unequip,
    buy,
    restorePack,
  };
}
