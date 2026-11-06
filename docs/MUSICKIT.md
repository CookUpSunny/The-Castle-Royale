# Apple MusicKit arena music

Arena songs can stream from the Apple Music catalog through MusicKit so a play is an Apple Music stream. The files in `artifacts/mobile/assets/music` stay in the app and play whenever MusicKit cannot.

This environment has no Mac and does not run an iOS build. Catalog streaming on a real iPhone still depends on the MusicKit App Service for the shipping App ID. This repository does not enable or save that service.

## What the app does

- Catalog ids live in `artifacts/mobile/lib/appleMusicCatalog.ts`. They were taken from the public iTunes Lookup API for Sunny Systems, album **The Castle Royale (Original Game Soundtrack)** (`6774232040`).
- The native player is the local Expo module `artifacts/mobile/modules/castle-musickit`. It uses `ApplicationMusicPlayer` (iOS 15+) and does not call MusicKit while the module is loading. Nested player types are spelled `MusicKit.MusicPlayer` because an unqualified `MusicPlayer` is ambiguous for type lookup under the Xcode 26.2 compile. The queue watchdog treats `playing`, `seekingForward`, and `seekingBackward` as in-progress transport. `MusicKit.MusicPlayer.PlaybackStatus` has no `seeking` case. A pause or an interruption is not resumed from that loop. A stop after playback has started can be restarted. EAS SDK 55 compiles this file with Xcode 26.2.
- `MusicContext` uses MusicKit only on iOS, only when the Apple Music preference is on, the listener has authorized the app, and `MusicSubscription.canPlayCatalogContent` is true. Otherwise it uses the bundled `.m4a` files through `expo-audio`.
- Android and web never load the native module. Their playback stays the bundled player.
- The system permission dialog is shown once, after the intro splash finishes and the home screen is visible. It is not shown during the splash, during startup, or when a match starts. The asked flag is stored so later launches do not ask again. The Settings switch defaults to on. A denial or restriction turns that switch off. Turning it on later re-checks authorization, and a denial explains how to allow Apple Music in iOS Settings.
- The match menu (portrait and landscape) has Play, Pause, and Skip for the current song.
- Mute pauses a MusicKit stream. `ApplicationMusicPlayer` has no app-only volume, so the on-screen volume slider still controls bundled music and the iPhone volume buttons control Apple Music loudness. There is no fade on a catalog stream.

## Signing versus the App Service

MusicKit is an App Service on the App ID. It is not an iOS provisioning entitlement, and a managed profile refresh cannot add one.

- Apple documents the switch on the App ID **App Services** tab: [MusicKit](https://developer.apple.com/help/account/services/musickit/) and [Enable app services](https://developer.apple.com/help/account/identifiers/enable-app-services/). Those services usually do not put an entitlement in the provisioning profile. The required role for that save is Account Holder or Admin.
- There is no MusicKit row to add under Xcode Signing & Capabilities. The system permission dialog needs `NSAppleMusicUsageDescription` in Info.plist. Apple Developer Technical Support has said MusicKit has never used entitlements ([thread 770083](https://developer.apple.com/forums/thread/770083), [thread 815604](https://developer.apple.com/forums/thread/815604)).
- Expo's [iOS capabilities](https://docs.expo.dev/build-reference/ios-capabilities/) table has no MusicKit entitlement. `eas build` only syncs capabilities that have a real entitlement string. MusicKit is not one of them, so this config does not ask Expo to turn the App Service on or off.
- `com.apple.developer.musickit` and `com.apple.developer.music-kit` are not profile entitlements. Requesting either one makes fastlane archive fail with `Entitlement com.apple.developer.musickit not found and could not be included in profile`.

`artifacts/mobile/plugins/withAppleMusicKit.js` writes `NSAppleMusicUsageDescription` only. `app.json` records that same usage string and does not set `ios.entitlements`. The native player stays `artifacts/mobile/modules/castle-musickit`. Bundled `.m4a` playback stays the fallback.

## Owner steps before an iOS build

Do these yourself. Do not commit certificates, profiles, or API keys. Nothing in this change enables or saves the Apple Developer portal.

1. Sign in to [Apple Developer](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Identifiers.
2. Open the exact shipping App ID `app.replit.thecastleroyale` (team `329HG4LB2B`).
3. On the **App Services** tab, the **MusicKit** checkbox is the catalog-streaming switch. Whether to save it is your decision. This repository cannot perform that save. Codesign does not wait on it. If the service is off, catalog playback is not registered for this App ID and the app uses the bundled tracks.
4. Keep EAS credentials managed. Do not switch this project to a checked-in provisioning profile, and do not regenerate the profile in order to include a MusicKit entitlement. The profile should not contain one.
5. Install a development or preview build on a real iPhone that has an Apple Music subscription. Expo Go does not include this module. A simulator without a subscription should fall back to the bundled files.
6. Open the app and let the intro finish. Allow Apple Music on the home screen. Start a match and confirm Control Center shows the Sunny Systems catalog song. Decline the prompt, turn the Settings row off, or use an Apple ID that cannot stream, and the bundled track should play instead. In the match menu, Play, Pause, and Skip should move the current song.
7. Merge when that device check is acceptable. A production build or App Store submit is a separate decision.

The stray `ios/` and `android/` folders at the repo root are not part of this app. `ios/workspace/workspace.entitlements` is an empty plist and is not the file EAS signs.

## Terms to approve before shipping

Apple’s App Store Review Guideline **4.5.2** (Apple Music) is the constraint that matters here. MusicKit is allowed in games, and a subscribed listener can play catalog songs. Apple also says the user has to start an Apple Music stream and needs ordinary playback controls such as play, pause, and skip. MusicKit does not replace sync or adaptation licenses when an app plays a specific song at a specific moment. The app may not charge for Apple Music or gate it behind a purchase, an ad, or a demand for personal information. Do not download the catalog audio.

This change asks for Apple Music once on the home screen, then starts a catalog song when a match begins if that permission was allowed. The match menu has Play, Pause, and Skip. Lobby music can use the catalog after that same permission, without asking again. Owning the Sunny Systems masters (the soundtrack album is credited ℗ 2026 Maixor Sounds) is the rights-holder side of that question. It does not, by itself, waive 4.5.2.

Guideline **5.2.5** says iTunes and Apple Music *previews* must not be used as a game soundtrack. This path does not play preview files. It streams the full song through MusicKit for a subscriber. A reviewer can still treat unsolicited arena music as a soundtrack use under 4.5.2.

Catalog playback is not behind the Castle Royale membership and not behind an ad. Free arenas use it too. The game subscription check is separate.

Apple decides what counts as a stream, including whether a loop counts again. The player repeats with MusicKit’s repeat mode so the song keeps going the way the bundled tracks loop. That is not a guarantee of a royalty on every loop.

Ship this only if those terms are acceptable. The safe behavior if they are not is to leave the Apple Music setting off. Bundled playback still works.
