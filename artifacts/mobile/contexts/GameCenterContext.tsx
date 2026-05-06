import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Game Center is only available in native iOS builds made with EAS.
 * Expo Go (appOwnership === 'expo') does NOT support custom native modules,
 * so Game Center auth is unavailable there even on a physical iPhone.
 */
const GC_AVAILABLE: boolean =
  Platform.OS === 'ios' && Constants.appOwnership !== 'expo';

export interface PlayerProfile {
  id: number;
  gameCenterId: string;
  displayName: string;
  coins: number;
  wins: number;
  losses: number;
  winStreak: number;
  elo: number;
  createdAt: string;
}

interface GameCenterContextType {
  /** True only when running as a native iOS EAS build — false on Android, web, or Expo Go. */
  isGameCenterAvailable: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  profile: PlayerProfile | null;
  signIn: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const GameCenterContext = createContext<GameCenterContextType | null>(null);

const API_BASE = (() => {
  const domain = process.env['EXPO_PUBLIC_DOMAIN'];
  return domain ? `https://${domain}/api` : 'http://localhost:8080/api';
})();

// ── Strict types for react-native-game-center ─────────────────────────────────
interface GCPlayer {
  playerId?: string;
  gamePlayerId?: string;
  teamPlayerId?: string;
  displayName?: string;
  alias?: string;
  error?: string;
}

interface GCVerificationResult {
  publicKeyUrl: string;
  /** Base64-encoded RSA-SHA256 signature over playerID+bundleID+salt+timestamp. */
  signature: string;
  /** Base64-encoded random salt. */
  salt: string;
  /** Milliseconds since Unix epoch. */
  timestamp: number;
}

interface GameCenterNativeModule {
  authenticate(): Promise<GCPlayer>;
  /** Available on iOS 14+ / react-native-game-center ≥ 1.0 */
  generateIdentityVerificationSignatureAsync?(): Promise<GCVerificationResult>;
  /** Some builds wrap exports under a `default` key */
  default?: GameCenterNativeModule;
}

function resolveGCModule(): GameCenterNativeModule | null {
  if (!GC_AVAILABLE) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require('react-native-game-center') as GameCenterNativeModule;
    return raw?.default ?? raw ?? null;
  } catch {
    return null;
  }
}

// ── Server calls ──────────────────────────────────────────────────────────────

interface SyncPayload {
  gameCenterId: string;
  displayName: string;
  publicKeyUrl: string;
  signature: string;
  salt: string;
  timestamp: number;
}

async function syncPlayerWithServer(payload: SyncPayload): Promise<PlayerProfile> {
  const res = await fetch(`${API_BASE}/players/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sync failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<PlayerProfile>;
}

async function fetchPlayerFromServer(gameCenterId: string): Promise<PlayerProfile | null> {
  const res = await fetch(
    `${API_BASE}/players/${encodeURIComponent(gameCenterId)}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fetch player failed: ${res.status}`);
  return res.json() as Promise<PlayerProfile>;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function GameCenterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  const signIn = useCallback(async () => {
    // Guard: only proceed on native iOS EAS builds.
    if (!GC_AVAILABLE) {
      console.info(
        '[GameCenter] Not available — running on Android, web, or Expo Go. Skipping authentication.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const gc = resolveGCModule();
      if (!gc) {
        console.warn('[GameCenter] Native module could not be loaded.');
        return;
      }

      const player = await gc.authenticate();
      if (player.error) {
        console.warn('[GameCenter] Authentication error:', player.error);
        return;
      }

      const gcId =
        player.teamPlayerId ??
        player.gamePlayerId ??
        player.playerId ??
        '';
      const gcName = player.displayName ?? player.alias ?? gcId;

      if (!gcId) {
        console.warn('[GameCenter] No player ID returned from authenticate().');
        return;
      }

      // Require a server-verifiable identity bundle — never trust raw IDs.
      if (typeof gc.generateIdentityVerificationSignatureAsync !== 'function') {
        console.warn(
          '[GameCenter] generateIdentityVerificationSignatureAsync unavailable; skipping sync.',
        );
        return;
      }

      const verification = await gc.generateIdentityVerificationSignatureAsync();

      const synced = await syncPlayerWithServer({
        gameCenterId: gcId,
        displayName: gcName,
        ...verification,
      });

      setProfile(synced);
      setIsAuthenticated(true);
    } catch (err) {
      console.warn('[GameCenter] Sign-in error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!profile) return;
    try {
      const updated = await fetchPlayerFromServer(profile.gameCenterId);
      if (updated) setProfile(updated);
    } catch (err) {
      console.warn('[GameCenter] Refresh profile error:', err);
    }
  }, [profile]);

  // Auto-authenticate when the native module is actually available.
  useEffect(() => {
    if (GC_AVAILABLE) {
      signIn();
    }
  }, []);

  return (
    <GameCenterContext.Provider
      value={{
        isGameCenterAvailable: GC_AVAILABLE,
        isAuthenticated,
        isLoading,
        profile,
        signIn,
        refreshProfile,
      }}
    >
      {children}
    </GameCenterContext.Provider>
  );
}

export function useGameCenter(): GameCenterContextType {
  const ctx = useContext(GameCenterContext);
  if (!ctx)
    throw new Error('useGameCenter must be used within GameCenterProvider');
  return ctx;
}
