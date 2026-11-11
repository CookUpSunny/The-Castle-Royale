/**
 * Personalized ads are allowed only after the player grants App Tracking
 * Transparency. A decline, a restriction, or a missing answer stays
 * non-personalized.
 */
export function personalizedAdsAllowed(status: string | null | undefined): boolean {
  return status === 'granted';
}
