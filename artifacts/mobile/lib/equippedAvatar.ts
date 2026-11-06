import { type AvatarId } from './avatarPortrait';

/**
 * Latest equipped character, updated synchronously from setAvatar and from
 * hydration. Socket seat emits read this so a confirm in the same turn sends
 * the character just chosen, not the avatar from the previous render.
 */
let equippedAvatarId: AvatarId = 'eagles';

export function noteEquippedAvatar(id: AvatarId): void {
  equippedAvatarId = id;
}

export function currentEquippedAvatar(): AvatarId {
  return equippedAvatarId;
}
