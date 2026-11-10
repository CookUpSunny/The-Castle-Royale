/**
 * Character ids the client can seat. Keep this set aligned with
 * `artifacts/mobile/lib/avatarPortrait.ts`. Unknown values are dropped so an
 * old client (no field) and a bad payload both fall back on the board.
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

export function sanitizeAvatarId(value: unknown): AvatarId | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 32) return undefined;
  return AVATAR_ID_SET.has(trimmed) ? (trimmed as AvatarId) : undefined;
}

/**
 * Seat payload wins. When it omits a valid id, the last sanitized preference
 * (from register or an earlier join) is used. Nothing here writes the other
 * player's character.
 */
export function resolveSeatAvatar(
  preference: AvatarId | undefined,
  raw: unknown,
): { preference: AvatarId | undefined; seated?: AvatarId } {
  const fromPayload = sanitizeAvatarId(raw);
  if (fromPayload) return { preference: fromPayload, seated: fromPayload };
  return { preference, seated: preference };
}

/**
 * Stamp each seat onto that player's own record once. A later call cannot
 * replace a character already seated, and a seat id never writes a different
 * player's record.
 */
export function applyPlayerAvatars(
  players: Record<string, { avatarId?: AvatarId } | undefined>,
  seats: ReadonlyArray<{ playerId: string; avatarId?: unknown }>,
): void {
  for (const seat of seats) {
    const avatarId = sanitizeAvatarId(seat.avatarId);
    if (!avatarId) continue;
    const player = players[seat.playerId];
    if (!player || player.avatarId) continue;
    player.avatarId = avatarId;
  }
}
