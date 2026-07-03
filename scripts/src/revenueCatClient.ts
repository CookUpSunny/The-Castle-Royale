import { ReplitConnectors } from '@replit/connectors-sdk';
import { createClient, type Client } from '@replit/revenuecat-sdk/client';

/**
 * Creates an authenticated RevenueCat API client via the Replit RevenueCat
 * connector. Do NOT cache the returned client across long-lived processes —
 * always call this fresh so token refresh/retry logic (built into
 * ReplitConnectors.createProxyFetch) stays in effect.
 */
export async function getUncachableRevenueCatClient(): Promise<Client> {
  const connectors = new ReplitConnectors();

  return createClient({
    baseUrl: 'https://api.revenuecat.com/v2',
    fetch: connectors.createProxyFetch('revenuecat'),
  });
}
