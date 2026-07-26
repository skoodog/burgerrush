/**
 * Local persistence.
 *
 * Versioned, validated and migration-aware. Corrupted storage is backed up and
 * reset rather than crashing the boot flow, and local play never depends on it
 * succeeding.
 */

import type { AccessibilitySettings } from '../config/gameplay';
import type { ChefIdentity, GenderPresentation } from '../config/identity';

export const SAVE_VERSION = 3;
const STORAGE_KEY = 'burger-rush.profile.v3';
const LEGACY_KEYS = ['burger-rush.profile.v2', 'burger-rush.profile.v1', 'burger-rush.profile'];

export interface LeaderboardEntry {
  readonly initials: string;
  readonly displayName?: string;
  readonly score: number;
  readonly round: number;
  readonly durationSeconds: number;
  readonly mode: string;
  readonly seed: string;
  readonly bossSeed: string;
  readonly bossClearSeconds: number;
  readonly leadIdentity: ChefIdentity;
  readonly leadPresentation: GenderPresentation;
  readonly coop: boolean;
  readonly version: string;
  readonly replayHash: string;
  readonly timestamp: number;
  readonly ranked: boolean;
  readonly practiceFlags: readonly string[];
}

export interface Profile {
  version: number;
  highScore: number;
  accessibility: Partial<AccessibilitySettings>;
  lastSelection: readonly { identity: ChefIdentity; presentation: GenderPresentation }[];
  leaderboard: LeaderboardEntry[];
  initials: string;
}

export function defaultProfile(): Profile {
  return {
    version: SAVE_VERSION,
    highScore: 0,
    accessibility: {},
    lastSelection: [
      { identity: 'pep', presentation: 'boy' },
      { identity: 'sal', presentation: 'girl' },
    ],
    leaderboard: [],
    initials: 'AAA',
  };
}

/** Strips anything that could be injected into the DOM later. */
export function sanitizeInitials(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3)
    .padEnd(3, 'A');
}

export function sanitizeDisplayName(input: string): string {
  return input
    .replace(/[<>&"'`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__br_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/** Maps a pre-Revision-3 `Chef P` / `Chef S` record onto sal/pep. */
function migrateLegacyIdentity(raw: unknown): { identity: ChefIdentity; presentation: GenderPresentation } {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (value.includes('sal') || value === 's' || value.includes('chef s')) {
    return { identity: 'sal', presentation: 'girl' };
  }
  return { identity: 'pep', presentation: 'boy' };
}

function coerceProfile(parsed: unknown): Profile {
  const base = defaultProfile();
  if (typeof parsed !== 'object' || parsed === null) return base;
  const raw = parsed as Record<string, unknown>;

  const profile: Profile = {
    ...base,
    version: SAVE_VERSION,
    highScore: typeof raw.highScore === 'number' && raw.highScore >= 0 ? Math.floor(raw.highScore) : 0,
    accessibility:
      typeof raw.accessibility === 'object' && raw.accessibility !== null
        ? (raw.accessibility as Partial<AccessibilitySettings>)
        : {},
    initials: sanitizeInitials(typeof raw.initials === 'string' ? raw.initials : 'AAA'),
    leaderboard: Array.isArray(raw.leaderboard)
      ? (raw.leaderboard as LeaderboardEntry[]).filter(
          (e) => typeof e?.score === 'number' && typeof e?.initials === 'string',
        )
      : [],
    lastSelection: base.lastSelection,
  };

  if (Array.isArray(raw.lastSelection)) {
    profile.lastSelection = (raw.lastSelection as unknown[]).map((entry) => {
      if (typeof entry === 'object' && entry !== null && 'identity' in entry) {
        const e = entry as { identity?: unknown; presentation?: unknown };
        const identity: ChefIdentity = e.identity === 'sal' ? 'sal' : 'pep';
        const presentation: GenderPresentation = e.presentation === 'girl' ? 'girl' : 'boy';
        return { identity, presentation };
      }
      return migrateLegacyIdentity(entry);
    });
  } else if (typeof raw.chef === 'string') {
    profile.lastSelection = [migrateLegacyIdentity(raw.chef)];
  }

  return profile;
}

export function loadProfile(): Profile {
  const store = storage();
  if (!store) return defaultProfile();
  const readKey = (key: string): Profile | null => {
    const text = store.getItem(key);
    if (!text) return null;
    try {
      return coerceProfile(JSON.parse(text));
    } catch {
      // Back the corrupt payload up rather than destroying it silently.
      try {
        store.setItem(`${key}.corrupt.${Date.now()}`, text);
        store.removeItem(key);
      } catch {
        /* storage full - nothing more we can safely do */
      }
      return null;
    }
  };

  const current = readKey(STORAGE_KEY);
  if (current) return current;
  for (const legacy of LEGACY_KEYS) {
    const migrated = readKey(legacy);
    if (migrated) {
      saveProfile(migrated);
      return migrated;
    }
  }
  return defaultProfile();
}

export function saveProfile(profile: Profile): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...profile, version: SAVE_VERSION }));
  } catch {
    /* quota exceeded - local play continues without persistence */
  }
}

/** Inserts an entry and keeps the local table capped and sorted. */
export function submitLocalScore(profile: Profile, entry: LeaderboardEntry, limit = 20): Profile {
  const safe: LeaderboardEntry = {
    ...entry,
    initials: sanitizeInitials(entry.initials),
    ...(entry.displayName !== undefined
      ? { displayName: sanitizeDisplayName(entry.displayName) }
      : {}),
  };
  const leaderboard = [...profile.leaderboard, safe]
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, limit);
  return { ...profile, leaderboard, highScore: Math.max(profile.highScore, safe.score) };
}
