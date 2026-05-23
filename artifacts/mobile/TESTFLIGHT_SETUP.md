# TestFlight Build & Submit — Setup Guide

## Overview

EAS (Expo Application Services) handles building the iOS `.ipa` and submitting it to TestFlight.
All configuration lives in `eas.json` and `app.json`.  After the one-time credential bootstrap
below, every subsequent release is a single command run from Replit.

---

## One-Time Setup (run locally on a Mac)

Apple requires an interactive session the first time a Distribution Certificate and Provisioning
Profile are created.  Do this once from any machine that has the EAS CLI installed.

```bash
# Install EAS CLI globally (skip if already installed)
npm install -g eas-cli

# Log in with the Expo account that owns @krazi/thecastleroyale
eas login

# From the repo root, target the mobile package
cd artifacts/mobile

# Trigger an interactive credential bootstrap — EAS will open browser flows for Apple auth
eas build --platform ios --profile production
```

EAS will:
1. Ask you to sign in to your Apple Developer account in the browser.
2. Create (or reuse) an iOS Distribution Certificate and store it on Expo's servers.
3. Create (or reuse) a Provisioning Profile tied to `app.replit.thecastleroyale`.
4. Queue the first build — you can let it finish or cancel after credentials are saved.

Credentials are stored under **https://expo.dev/accounts/krazi/projects/thecastleroyale/credentials**
and reused automatically for every build after this.

---

## Fill in Submit Credentials (once)

Open `eas.json` and replace the three placeholders in the `submit.production.ios` block:

| Placeholder | Where to find it |
|---|---|
| `{{APPLE_ID}}` | Your Apple ID email (e.g. `you@example.com`) |
| `{{ASC_APP_ID}}` | App Store Connect → App → App Information → Apple ID (numeric, e.g. `1234567890`) |
| `{{APPLE_TEAM_ID}}` | Apple Developer portal → Membership → Team ID (10-char string) |

> **Tip:** store `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID`, and `EXPO_APPLE_TEAM_ID` as Replit Secrets
> and use them via environment variables instead of hardcoding them in `eas.json`.

---

## Releasing a New Build from Replit

### Build only (queues a build on EAS, returns a build URL)

```bash
pnpm --filter @workspace/mobile run eas:build:ios
```

### Submit the latest finished build to TestFlight

```bash
pnpm --filter @workspace/mobile run eas:submit:ios
```

### Build **and** submit in one shot

```bash
pnpm --filter @workspace/mobile run eas:ship:ios
```

The `ship` script waits for the EAS build to finish and then immediately submits the resulting
`.ipa` to App Store Connect / TestFlight.  Build progress and the final build URL are printed
to stdout.  The build also appears in the EAS dashboard:

**https://expo.dev/accounts/krazi/projects/thecastleroyale/builds**

---

## Scripts Reference

| Script | Command | Description |
|---|---|---|
| `eas:build:ios` | `eas build --platform ios --profile production --non-interactive` | Queue an EAS cloud build |
| `eas:submit:ios` | `eas submit --platform ios --profile production --latest --non-interactive` | Submit latest build to TestFlight |
| `eas:ship:ios` | build → submit | Full release pipeline |

---

## Version Numbering

`eas.json` sets `"appVersionSource": "remote"` and `"autoIncrement": true`.
EAS increments the iOS build number automatically on every build — you never need to
edit `app.json` manually.  The marketing version (`version` in `app.json`) should be
bumped by hand when releasing a user-visible version change.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `This command requires you to be authenticated` | Run `eas login` and retry |
| `Credentials not found` | Re-run the one-time bootstrap step above |
| `Submit failed: missing appleId` | Fill in the three placeholders in `eas.json` submit block |
| Build stuck in queue | Check https://expo.dev/accounts/krazi/projects/thecastleroyale/builds |
