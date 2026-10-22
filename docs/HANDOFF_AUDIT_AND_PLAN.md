# The Castle Royale — Phase A audit and implementation plan

Date: 2026-10-22. This is the audit the handoff asks for in section 12. It is not a rewrite. PR #2 is not merged.

The handoff supersedes the earlier Phase 1 brief where they disagree. Core play is free, including future 3- and 4-player tables. Players pay for cosmetics and for ad-free membership. Membership must not change cards, moves, bracket eligibility, or who wins. Paid-entry and cash-prize tournaments are out of scope and must not be built.

## 1. What is in the repo today

The shippable app is `artifacts/mobile` (Expo SDK 55, React Native 0.83.6, React 19.2.0). The API is `artifacts/api-server` (Express 5, Socket.IO 4). Postgres schema is Drizzle under `lib/db`. Bundle id `app.replit.thecastleroyale`. Marketing version `1.0.3` in `artifacts/mobile/app.json`. App Store ID `6772010192`, v1.0.3 Ready for Distribution. EAS project `00ffd88a-a639-4296-b59f-7ff224e87548`, owner `krazi`. Production API host in `artifacts/mobile/eas.json` is `The-castle-royale.replit.app`.

Matches are strictly 2-player. `dealGame` and `determineStartingPlayer` in `artifacts/api-server/src/lib/gameEngine.ts` take `playerIds: [string, string]`. `artifacts/mobile/app/mode-select.tsx` offers only a bot, the online queue, and a private room. There is no 3-player or 4-player mode, and there is no player-count paywall in source. The handoff's "remove player-count paywalls" item is already true in code. The work later is to add free 3- and 4-player tables without introducing a gate.

A stray native project at the repo root (`ios/`, `android/`, bundle `com.krazi.workspace`) is not the published app. Do not edit it for this work.

Game Center checks default to `app.replit.thecastleroyale` (`artifacts/api-server/src/routes/players.ts`). `GC_BUNDLE_ID` can still override that.

There is no reference to CookUpSunny or Play-Me-In-Castle in the game code. Music is bundled m4a files in `artifacts/mobile/contexts/MusicContext.tsx`. MusicKit is not integrated. Game Center uses `react-native-game-center`.

## 2. Existing cosmetic gates

Cosmetics are local and visual. They live in `artifacts/mobile/contexts/CosmeticsContext.tsx` and persist in AsyncStorage. Nothing on the server owns an item.

Free arenas (no paywall): Casino Green (`greenTable`, the default), The Flamingo Floor (`classic`), An Oasis in the Cave (`lightning`).

Subscription-locked arenas (`premium: true`, opened through `PaywallModal` when `isSubscribed` is false): Cosmic Sanctum, Olympus Throne, Matrix, Rainbow Road. The lock is in `artifacts/mobile/app/arena-picker.tsx` and `artifacts/mobile/components/CosmeticsModal.tsx` (`arena.premium && !isSubscribed`).

Card skins: five are free (`neon-glow`, `royal-gold`, `crystal-ice`, `sakura-blossom`, `inferno-flame`). The default equipped skin is `royal-gold`. Five are locked behind the same subscription (`midnight-void`, `emerald-prestige`, `pearl-white`, `cyber-punk`, `vintage-casino`) via `setCardSkin` / `isSkinUnlocked`.

All six avatars (The Eagles, Gentleman Frog, Big Bet, Gigi Gorgon, Rockner Burns, Sunami Walker) can be equipped by everyone. There is no avatar lock.

`PaywallModal` lists every current RevenueCat package except `beginner_luck` and `004`, and its perk copy still says a subscription unlocks every premium card skin and every premium arena. That is the old "one subscription owns the shop" model. The handoff forbids silently giving members every purchasable item.

The handoff's free starter set is Flamingo Floor, Cloud Kingdom, and Tokyo, plus four starter avatars and one default card back. Only Flamingo Floor exists, and it is already free. Cloud Kingdom and Tokyo are not in the arena list or scene packs. There is no single default card back with the other backs sold separately. There is no Royal Shop, no SKU catalog, and no inventory ledger.

## 3. Expo SDK and native compatibility

| Piece | Version | Note |
| --- | --- | --- |
| Expo | `~55.0.26` in mobile dependencies, `~55.0.9` in devDependencies | Use the 55.0.26 app. Do not bump to SDK 56 in these phases. |
| React Native | 0.83.6 | `react-native-google-mobile-ads` 17.x requires RN >= 0.86. Stay on 16.5.0. |
| react-native-purchases | ^10.4.1 | Needs an EAS dev client or TestFlight build. Expo Go cannot complete purchases. |
| react-native-google-mobile-ads | 16.5.0 | Config plugin is added in `artifacts/mobile/app.config.js`, which Expo prefers over `app.json`. `app.json` itself does not list the plugin, so a prebuild does not register it twice. |
| expo-build-properties | useFrameworks static | Already set. Required by the ads plugin on iOS. Not compiled on this Linux agent. |
| expo-asset | ^56.0.17 | Pre-existing skew against SDK 55. Not part of monetization. Leave it unless a build fails. |
| @shopify/react-native-skia | ~2.4.18 | A Skia config plugin exists and is not registered. Out of scope. |

`app.config.js` sets `delayAppMeasurementInit: true` and an ATT usage string that says High Roller and VIP members do not see forced ads. There is no UMP / consent form, no privacy-policy screen, and no Apps Flyer or other attribution SDK.

Real ads and real purchases are unverified. This environment cannot build iOS.

## 4. What PR #2 already does

- RevenueCat boots with only the iOS public SDK key. Android and test keys are optional (`lib/monetization/src/revenueCatKey.ts`, `artifacts/mobile/lib/revenuecat.tsx`).
- The paywall lists all current offering packages, using store title and price, except the two unassigned non-consumables.
- Webhook `POST /api/webhooks/revenuecat` mirrors a single entitlement, `premium`, onto `ad_accounts`. `monthly_high_roller` and `vip_year` grant it. Cancellation is ignored. Expiration clears the subscription and leaves a lifetime flag alone. `beginner_luck` and `004` do not grant `premium` even if a webhook lists that entitlement (`lib/monetization/src/revenueCatWebhook.ts`, `lib/monetization/src/storeProducts.ts`).
- Loss counts are server-authoritative. The client cache can only raise the count.
- AdMob SSV is `GET /api/ads/ssv`. Dev-only `POST /api/ads/second-chance/:offerId/test-grant` works when `ADMOB_ALLOW_UNVERIFIED_REWARDS=true`.
- `scripts/src/seedRevenueCat.ts` can create entitlement `premium`, offering `default`, packages `$rc_monthly` → `monthly_high_roller` and `$rc_annual` → `vip_year`. It does not attach `beginner_luck` or `004`.

That single `premium` entitlement is the main mismatch with the handoff. The handoff wants separate entitlements `high_roller`, `vip`, and `beginners_luck`, plus one owned-SKU entitlement (or ledger row) per permanent arena, avatar, card back, and bundle. Do not collapse those into `premium`.

## 5. What must change to match the handoff

### Access

No code change is required to "remove" a 3/4-player paywall, because that gate does not exist. When 3- and 4-player tables are added (Phase B), matchmaking, private rooms, and the rules engine must accept 3 and 4 seats with no `isSubscribed` check on the way in. Bot games stay free.

### Cosmetics and shop

Replace the subscription-unlocks-everything checks:

- `artifacts/mobile/contexts/CosmeticsContext.tsx` (`ARENAS`, `CARD_SKINS`, `setCardSkin`, `isSkinUnlocked`)
- `artifacts/mobile/app/arena-picker.tsx`
- `artifacts/mobile/components/CosmeticsModal.tsx`
- `artifacts/mobile/components/PaywallModal.tsx` perk copy

New pieces, not present today:

- A catalog module: SKU, type (arena / avatar / card back / bundle / membership), asset id, release status, entitlement or ledger key, and whether access is permanent or ends with the subscription.
- A server inventory ledger. AsyncStorage is not enough for restore, account transfer, or bundle grants. Suggested tables: `cosmetic_catalog` (or a checked-in catalog plus DB ownership) and `player_inventory` (`player_id`, `sku`, `source` = purchase | bundle | membership_reward | starter, `permanent` boolean, `expires_at` nullable).
- RevenueCat products for each sold SKU. One-time items can be bought with `Purchases.purchaseProduct` from a custom Royal Shop. Only High Roller and VIP need to be packages on offering `default`.
- Beginner's Luck (`beginner_luck`, $2.99 proposed) grants its three component SKUs permanently. It does not remove ads and it does not unlock 3-player. If App Store Connect metadata still says ad removal or 3-player, change that metadata before submission.
- Individual arena, card back, and avatar IAPs stay owned after a subscription expires. Rotating member arenas expire with membership. Earned monthly collectibles stay owned (product intent; confirm in section 11). Do not grant members every shop SKU.
- `004` ("The Castle Kingdom") is a real unsubmitted non-consumable. The handoff does not say what it unlocks. Leave it unattached until the owner maps it (see open decisions).

### Membership

Stop using entitlement id `premium` as the only flag.

- `high_roller` ← `monthly_high_roller`
- `vip` ← `vip_year` (VIP includes High Roller benefits)
- Ad-free when either entitlement is active
- `beginners_luck` ← `beginner_luck`, cosmetic only, not ad-free
- Webhook, `ad_accounts.premiumLifetime` / `premiumExpiresAt`, `isPremiumActive`, and `useSubscription().isSubscribed` all assume one flag. Replace them with tier + expiry, and keep the inventory ledger separate so a cancelled subscription cannot delete purchased cosmetics.
- Paywall copy must show renewal terms, price from the store, and Restore. It must not say the subscription unlocks every arena and every card skin.

`scripts/src/seedRevenueCat.ts` should be updated in Phase D to create `high_roller` and `vip` instead of attaching both products to `premium`. Until that dashboard change is done, the binary must not be submitted.

### Ads

Free players: an interstitial after every 3rd loss, only between completed matches, never during a turn, an active game, or a tournament round, with a cooldown and a daily cap. Members: never.

The rules live in `lib/monetization/src/adRules.ts`. Provisional numbers, until section 11 picks the real ones: cooldown `INTERSTITIAL_COOLDOWN_MS` = 3 minutes, cap `INTERSTITIAL_DAILY_CAP` = 3 per UTC day. The client applies them in `resolveAdBreak` (`artifacts/mobile/contexts/GameContext.tsx`), which runs only when leaving the result screen (`artifacts/mobile/app/victory.tsx`). `AdBreakHost` no longer shows an ad on launch.

Still to do in Phase E: a consent form, a real frequency decision, and a server-side "owed interstitial" so a deferred ad is not dropped when a newer match result replaces it. Today a cooldown deferral stays in memory only.

### Second Chance

Second Chance is one entry to a losers / Wild Card bracket per player per tournament. It is not a rematch, an extra move, or a redo of the lost hand.

`recordLoss` (`lib/monetization/src/lossService.ts`) now writes an ordinary loss as status `recorded` and does not open a bracket. A `tournamentId` opens at most one redemption, enforced by `getRedemptionByPlayerTournament` and unique index `second_chance_player_tournament_idx` on `(player_id, tournament_id)`. A member's single entry is granted with no ad. A free player's entry stays `pending` until SSV. A second loss in the same tournament does not open another offer, including after the 60 second window expires. SSV refuses a `recorded` row. The client no longer shows "WATCH AD" / "REMATCH".

Not built, and required before tournaments ship: the bracket itself, where the Wild Card is seated, tie-breakers, bracket sizes, the defeat-screen copy ("Watch Ad to Enter" / "Enter Wild Card Bracket"), and a fair fallback when the rewarded ad cannot load. Ad inventory must not decide who may enter. The fallback rule is an open decision (section 11). Do not treat the dev-only test-grant route as that fallback.

### Tournaments and money

No tournament code exists. Phase F is free entry and noncash prizes only. Do not add entry-fee products, fee waivers for subscribers, cash prizes, or copy that advertises them.

## 6. Known App Store Connect products

All four are Prepare for Submission. Bundle id `app.replit.thecastleroyale`. Apple ID `6772010192`.

| Product id | Kind | Handoff meaning | Code today |
| --- | --- | --- | --- |
| `monthly_high_roller` | Auto-renewable, group The Castle Royale VIP (`22108578`), 1 month, level 1 | High Roller. Proposed $6.99/month. No ads, exclusives, no competitive edge. | Grants entitlement `premium`. Package `$rc_monthly` in the seed script. |
| `vip_year` | Auto-renewable, same group, 1 year, level 2 | VIP Year. Proposed $59.99/year. High Roller benefits plus VIP exclusives. | Grants `premium`. Package `$rc_annual`. |
| `beginner_luck` | Non-consumable, display name Beginner's Luck | $2.99 cosmetic starter bundle: one extra arena, one exclusive avatar, one card back. Assets TBD. | Created by the seed script and hidden from the paywall. Does not grant `premium`. Does not grant the three cosmetics. |
| `004` | Non-consumable, display name The Castle Kingdom | Not named in the handoff. | Same as Beginner's Luck: present, unattached, no unlock. |

Prices above are the handoff's proposals. Do not hardcode them. The paywall must keep reading `priceString` from the store.

The old "buy the app" / lifetime unlock is dropped. Do not create a lifetime product unless the owner maps `004` or a new id to one, which the handoff does not do.

## 7. AdMob

- Publisher `pub-2426597243989008`.
- iOS App ID `ca-app-pub-2426597243989008~4741781660`, linked to App Store ID `6772010192`. This id is public and is the default `iosAppId` in `artifacts/mobile/app.config.js`. `EXPO_PUBLIC_ADMOB_IOS_APP_ID` overrides it.
- There are no interstitial or rewarded ad units yet. `artifacts/mobile/lib/adUnitIds.ts` keeps Google's test unit ids until `EXPO_PUBLIC_ADMOB_INTERSTITIAL_*` and `EXPO_PUBLIC_ADMOB_REWARDED_*` are set. Do not invent unit ids. A production binary that still has test unit ids will be rejected by AdMob once units exist, so set the env vars before the store build that is meant to show real ads.
- Android still has no AdMob app. The plugin uses Google's test Android app id until `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` is set. iOS is the first platform.
- Console status, as reported by the owner: **Requires review / Limited ad serving – verify app**. Limited serving is not a working production ad setup. Do not claim live ads.
- **app-ads.txt is not set up for AdMob.** `artifacts/mobile/server/serve.js` can answer `/app-ads.txt` with `google.com, pub-2426597243989008, DIRECT, f08c47fec0942fa0`. That route is the Expo static server. `thecastleroyale.com` does not appear anywhere in this repo, and AdMob still says the file is missing. The file must be served at `https://thecastleroyale.com/app-ads.txt` with that exact publisher line. The App Store listing's developer website must be `https://thecastleroyale.com` so AdMob checks that host. Putting the line only on `The-castle-royale.replit.app` does not finish verification.
- Rewarded SSV, when a rewarded unit exists, must be `https://The-castle-royale.replit.app/api/ads/ssv` with the query string left intact. Test units cannot call it.

## 8. Phases B–G

Each phase should be its own small PR, tested, and not merged on the strength of this audit.

### Phase B — Free core

- Confirm mode select, queue, private room, and bot path have no purchase check. They do not today. Add a test or a short comment at the mode-select buttons so a later paywall is not wired there.
- Seed the free starter cosmetics once the owner names Cloud Kingdom, Tokyo, the four avatars, and the one default card back. Until then, keep Flamingo Floor, Casino Green, and the current free skins equippable.
- Do not lock 3- or 4-player behind a product when those modes are added. Engine change is `gameEngine.ts` (the `[string, string]` tuples), `socketGame.ts` seating, and the mobile match UI. That is a later increment inside B, after a rules note for 3 and 4 hands. Do not start it inside the audit PR.

### Phase C — Royal Shop

- Catalog + `player_inventory` ledger and restore.
- Shop UI sections: Arenas, Avatars, Card Backs, Collections, Memberships. Preview, owned/locked, store price, cosmetic-only wording, emerald/gold, no cash-out language.
- Wire `beginner_luck` to its three SKUs after the assets are chosen.
- Leave `004` off the shop until it is mapped.
- Stop granting every locked skin and arena from `isSubscribed`.

### Phase D — Membership

- Entitlements `high_roller` and `vip`. Offering `default` with `$rc_monthly` and `$rc_annual` only.
- Webhook writes tier and expiry. Expiration removes rotating member access and does not delete inventory rows with `permanent = true`.
- Ad-free flag comes from an active `high_roller` or `vip` entitlement.
- Monthly reward grant is a ledger row, not "unlock the whole catalog."
- Update `seedRevenueCat.ts` and the paywall perks in the same change.

### Phase E — Ads

- Create the interstitial and rewarded units in AdMob. Put only those ids in EAS secrets.
- Finish app-ads.txt on `thecastleroyale.com` and the App Store developer-website field. Wait until AdMob review is no longer "verify app" before expecting real fill.
- ATT is already declared. Add the consent flow the handoff requires, and a privacy link on the paywall.
- Replace the provisional 3-minute / 3-per-day constants when the owner sets them.
- Rewarded ad is opt-in. If it fails to load, use the fallback from section 11. Do not grant a bracket seat from the client alone.

### Phase F — Tournaments

- Free entry, noncash prizes, server-authoritative bracket.
- First loss in a tournament calls `recordLoss` with `tournamentId`. The redemption row already enforces once per player per tournament.
- Defeat screen copy from the handoff. Members skip the ad. Free players watch one rewarded ad or take the fair fallback.
- Wild Card seating, bracket size, and tie-breakers stay unimplemented until those decisions exist.
- No entry fee, no prize money, no subscriber fee waiver.

### Phase G — Release

- EAS iOS dev client, then TestFlight sandbox purchases for `monthly_high_roller`, `vip_year`, and `beginner_luck`.
- Confirm the App Store version has those products attached, subscription terms visible, and Restore working.
- Do not submit while ad units are still Google's test ids, while app-ads.txt is unverified, or while paywall copy still promises every premium arena.
- Staged rollout only after sandbox evidence. This audit is not that evidence.

## 9. Policy and legal flags

- Paid-entry and cash-prize tournaments were discussed and are explicitly deferred. Do not implement, sell, or advertise them. Do not assume Apple IAP or RevenueCat can sell cash-prize entry. That needs a separate legal, age, fraud, and payments review.
- Arena and skin copy still uses casino language ("place your bets", "high-stakes", "Vintage Casino"). The handoff wants a family-friendly royal theme, not a real-money casino. Review that copy before the next submission. No cash-out language should be added.
- Subscriptions need visible price, period, auto-renewal, and Restore before review. The paywall has a short renewal footnote and Restore. It does not yet link to privacy or terms.
- ATT string is present. A consent form is not. Family/children targeting is undecided and blocks ad configuration.
- Beginner's Luck metadata in App Store Connect may still describe an older ad-removal or 3-player unlock. Update the customer-facing text to the cosmetic bundle before submission.
- `004` must not be submitted with a description that does not match an in-app unlock.
- AdMob limited serving means a build can request ads and still get little or no fill until the app is verified. Test ids are for development only.
- `artifacts/mobile/eas.json` contains an Apple ID email used for submit. Do not copy that email into new docs or clients.

## 10. Rollback

Nothing in this branch is on the store. Rollback is: do not merge PR #2, or revert the branch before the next EAS build.

- Database: `ad_accounts` and `second_chance_offers` are new. They are not applied until `pnpm --filter @workspace/db run push`. If that push has not run, there is nothing to undo. If it has, the tables are additive and can be left unused or dropped. They do not change `players`.
- The ads plugin now embeds the real iOS App ID. Reverting the commit removes it from the next binary. An already-installed TestFlight build keeps the native config it was built with until a new build.
- Ad units are still test ids, so reverting does not leave a production unit pointed at a half-built reward.
- There is no feature flag. The result screen calls `resolveAdBreak` directly. Reverting `GameContext.tsx`, `victory.tsx`, `AdBreakHost.tsx`, and `lib/monetization` restores the previous behavior.
- Do not delete the App Store Connect products as a rollback. They are unsubmitted and still the ids the handoff uses.

## 11. Open decisions (handoff section 11)

These block art and dashboard work. They do not block keeping core play free.

- Which four avatars are the free starters, and which three items are inside Beginner's Luck.
- Which arenas are individual purchases, which two rotate for High Roller, and which one is VIP-only. Cloud Kingdom and Tokyo are named as free and are not in the app yet.
- Whether VIP gets the same monthly collectible as High Roller. The handoff says assume yes until told otherwise.
- What `004` / The Castle Kingdom unlocks. Not in the handoff table.
- Free tournament cadence, field size, bracket algorithm, prize list, where the Wild Card is inserted, tie-breakers, and the exact ad-unavailable fallback.
- Final ad cooldown and daily cap. The code's 3 minutes and 3 per UTC day are placeholders.
- Membership reward calendar, shop release calendar, and final regional prices. Do not hardcode the proposed $2.99 / $4.99 / $6.99 / $59.99.

## 12. Corrections already made on this branch

These are the small contradictions with the handoff. The shop, entitlements, and tournaments are not rewritten here.

- Ordinary losses no longer offer a rematch. Second Chance is stored once per `(player, tournament)`.
- The every-3rd-loss interstitial is eligible only between completed matches. It is skipped for members, deferred during an active game or tournament round, and deferred inside the provisional cooldown. The daily cap skips further shows. Launch no longer forces an interstitial.
- The iOS AdMob App ID in the config plugin is `ca-app-pub-2426597243989008~4741781660`. Interstitial and rewarded ids remain Google's test ids.

## 13. What was verified for this audit

- `pnpm run typecheck`
- `@workspace/monetization` tests: 11 passed
- `pnpm --filter @workspace/api-server build`
- No eslint script in the repo
- No iOS build, no TestFlight purchase, no live ad request, no schema push, and no check that `https://thecastleroyale.com/app-ads.txt` currently returns the publisher line
