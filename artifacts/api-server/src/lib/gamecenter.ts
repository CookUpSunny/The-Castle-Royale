import { createVerify, createSign, createPublicKey } from 'node:crypto';
import { logger } from './logger.js';

// ── Apple CDN public-key cache ────────────────────────────────────────────────
// Apple signs the verification payloads with a per-device key. The public key
// is fetched once from the publicKeyUrl returned by iOS, then cached briefly.
interface CachedKey { der: Buffer; expiresAt: number }
const keyCache = new Map<string, CachedKey>();

async function fetchApplePublicKey(url: string): Promise<Buffer> {
  const cached = keyCache.get(url);
  if (cached && Date.now() < cached.expiresAt) return cached.der;

  // Never fetch from non-Apple CDN — prevents redirect/SSRF attacks.
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.apple.com')) {
    throw new Error(`Untrusted publicKeyUrl: ${url}`);
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`GC public key fetch failed: ${res.status}`);
  const der = Buffer.from(await res.arrayBuffer());
  keyCache.set(url, { der, expiresAt: Date.now() + 10 * 60 * 1000 });
  return der;
}

// ── Game Center identity verification ────────────────────────────────────────
// Implements Apple's recommended server-side identity verification:
// https://developer.apple.com/documentation/gamekit/gklocalplayer/1515407-generateidentityverificationsign
//
// Data signed by iOS = playerID (UTF-8) + bundleID (UTF-8) + salt (raw) + timestamp (big-endian uint64)
// Signature algorithm: RSA-SHA256 with the Apple-hosted public key.

export interface GCVerificationBundle {
  playerId: string;
  publicKeyUrl: string;
  signature: string;  // base64-encoded RSA-SHA256 signature
  salt: string;       // base64-encoded random bytes
  timestamp: number;  // ms since Unix epoch as returned by iOS
}

/** Maximum age of an accepted verification bundle (replay protection). */
const MAX_BUNDLE_AGE_MS = 5 * 60 * 1000; // 5 minutes
/** Maximum allowed clock-skew into the future. */
const MAX_FUTURE_SKEW_MS = 60 * 1000; // 1 minute

export async function verifyGameCenterIdentity(
  bundle: GCVerificationBundle,
  bundleId: string,
): Promise<boolean> {
  try {
    // Reject stale or future-dated bundles before touching the network.
    // This prevents replay of a legitimately captured verification bundle.
    const now = Date.now();
    if (
      bundle.timestamp < now - MAX_BUNDLE_AGE_MS ||
      bundle.timestamp > now + MAX_FUTURE_SKEW_MS
    ) {
      logger.warn(
        { playerId: bundle.playerId, timestamp: bundle.timestamp, now, diff: now - bundle.timestamp },
        'GC verification rejected: timestamp outside freshness window',
      );
      return false;
    }

    const keyDer = await fetchApplePublicKey(bundle.publicKeyUrl);

    const playerIdBuf = Buffer.from(bundle.playerId, 'utf8');
    const bundleIdBuf = Buffer.from(bundleId, 'utf8');
    const saltBuf = Buffer.from(bundle.salt, 'base64');

    // timestamp as big-endian 64-bit integer
    const tsBuf = Buffer.allocUnsafe(8);
    tsBuf.writeBigUInt64BE(BigInt(bundle.timestamp));

    const data = Buffer.concat([playerIdBuf, bundleIdBuf, saltBuf, tsBuf]);
    const sig = Buffer.from(bundle.signature, 'base64');

    const pubKey = createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
    const verifier = createVerify('SHA256');
    verifier.update(data);
    return verifier.verify(pubKey, sig);
  } catch (err) {
    logger.warn({ err, playerId: bundle.playerId }, 'GC identity verification error');
    return false;
  }
}

// ── App Store Connect API JWT ─────────────────────────────────────────────────
// Used for server-to-server Game Center leaderboard submission.
// Key material is read from environment variables:
//   GC_KEY_ID       — App Store Connect API key ID
//   GC_TEAM_ID      — Apple Developer Team ID
//   GC_PRIVATE_KEY  — PEM-encoded EC private key (P-256); newlines may be \\n
//   GC_LEADERBOARD_ID — Game Center leaderboard identifier

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createAscJWT(keyId: string, teamId: string, privateKeyPem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const hdr = base64url(Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })));
  const pld = base64url(
    Buffer.from(
      JSON.stringify({ iss: teamId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' }),
    ),
  );
  const input = `${hdr}.${pld}`;
  const signer = createSign('SHA256');
  signer.update(input);
  // ES256 requires IEEE P1363 format (raw r||s bytes), not DER.
  const sig = signer.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${input}.${base64url(sig)}`;
}

/** Submit the winner's ELO score to the Game Center leaderboard. Silently
 *  skips when the four required env vars are absent so dev environments without
 *  App Store Connect credentials don't break. */
export async function submitLeaderboardScore(playerRef: string, score: number): Promise<void> {
  const keyId = process.env['GC_KEY_ID'];
  const teamId = process.env['GC_TEAM_ID'];
  const rawKey = process.env['GC_PRIVATE_KEY'];
  const leaderboardId = process.env['GC_LEADERBOARD_ID'];

  if (!keyId || !teamId || !rawKey || !leaderboardId) {
    logger.info(
      { playerRef, score },
      'GC leaderboard credentials not configured — skipping score submission',
    );
    return;
  }

  const privateKeyPem = rawKey.replace(/\\n/g, '\n');

  try {
    const jwt = createAscJWT(keyId, teamId, privateKeyPem);
    const res = await fetch(
      'https://api.appstoreconnect.apple.com/v1/gameCenterLeaderboardScores',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            type: 'gameCenterLeaderboardScores',
            attributes: { score, gameCenterPlayerReference: playerRef },
            relationships: {
              gameCenterLeaderboard: {
                data: { type: 'gameCenterLeaderboards', id: leaderboardId },
              },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      logger.warn({ status: res.status, body, playerRef }, 'GC leaderboard submission failed');
    } else {
      logger.info({ playerRef, score }, 'GC leaderboard score submitted');
    }
  } catch (err) {
    logger.warn({ err, playerRef }, 'GC leaderboard submission error');
  }
}
