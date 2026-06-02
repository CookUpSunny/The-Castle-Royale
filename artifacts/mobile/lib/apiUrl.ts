import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8080;

/** Extract the LAN IP from Expo's dev-server hostUri (e.g. "192.168.1.4:8081"). */
function hostFromExpoDev(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    null;
  if (!hostUri) return null;

  const host = hostUri.split('/')[0]?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

/**
 * Base URL for the API + Socket.io server (no trailing slash, no /api suffix).
 *
 * Priority:
 * 1. EXPO_PUBLIC_API_URL (set by dev:lan script or .env.local)
 * 2. EXPO_PUBLIC_DOMAIN (Replit remote)
 * 3. Dev: LAN IP from Expo hostUri (physical device on same Wi‑Fi)
 * 4. Dev: Android emulator → 10.0.2.2
 * 5. localhost (iOS simulator / web on same machine)
 */
export function resolveApiBaseUrl(): string {
  const apiUrl = process.env['EXPO_PUBLIC_API_URL'];
  if (apiUrl) return apiUrl.replace(/\/$/, '');

  const domain = process.env['EXPO_PUBLIC_DOMAIN'];
  if (domain) return `https://${domain.replace(/\/$/, '')}`;

  if (__DEV__) {
    const lanHost = hostFromExpoDev();
    if (lanHost) return `http://${lanHost}:${API_PORT}`;

    if (Platform.OS === 'android' && Constants.isDevice === false) {
      return `http://10.0.2.2:${API_PORT}`;
    }
  }

  return `http://localhost:${API_PORT}`;
}

export function resolveRestApiUrl(): string {
  return `${resolveApiBaseUrl()}/api`;
}
