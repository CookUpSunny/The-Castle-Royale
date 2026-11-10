/**
 * Character ids shared by the loadout screen, the match boards, and the
 * seat payload. The api-server allow-list in `src/lib/avatarId.ts` must
 * stay the same set. Portrait files stay in CosmeticsContext.
 */
export const AVATAR_IDS = [
  'tau-ceti',
  'lioness',
  'bull',
  'oracle',
  'jackal',
  'fenix',
  'eagles',
  'frog',
  'troll',
  'gigi',
  'rockner',
  'sunami',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

const AVATAR_ID_SET = new Set<string>(AVATAR_IDS);

/** Same name hash the boards used before avatars were seated. */
export function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Accept only a known character id. Anything else is treated as omitted. */
export function sanitizeAvatarId(value: unknown): AvatarId | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 32) return undefined;
  return AVATAR_ID_SET.has(trimmed) ? (trimmed as AvatarId) : undefined;
}

/**
 * Opponent character for both portrait and landscape.
 * A known seated id wins. Missing or invalid ids (older servers, bots,
 * old clients) keep the previous stable hash so both layouts still agree.
 */
export function resolveOpponentAvatarId(
  opponentAvatarId: string | null | undefined,
  opponentName: string,
): AvatarId {
  const seated = sanitizeAvatarId(opponentAvatarId);
  if (seated) return seated;
  return AVATAR_IDS[hashName(opponentName) % AVATAR_IDS.length]!;
}

/**
 * Local character is the player's own equipped id. The opponent field is
 * only the other seat, so a remote view cannot replace the local character.
 */
export function matchPortraits(
  localAvatarId: AvatarId,
  opponentAvatarId: string | null | undefined,
  opponentName: string,
): { localAvatarId: AvatarId; opponentAvatarId: AvatarId } {
  return {
    localAvatarId,
    opponentAvatarId: resolveOpponentAvatarId(opponentAvatarId, opponentName),
  };
}
